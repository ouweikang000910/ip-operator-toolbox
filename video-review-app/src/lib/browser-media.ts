import { parseOcr } from "./ocr";
export type BrowserMedia = {
  duration: number;
  width: number;
  height: number;
  fps: null;
  frames: { time: number; data: string }[];
  cover: string | null;
};
function event(target: HTMLVideoElement, name: string, action?: () => void) {
  return new Promise<void>((resolve, reject) => {
    const done = () => {
      cleanup();
      resolve();
    };
    const error = () => {
      cleanup();
      reject(
        new Error("浏览器无法解码此视频，请导出为 H.264 / AAC 的 MP4 后重试"),
      );
    };
    const timeout = setTimeout(error, 25000);
    function cleanup() {
      clearTimeout(timeout);
      target.removeEventListener(name, done);
      target.removeEventListener("error", error);
    }
    target.addEventListener(name, done, { once: true });
    target.addEventListener("error", error, { once: true });
    action?.();
  });
}
export async function extractBrowserMedia(
  file: File,
  cover: File | null,
  progress: (s: string) => void,
): Promise<BrowserMedia> {
  const url = URL.createObjectURL(file);
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  try {
    progress("读取视频信息…");
    await event(v, "loadedmetadata", () => {
      v.src = url;
      v.load();
    });
    if (!Number.isFinite(v.duration) || v.duration <= 0 || v.duration > 1200)
      throw new Error("视频时长需大于 0 且不超过 20 分钟");
    const width = v.videoWidth,
      height = v.videoHeight;
    if (!width || !height) throw new Error("无法读取视频分辨率");
    const canvas = document.createElement("canvas");
    const scale = Math.min(768 / width, 768 / height, 1);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d")!;
    const times = [
      ...new Set(
        [
          0.05,
          Math.min(1, v.duration * 0.15),
          Math.min(3, v.duration * 0.3),
          ...Array.from({ length: 5 }, (_, i) => (v.duration * (i + 1)) / 6),
        ].map((t) => Math.max(0, Math.min(t, v.duration - 0.05))),
      ),
    ].sort((a, b) => a - b);
    const frames = [];
    for (const [i, t] of times.entries()) {
      progress(`在浏览器提取关键帧 ${i + 1}/${times.length}…`);
      if (Math.abs(v.currentTime - t) > 0.0001)
        await event(v, "seeked", () => {
          v.currentTime = t;
        });
      else if (v.readyState < 2) await event(v, "loadeddata");
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      frames.push({
        time: Math.round(t * 100) / 100,
        data: canvas.toDataURL("image/jpeg", 0.8),
      });
    }
    let image: string | null = null;
    if (cover) {
      if (cover.size > 10 * 1024 * 1024) throw new Error("封面不得超过 10 MB");
      const bitmap = await createImageBitmap(cover);
      const s = Math.min(768 / bitmap.width, 768 / bitmap.height, 1);
      canvas.width = Math.round(bitmap.width * s);
      canvas.height = Math.round(bitmap.height * s);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      image = canvas.toDataURL("image/jpeg", 0.85);
      bitmap.close();
    }
    return {
      duration: v.duration,
      width,
      height,
      fps: null,
      frames,
      cover: image,
    };
  } finally {
    v.removeAttribute("src");
    v.load();
    URL.revokeObjectURL(url);
  }
}
type OcrWorker = {
  recognize: (f: File) => Promise<{ data: { text: string } }>;
  terminate: () => Promise<void>;
};
declare global {
  interface Window {
    Tesseract?: {
      createWorker: (
        langs: string[],
        oem: number,
        options: unknown,
      ) => Promise<OcrWorker>;
    };
  }
}
let ocrLibrary: Promise<void> | undefined;
export async function browserOcr(file: File) {
  if (file.size > 10 * 1024 * 1024) throw new Error("截图不得超过 10 MB");
  if (!ocrLibrary)
    ocrLibrary = new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = new URL("ocr/tesseract.min.js", document.baseURI).href;
      s.onload = () => resolve();
      s.onerror = () => {
        ocrLibrary = undefined;
        reject(new Error("OCR 组件加载失败，请刷新重试"));
      };
      document.head.appendChild(s);
    });
  await ocrLibrary;
  let worker: OcrWorker | undefined;
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        worker = await window.Tesseract!.createWorker(["chi_sim", "eng"], 1, {
          workerPath: new URL("ocr/worker.min.js", document.baseURI).href,
          corePath: new URL("ocr/core", document.baseURI).href,
          langPath: new URL("ocr/lang", document.baseURI).href,
          workerBlobURL: false,
        });
        if (expired) {
          await worker.terminate();
          throw new Error("OCR 已取消");
        }
        const r = await worker.recognize(file);
        return { text: r.data.text, candidates: parseOcr(r.data.text) };
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          expired = true;
          reject(new Error("OCR 超过 120 秒，请使用更清晰截图或手动输入"));
        }, 120000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    await worker?.terminate();
  }
}
