import type { Video } from "./types";
let opened: Promise<IDBDatabase> | undefined;
export function database() {
  if (!opened)
    opened = new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("video-review-public-v1", 1);
      r.onupgradeneeded = () => {
        r.result.createObjectStore("videos", { keyPath: "id" });
        r.result
          .createObjectStore("assets", { keyPath: "key" })
          .createIndex("video", "videoId");
      };
      r.onsuccess = () => {
        r.result.onversionchange = () => {
          r.result.close();
          opened = undefined;
        };
        resolve(r.result);
      };
      r.onerror = () => {
        opened = undefined;
        reject(new Error("浏览器存储不可用，请检查隐私设置或更换浏览器"));
      };
      r.onblocked = () => reject(new Error("请关闭其他复盘页面后重试"));
    });
  return opened;
}
export type Asset = { key: string; videoId: string; file: string; blob: Blob };
export const assetKey = (id: string, file: string) => id + "/" + file;
export async function getMedia(id: string, file: string): Promise<Blob | null> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const r = db
      .transaction("assets")
      .objectStore("assets")
      .get(assetKey(id, file));
    r.onsuccess = () => resolve(r.result?.blob ?? null);
    r.onerror = () => reject(r.error);
  });
}
export async function allVideos(): Promise<Video[]> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const r = db.transaction("videos").objectStore("videos").getAll();
    r.onsuccess = () =>
      resolve(
        (r.result as Video[]).sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        ),
      );
    r.onerror = () => reject(r.error);
  });
}
export async function getVideo(id: string): Promise<Video | null> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const r = db.transaction("videos").objectStore("videos").get(id);
    r.onsuccess = () => resolve(r.result ?? null);
    r.onerror = () => reject(r.error);
  });
}
function storedError(e: DOMException | null) {
  return new Error(
    e?.name === "QuotaExceededError"
      ? "浏览器存储空间不足，请导出需要的报告后删除旧视频，或使用空间更大的浏览器"
      : "保存失败，请检查浏览器存储权限后重试",
  );
}
export async function saveImported(video: Video, assets: Asset[] = []) {
  const db = await database();
  return new Promise<Video>((resolve, reject) => {
    const tx = db.transaction(["videos", "assets"], "readwrite");
    try {
      tx.objectStore("videos").put(video);
      for (const a of assets) tx.objectStore("assets").put(a);
    } catch {
      tx.abort();
    }
    tx.oncomplete = () => resolve(video);
    tx.onerror = () => reject(storedError(tx.error));
    tx.onabort = () => reject(storedError(tx.error));
  });
}
// Claim/edit/delete in the same transaction as the status check, including across tabs.
export async function updateVideo(
  id: string,
  edit: (v: Video) => Video | null,
): Promise<Video | null> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["videos", "assets"], "readwrite");
    let result: Video | null = null;
    let failure: unknown;
    const r = tx.objectStore("videos").get(id);
    r.onsuccess = () => {
      try {
        if (!r.result) throw new Error("视频记录不存在");
        result = edit(r.result);
        if (result) tx.objectStore("videos").put(result);
        else {
          tx.objectStore("videos").delete(id);
          const cursor = tx
            .objectStore("assets")
            .index("video")
            .openKeyCursor(IDBKeyRange.only(id));
          cursor.onsuccess = () => {
            if (cursor.result) {
              tx.objectStore("assets").delete(cursor.result.primaryKey);
              cursor.result.continue();
            }
          };
        }
      } catch (e) {
        failure = e;
        tx.abort();
      }
    };
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(failure ?? storedError(tx.error));
    tx.onabort = () => reject(failure ?? storedError(tx.error));
  });
}
export async function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("读取媒体失败"));
    r.readAsDataURL(blob);
  });
}
