import {
  metricDefs,
  type Metrics,
  type Derived,
  type Video,
  type Performance,
} from "./types";
export function derive(m: Metrics): Derived[] {
  const base: Derived[] = metricDefs.map(([key, label, unit]) => ({
    key,
    label,
    unit,
    value: m[key] ?? null,
    formula: "用户录入 · 该记录统计窗口",
  }));
  for (const [key, label] of [
    ["likes", "点赞率"],
    ["comments", "评论率"],
    ["saves", "收藏率"],
    ["shares", "转发率"],
    ["followers", "转粉率"],
    ["profileVisits", "主页访问率"],
  ] as const) {
    const n = m[key],
      d = m.plays;
    base.push({
      key: key + "Rate",
      label,
      unit: "%",
      value: n != null && d != null && d > 0 ? (n / d) * 100 : null,
      formula: `${metricDefs.find((f) => f[0] === key)![1]} ÷ 播放量 × 100%`,
    });
  }
  return base;
}
export function median(a: number[]) {
  const b = [...a].sort((a, b) => a - b);
  const n = b.length;
  return n ? (b[Math.floor(n / 2)] + b[Math.floor((n - 1) / 2)]) / 2 : 0;
}
export function peersFor(v: Video, all: Video[]) {
  return all
    .filter(
      (x) =>
        x.id !== v.id &&
        x.account === v.account &&
        x.category === v.category &&
        x.platform === v.platform &&
        x.windowHours === v.windowHours &&
        x.publishedAt < v.publishedAt,
    )
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 30);
}
export function performance(v: Video, all: Video[]): Performance {
  const peers = peersFor(v, all);
  const dimensions: Performance["dimensions"] = [];
  const own = derive(v.metrics);
  for (const key of [
    "completion",
    "retention5",
    "likesRate",
    "savesRate",
    "followersRate",
  ]) {
    const m = own.find((x) => x.key === key)!;
    if (m.value === null) continue;
    const values = peers
      .map((x) => derive(x.metrics).find((y) => y.key === key)!.value)
      .filter((x): x is number => x !== null);
    if (values.length < 5) continue;
    const rank =
      ((values.filter((x) => x < m.value!).length +
        0.5 * values.filter((x) => x === m.value).length) /
        values.length) *
      100;
    dimensions.push({
      key,
      label: m.label,
      value: m.value,
      median: median(values),
      score: Math.round(rank),
      samples: values.length,
    });
  }
  const enough = dimensions.length >= 3;
  return {
    score: enough
      ? Math.round(
          dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length,
        )
      : null,
    sampleCount: peers.length,
    reason: enough
      ? "同账号、平台、分类、统计窗口的最近 30 条更早视频；每项至少 5 个有效样本，至少 3 项等权平均百分位。"
      : "暂无足够基准：需要至少 5 条同账号、平台、分类、统计窗口的更早视频，且至少 3 个评分指标有有效样本。",
    dimensions,
  };
}
export function dataWarnings(v: Video) {
  const m = v.metrics;
  const a: string[] = [];
  if (m.plays === 0)
    a.push("播放量为 0，所有以播放量为分母的比率均显示暂无数据。");
  if (m.avgWatch != null && v.duration && m.avgWatch > v.duration)
    a.push("平均播放时长超过视频时长，请核对口径；也可能包含循环播放。");
  if (
    m.retention3 != null &&
    m.retention5 != null &&
    m.retention5 > m.retention3
  )
    a.push("5 秒留存率高于 3 秒留存率，请核对截图和统计口径。");
  a.push("未导入逐秒留存曲线，不能定位真实观众流失时间点。");
  return a;
}
export function accountInsights(videos: Video[]) {
  const groups = new Map<string, Video[]>();
  for (const v of videos) {
    const key = JSON.stringify([
      v.account,
      v.platform,
      v.windowHours,
      v.category,
    ]);
    groups.set(key, [...(groups.get(key) || []), v]);
  }
  return [...groups.values()].map((items) => {
    const first = items[0];
    const valid = items.filter((v) => v.metrics.plays != null);
    const sorted = valid.sort(
      (a, b) => (b.metrics.plays ?? 0) - (a.metrics.plays ?? 0),
    );
    return {
      account: first.account,
      platform: first.platform,
      windowHours: first.windowHours,
      category: first.category,
      count: items.length,
      medianPlays: valid.length
        ? median(valid.map((v) => v.metrics.plays!))
        : null,
      top: sorted.slice(0, 3).map((v) => ({
        id: v.id,
        title: v.title,
        duration: v.duration,
        plays: v.metrics.plays,
        hook: v.report?.ai?.features.hook ?? "无法判断",
        structure: v.report?.ai?.features.structure ?? "无法判断",
      })),
      recurring: items
        .flatMap((v) => v.report?.ai?.findings.map((f) => f.title) ?? [])
        .reduce(
          (acc, t) => ({ ...acc, [t]: (acc[t] || 0) + 1 }),
          {} as Record<string, number>,
        ),
    };
  });
}
