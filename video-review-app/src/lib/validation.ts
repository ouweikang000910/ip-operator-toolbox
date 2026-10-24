import { z } from "zod/v4";
import { metricDefs, type Evidence } from "./types";
const counts = new Set([
  "plays",
  "impressions",
  "likes",
  "comments",
  "saves",
  "shares",
  "followers",
  "profileVisits",
]);
const percents = new Set(["completion", "bounce2", "retention3", "retention5"]);
export const metricsSchema = z
  .object(
    Object.fromEntries(
      metricDefs.map(([key]) => [
        key,
        (percents.has(key)
          ? z.number().min(0).max(100)
          : counts.has(key)
            ? z.number().int().min(0).max(Number.MAX_SAFE_INTEGER)
            : z.number().min(0).max(86400)
        )
          .nullable()
          .optional(),
      ]),
    ),
  )
  .strict();
export const videoInputSchema = z
  .object({
    title: z.string().trim().min(1, "请填写视频标题").max(200),
    account: z.string().trim().min(1, "请填写账号").max(80),
    category: z.string().trim().min(1).max(60),
    platform: z.string().trim().min(1).max(40),
    publishedAt: z.iso.datetime({ offset: true }),
    windowHours: z.number().int().min(1).max(8760),
    capturedAt: z.iso.datetime({ offset: true }),
    transcript: z.string().max(60000).default(""),
    metrics: metricsSchema,
  })
  .refine((v) => new Date(v.capturedAt) >= new Date(v.publishedAt), {
    message: "数据记录时间不得早于发布时间",
    path: ["capturedAt"],
  });
const refs = z.array(z.string()).min(1).max(20);
const suggestion = z
  .object({ text: z.string().min(1).max(2000), evidence_ids: refs })
  .strict();
export const aiSchema = z
  .object({
    summary: z.string().min(1).max(3000),
    confidence: z.enum(["低", "中", "高"]),
    content_scores: z
      .array(
        z
          .object({
            dimension: z.enum([
              "开头钩子",
              "内容结构",
              "节奏控制",
              "视听表达",
              "文案表达",
            ]),
            score: z.number().int().min(0).max(20).nullable(),
            reason: z.string().max(2000),
            evidence_ids: z.array(z.string()).max(20),
            improvement: z.string().max(2000),
          })
          .strict(),
      )
      .length(5),
    findings: z
      .array(
        z
          .object({
            title: z.string().max(200),
            priority: z.enum(["高", "中", "低"]),
            kind: z.enum(["有证据的分析", "待验证假设"]),
            explanation: z.string().max(3000),
            evidence_ids: refs,
            action: z.string().max(2000),
            time: z.number().min(0).nullable(),
          })
          .strict(),
      )
      .length(3),
    improvement_actions: z.array(suggestion).min(3).max(12),
    suggested_hooks: z.array(suggestion).length(3),
    suggested_titles: z.array(suggestion).length(5),
    rewritten_script: z.string().max(12000),
    next_video_plan: z
      .object({
        topic: z.string().max(2000),
        test: z.string().max(2000),
        observe: z.array(z.string().max(200)).min(1).max(8),
      })
      .strict(),
    features: z
      .object({
        hook: z.string().max(100),
        structure: z.string().max(100),
        title_style: z.string().max(100),
      })
      .strict(),
  })
  .strict();
export function validateAi(
  raw: unknown,
  evidence: Evidence[],
  duration: number,
) {
  const report = aiSchema.parse(raw);
  const ids = new Set(evidence.map((e) => e.id));
  if (new Set(report.content_scores.map((s) => s.dimension)).size !== 5)
    throw new Error("AI 评分维度重复");
  const referenced = [
    ...report.content_scores,
    ...report.findings,
    ...report.improvement_actions,
    ...report.suggested_hooks,
    ...report.suggested_titles,
  ];
  for (const item of referenced)
    for (const id of item.evidence_ids)
      if (!ids.has(id)) throw new Error(`AI 引用了不存在的证据：${id}`);
  for (const f of report.findings)
    if (
      f.time !== null &&
      (f.time > duration ||
        !evidence.some(
          (e) =>
            f.evidence_ids.includes(e.id) &&
            e.time !== undefined &&
            Math.abs(e.time - f.time!) < 0.6,
        ))
    )
      throw new Error("AI 时间戳必须对应引用的真实帧或字幕起点");
  for (const s of report.content_scores) {
    if (s.score !== null && !s.evidence_ids.length)
      throw new Error("AI 评分缺少证据");
    if (s.score !== null) {
      const types = s.evidence_ids.map(
        (id) => evidence.find((e) => e.id === id)!.type,
      );
      if (!types.includes("frame") && !types.includes("transcript"))
        throw new Error("内容评分需要视频或字幕证据");
      if (s.dimension === "视听表达" && !types.includes("frame"))
        throw new Error("视听评分缺少画面证据");
      if (
        ["文案表达", "内容结构"].includes(s.dimension) &&
        !types.includes("transcript")
      )
        throw new Error("文案/结构评分缺少字幕证据");
    }
  }
  return report;
}
