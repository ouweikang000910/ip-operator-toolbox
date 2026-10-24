import {
  allVideos,
  getVideo,
  saveImported,
  updateVideo,
  assetKey,
  type Asset,
} from "./local-store";
import { videoInputSchema } from "./validation";
import { aiConfigured, makeReport } from "./browser-ai";
import { getAIConfig } from "./ai-config";
import { extractBrowserMedia } from "./browser-media";
import { derive, performance } from "./metrics";
import type { Video } from "./types";
export async function localImport(
  file: File,
  cover: File | null,
  metadata: unknown,
  progress: (s: string, pct?: number) => void,
) {
  if (
    !/\.(mp4|mov)$/i.test(file.name) ||
    file.size < 16 ||
    file.size > 200 * 1024 * 1024
  )
    throw new Error("请选择 200 MB 以内的 MP4 / MOV 视频");
  const data = videoInputSchema.parse(metadata);
  if ((await allVideos()).length >= 1000)
    throw new Error("本浏览器最多保存 1000 条记录");
  const media = await extractBrowserMedia(file, cover, (s) => progress(s));
  const estimate = await navigator.storage?.estimate?.();
  if (
    estimate?.quota &&
    estimate.usage != null &&
    estimate.quota - estimate.usage < file.size * 1.1
  )
    throw new Error("浏览器可用空间不足，请先清理旧视频");
  const id = crypto.randomUUID(),
    now = new Date().toISOString();
  const videoFile = "source." + file.name.split(".").pop()!.toLowerCase();
  const assets: Asset[] = [
    { key: assetKey(id, videoFile), videoId: id, file: videoFile, blob: file },
  ];
  const frames = [];
  for (const [i, f] of media.frames.entries()) {
    const name = `frame-${i}.jpg`;
    const blob = await (await fetch(f.data)).blob();
    assets.push({ key: assetKey(id, name), videoId: id, file: name, blob });
    frames.push({ file: name, time: f.time });
  }
  const coverFile = media.cover ? "cover.jpg" : null;
  if (media.cover)
    assets.push({
      key: assetKey(id, "cover.jpg"),
      videoId: id,
      file: "cover.jpg",
      blob: await (await fetch(media.cover)).blob(),
    });
  const v: Video = {
    ...data,
    id,
    status: "draft",
    stage: "关键帧已就绪，等待复盘",
    progress: 0,
    error: null,
    createdAt: now,
    updatedAt: now,
    duration: media.duration,
    width: media.width,
    height: media.height,
    fps: null,
    videoFile,
    coverFile,
    frames,
    report: null,
    warnings: [
      "浏览器原片采样；帧率未知，稀疏关键帧不能证明连续剪辑或声音效果。",
    ],
  };
  progress("保存到你的浏览器…", 95);
  const result = await saveImported(v, assets);
  progress("已保存", 100);
  return result;
}
export async function browserApi<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const p = url.split("/").filter(Boolean).slice(1);
  const method = options?.method ?? "GET";
  let result: unknown;
  if (p[0] === "settings") {
    const c = getAIConfig();
    result = {
      aiEnabled: aiConfigured(c),
      model: c.AI_MODEL,
      baseUrl: c.AI_BASE_URL,
      hasKey: !!c.AI_API_KEY,
      transcription: false,
      dataDir: "当前浏览器 · IndexedDB",
      maxVideoMB: 200,
      maxFrames: 8,
      workerOnline: true,
      displayName: "当前浏览器",
    };
  } else if (p[0] === "videos" && !p[1]) {
    const list = await allVideos();
    for (const v of list) {
      if (
        v.status === "processing" &&
        Date.now() - Date.parse(v.updatedAt) > 120000
      ) {
        await updateVideo(v.id, (current) =>
          current.status === "processing" &&
          Date.now() - Date.parse(current.updatedAt) > 120000
            ? {
                ...current,
                status: "failed",
                error: "上次分析中断，资料已保存，请重试",
                stage: "分析中断",
                updatedAt: new Date().toISOString(),
              }
            : current,
        );
      }
    }
    result = await allVideos();
  } else if (p[0] === "videos" && p[1]) {
    const id = p[1];
    if (p[2] === "analyze" && method === "POST") {
      const claimed = await updateVideo(id, (v) => {
        if (v.status === "processing")
          throw new Error("该视频正在分析，请稍后再试");
        return {
          ...v,
          status: "processing",
          progress: 60,
          stage: aiConfigured(getAIConfig())
            ? "AI 关键帧分析与报告生成"
            : "计算指标并生成数据报告",
          report: null,
          error: null,
          updatedAt: new Date().toISOString(),
        };
      });
      try {
        const report = await makeReport(claimed!, await allVideos());
        result = await updateVideo(id, (v) => ({
          ...v,
          report,
          status: "complete",
          stage: "复盘完成",
          progress: 100,
          updatedAt: new Date().toISOString(),
        }));
      } catch (e) {
        await updateVideo(id, (v) => ({
          ...v,
          status: "failed",
          stage: "分析失败",
          error: (e as Error).message,
          updatedAt: new Date().toISOString(),
        }));
        throw e;
      }
    } else if (method === "PATCH") {
      const data = videoInputSchema.parse(JSON.parse(String(options?.body)));
      result = await updateVideo(id, (v) => {
        if (v.status === "processing")
          throw new Error("分析进行中，请稍后编辑");
        return {
          ...v,
          ...data,
          status: "draft",
          stage: "资料已更新，请重新复盘",
          report: null,
          error: null,
          progress: 0,
          updatedAt: new Date().toISOString(),
        };
      });
    } else if (method === "DELETE") {
      await updateVideo(id, (v) => {
        if (v.status === "processing")
          throw new Error("分析进行中，请稍后删除");
        return null;
      });
      result = { ok: true };
    } else {
      const v = await getVideo(id);
      if (!v) throw new Error("视频记录不存在");
      result = {
        ...v,
        currentMetrics: derive(v.metrics),
        currentPerformance: performance(v, await allVideos()),
      };
    }
  } else throw new Error("不支持的操作");
  return result as T;
}
