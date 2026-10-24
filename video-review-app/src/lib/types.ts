export const metricDefs = [
  ["plays", "播放量", "次"],
  ["impressions", "曝光量", "次"],
  ["likes", "点赞量", "次"],
  ["comments", "评论量", "次"],
  ["saves", "收藏量", "次"],
  ["shares", "转发量", "次"],
  ["followers", "涨粉量", "人"],
  ["avgWatch", "平均播放时长", "秒"],
  ["completion", "完播率", "%"],
  ["bounce2", "2 秒跳出率", "%"],
  ["retention3", "3 秒留存率", "%"],
  ["retention5", "5 秒留存率", "%"],
  ["profileVisits", "主页访问量", "次"],
] as const;
export type MetricKey = (typeof metricDefs)[number][0];
export type Metrics = Partial<Record<MetricKey, number | null>>;
export type Derived = {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  formula: string;
};
export type Evidence = {
  id: string;
  type: "title" | "transcript" | "frame" | "metric";
  text: string;
  time?: number;
  end?: number;
  file?: string;
};
export type Suggestion = { text: string; evidence_ids: string[] };
export type ContentScore = {
  dimension: string;
  score: number | null;
  reason: string;
  evidence_ids: string[];
  improvement: string;
};
export type AiReport = {
  summary: string;
  confidence: "低" | "中" | "高";
  content_scores: ContentScore[];
  findings: {
    title: string;
    priority: "高" | "中" | "低";
    kind: "有证据的分析" | "待验证假设";
    explanation: string;
    evidence_ids: string[];
    action: string;
    time: number | null;
  }[];
  improvement_actions: Suggestion[];
  suggested_hooks: Suggestion[];
  suggested_titles: Suggestion[];
  rewritten_script: string;
  next_video_plan: { topic: string; test: string; observe: string[] };
  features: { hook: string; structure: string; title_style: string };
};
export type ReviewReport = {
  mode: "ai" | "local";
  generatedAt: string;
  ai: AiReport | null;
  evidence: Evidence[];
  metrics: Derived[];
  performance: Performance;
  warnings: string[];
  localActions: string[];
  model: string | null;
};
export type Performance = {
  score: number | null;
  sampleCount: number;
  reason: string;
  dimensions: {
    key: string;
    label: string;
    value: number;
    median: number;
    score: number;
    samples: number;
  }[];
};
export type Video = {
  id: string;
  title: string;
  account: string;
  category: string;
  platform: string;
  publishedAt: string;
  windowHours: number;
  capturedAt: string;
  transcript: string;
  metrics: Metrics;
  status: "draft" | "queued" | "processing" | "complete" | "failed";
  stage: string;
  progress: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  duration: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  videoFile: string;
  coverFile: string | null;
  frames: { file: string; time: number }[];
  report: ReviewReport | null;
  warnings: string[];
};
