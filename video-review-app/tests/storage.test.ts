import "fake-indexeddb/auto";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  saveImported,
  getVideo,
  getMedia,
  allVideos,
  updateVideo,
  assetKey,
} from "../src/lib/local-store";
import { browserApi } from "../src/lib/browser-api";
import { getAIConfig, setAIConfig } from "../src/lib/ai-config";
import type { Video } from "../src/lib/types";
const v: Video = {
  id: "browser-storage-test",
  title: "真实存储测试",
  account: "测试",
  category: "知识",
  platform: "抖音",
  publishedAt: "2026-01-01T00:00:00Z",
  capturedAt: "2026-01-02T00:00:00Z",
  windowHours: 24,
  transcript: "",
  metrics: { plays: 1000, likes: 50, comments: 0 },
  status: "draft",
  stage: "等待分析",
  progress: 0,
  error: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  duration: 6,
  width: 360,
  height: 640,
  fps: null,
  videoFile: "source.mp4",
  coverFile: null,
  frames: [{ file: "frame-0.jpg", time: 1 }],
  report: null,
  warnings: [],
};
test("浏览器事务保存、报告、编辑、并发保护与媒体删除", async () => {
  const blob = new Blob(["real binary sample"], { type: "video/mp4" });
  await saveImported(v, [
    {
      key: assetKey(v.id, v.videoFile),
      videoId: v.id,
      file: v.videoFile,
      blob,
    },
  ]);
  assert.equal((await getVideo(v.id))?.title, v.title);
  assert.equal((await getMedia(v.id, v.videoFile))?.size, blob.size);
  assert.equal((await allVideos()).length, 1);
  const report = await browserApi<Video>(`/api/videos/${v.id}/analyze`, {
    method: "POST",
  });
  assert.equal(report.status, "complete");
  assert.equal(report.report?.ai, null);
  assert.equal(
    report.report?.metrics.find((m) => m.key === "likesRate")?.value,
    5,
  );
  const edited = await browserApi<Video>(`/api/videos/${v.id}`, {
    method: "PATCH",
    body: JSON.stringify({ ...v, metrics: { plays: 1000, likes: 60 } }),
  });
  assert.equal(edited.report, null);
  assert.equal(edited.status, "draft");
  await assert.rejects(
    browserApi(`/api/videos/${v.id}`, {
      method: "PATCH",
      body: JSON.stringify({ ...v, metrics: { plays: -1 } }),
    }),
  );
  assert.equal((await getVideo(v.id))?.metrics.likes, 60);
  const claim = () =>
    updateVideo(v.id, (current) => {
      if (current.status === "processing") throw new Error("busy");
      return { ...current, status: "processing" };
    });
  const claimed = await Promise.allSettled([claim(), claim()]);
  assert.equal(claimed.filter((x) => x.status === "fulfilled").length, 1);
  await assert.rejects(browserApi(`/api/videos/${v.id}`, { method: "DELETE" }));
  await assert.rejects(
    browserApi(`/api/videos/${v.id}`, {
      method: "PATCH",
      body: JSON.stringify(v),
    }),
  );
  await updateVideo(v.id, (current) => ({ ...current, status: "draft" }));
  await browserApi(`/api/videos/${v.id}`, { method: "DELETE" });
  assert.equal(await getVideo(v.id), null);
  assert.equal(await getMedia(v.id, v.videoFile), null);
});
test("媒体写入失败时整笔导入回滚，不留下空视频记录", async () => {
  await assert.rejects(
    saveImported({ ...v, id: "rollback-test" }, [
      {
        key: "rollback-test/source.mp4",
        videoId: "rollback-test",
        file: "source.mp4",
        blob: (() => {}) as unknown as Blob,
      },
    ]),
  );
  assert.equal(await getVideo("rollback-test"), null);
});
test("AI 配置默认关闭且拒绝非 HTTPS、嵌入凭据、查询与片段", () => {
  assert.equal(getAIConfig().AI_API_KEY, "");
  for (const base of [
    "http://example.com/v1",
    "https://a:b@example.com/v1",
    "https://example.com/v1?key=x",
    "https://example.com/v1#key",
  ])
    assert.throws(() =>
      setAIConfig({
        AI_ENABLED: "true",
        AI_BASE_URL: base,
        AI_MODEL: "test",
        AI_API_KEY: "test-placeholder",
      }),
    );
  setAIConfig({
    AI_ENABLED: "true",
    AI_BASE_URL: "https://example.com/v1/",
    AI_MODEL: "test",
    AI_API_KEY: "test-placeholder",
  });
  assert.equal(getAIConfig().AI_BASE_URL, "https://example.com/v1");
  setAIConfig({ ...getAIConfig(), AI_API_KEY: "" });
  assert.equal(getAIConfig().AI_ENABLED, "false");
});
