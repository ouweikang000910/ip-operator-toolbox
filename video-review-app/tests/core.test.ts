import { test } from "node:test";
import assert from "node:assert/strict";
import { derive, performance, median, peersFor } from "../src/lib/metrics";
import { videoInputSchema, validateAi } from "../src/lib/validation";
import { parseOcr } from "../src/lib/ocr";
import { buildEvidence } from "../src/lib/evidence";
import type { Video, Evidence } from "../src/lib/types";
function video(n = 0, extra: Partial<Video> = {}): Video {
  return {
    id: String(n),
    title: "实拍整理桌面",
    account: "测试账号",
    category: "生活",
    platform: "抖音",
    publishedAt: new Date(2025, 0, n + 1).toISOString(),
    capturedAt: new Date(2025, 1, 1).toISOString(),
    windowHours: 24,
    metrics: {
      plays: 100,
      likes: 10,
      completion: 50,
      retention5: 60,
      saves: 3,
      followers: 2,
    },
    transcript: "先给你看整理后的桌面。",
    status: "complete",
    stage: "完成",
    progress: 100,
    error: null,
    createdAt: "",
    updatedAt: "",
    duration: 10,
    width: 1080,
    height: 1920,
    fps: 30,
    videoFile: "source.mp4",
    coverFile: null,
    frames: [],
    report: null,
    warnings: [],
    ...extra,
  };
}
const evidence: Evidence[] = [
  { id: "frame_0", type: "frame", time: 0, text: "真实采样帧" },
  { id: "text_0", type: "transcript", text: "先给你看整理后的桌面。" },
];
function ai() {
  return {
    summary: "基于采样帧和字幕的参考分析",
    confidence: "低",
    content_scores: [
      "开头钩子",
      "内容结构",
      "节奏控制",
      "视听表达",
      "文案表达",
    ].map((d) => ({
      dimension: d,
      score: 12,
      reason: "证据支持基础呈现",
      evidence_ids: ["frame_0", "text_0"],
      improvement: "测试开头前置结果",
    })),
    findings: Array.from({ length: 3 }, () => ({
      title: "开头结果表达",
      priority: "中",
      kind: "待验证假设",
      explanation: "可尝试前置结果",
      evidence_ids: ["frame_0"],
      action: "先展示整理后的桌面",
      time: 0,
    })),
    improvement_actions: Array.from({ length: 3 }, () => ({
      text: "测试结果先行",
      evidence_ids: ["text_0"],
    })),
    suggested_hooks: Array.from({ length: 3 }, () => ({
      text: "先看整理后的桌面",
      evidence_ids: ["text_0"],
    })),
    suggested_titles: Array.from({ length: 5 }, () => ({
      text: "我的桌面整理过程",
      evidence_ids: ["text_0"],
    })),
    rewritten_script: "先看整理后的桌面，再看整理过程。",
    next_video_plan: {
      topic: "桌面整理",
      test: "只改变开头",
      observe: ["完播率"],
    },
    features: { hook: "结果先行", structure: "过程说明", title_style: "实用" },
  };
}
test("互动比率来自实际分母，0 分子有效", () => {
  const m = derive({ plays: 200, likes: 10, comments: 0 });
  assert.equal(m.find((x) => x.key === "likesRate")?.value, 5);
  assert.equal(m.find((x) => x.key === "commentsRate")?.value, 0);
});
test("零分母和缺失值不伪造为 0%", () => {
  for (const m of [{ plays: 0, likes: 4 }, { likes: 4 }, { plays: 100 }])
    assert.equal(derive(m).find((x) => x.key === "likesRate")?.value, null);
});
test("指标校验拒绝负数、无穷、超范围百分比和小数计数", () => {
  for (const m of [
    { plays: -1 },
    { completion: 101 },
    { plays: 1.1 },
    { likes: Infinity },
  ])
    assert.equal(
      videoInputSchema.safeParse({ ...video(), metrics: m }).success,
      false,
    );
});
test("保留真实 0 和空缺", () => {
  const r = videoInputSchema.parse({
    ...video(),
    metrics: { plays: 0, completion: null },
  });
  assert.equal(r.metrics.plays, 0);
  assert.equal(r.metrics.completion, null);
});
test("样本不足不计算运营评分", () => {
  assert.equal(performance(video(8), [video(1), video(2)]).score, null);
});
test("基准严格隔离账号、分类、平台、窗口及未来数据", () => {
  const v = video(10);
  const mismatches = [
    video(1, { account: "其他" }),
    video(2, { category: "其他" }),
    video(3, { platform: "快手" }),
    video(4, { windowHours: 168 }),
    video(11),
  ];
  assert.equal(peersFor(v, mismatches).length, 0);
});
test("历史百分位并列值为50分，至少3项有足够样本", () => {
  const history = Array.from({ length: 5 }, (_, i) => video(i));
  assert.equal(performance(video(8), history).score, 50);
  const only = history.map((v) => ({ ...v, metrics: { completion: 50 } }));
  assert.equal(performance(video(8), only).score, null);
});
test("中位数对偶数和奇数有效且不修改输入", () => {
  const a = [4, 1, 3, 2];
  assert.equal(median(a), 2.5);
  assert.deepEqual(a, [4, 1, 3, 2]);
  assert.equal(median([3, 9, 1]), 3);
});
test("OCR 只提取明确数字，未识别为空；百分比要求百分号", () => {
  const m = parseOcr(
    "播放量 1.2万\n点赞 234\n完播率 45.6%\n3秒留存率 0.8\n评论 无",
  );
  assert.equal(m.plays, 12000);
  assert.equal(m.likes, 234);
  assert.equal(m.completion, 45.6);
  assert.equal(m.retention3, null);
  assert.equal(m.comments, null);
});
test("SRT 保留真实时间戳，纯文本不猜时间", () => {
  const e = buildEvidence(
    video(1, {
      transcript:
        "1\n00:00:01,000 --> 00:00:03,000\n先看结果\n\n2\n00:00:20,000 --> 00:00:23,000\n超出视频",
    }),
  );
  const t = e.filter((x) => x.type === "transcript");
  assert.equal(t.length, 1);
  assert.equal(t[0].time, 1);
  assert.equal(
    buildEvidence(video()).find((e) => e.type === "transcript")?.time,
    undefined,
  );
});
test("AI 结构包含全部可用输出，能通过真实证据校验", () => {
  assert.equal(validateAi(ai(), evidence, 10).suggested_titles.length, 5);
});
test("AI 不存在的证据引用被拒绝", () => {
  const r = ai();
  r.findings[0].evidence_ids = ["made_up"];
  assert.throws(() => validateAi(r, evidence, 10), /不存在/);
});
test("AI 虚构时间点被拒绝", () => {
  const r = ai();
  r.findings[0].time = 8;
  assert.throws(() => validateAi(r, evidence, 10), /时间戳/);
});
test("AI 不得用标题或数据充当画面评分证据", () => {
  const r = ai();
  r.content_scores[3].evidence_ids = ["text_0"];
  assert.throws(() => validateAi(r, evidence, 10), /画面证据/);
});
test("重复评分维度及模型附加计算指标被拒绝", () => {
  const r = ai();
  r.content_scores[1].dimension = "开头钩子";
  assert.throws(() => validateAi(r, evidence, 10), /维度重复/);
  assert.throws(() =>
    validateAi({ ...ai(), data_metrics: { likesRate: 99 } }, evidence, 10),
  );
});

test("OCR 中文字符间空格不丢失字段", () => {
  const m = parseOcr(
    "播放 量 12000\n点 赞 量 600\n完 播 率 45.6%\n5 秒 留存 率 62%\n平均 播放 时 长 12 秒",
  );
  assert.equal(m.plays, 12000);
  assert.equal(m.likes, 600);
  assert.equal(m.completion, 45.6);
  assert.equal(m.retention5, 62);
  assert.equal(m.avgWatch, 12);
});
