import { metricDefs } from "./types";
export function parseOcr(text: string) {
  const aliases: Record<string, string[]> = {
    plays: ["播放量", "播放次数"],
    impressions: ["曝光量", "曝光次数"],
    likes: ["点赞量", "点赞数", "点赞"],
    comments: ["评论量", "评论数", "评论"],
    saves: ["收藏量", "收藏数", "收藏"],
    shares: ["转发量", "分享量", "转发"],
    followers: ["涨粉量", "新增粉丝", "涨粉"],
    avgWatch: ["平均播放时长", "平均观看时长"],
    completion: ["完播率"],
    bounce2: ["2秒跳出率", "2 秒跳出率"],
    retention3: ["3秒留存率", "3 秒留存率"],
    retention5: ["5秒留存率", "5 秒留存率"],
    profileVisits: ["主页访问量", "主页访问"],
  };
  const candidates: Record<string, number | null> = {};
  const normalized = text
    .replace(/[，,](?=\d{3}(?:\D|$))/g, "")
    .replace(/％/g, "%");
  for (const [key] of metricDefs) {
    let val: number | null = null;
    for (const a of aliases[key]) {
      const escaped = a.replace(/\s+/g, "").split("").join("\\s*");
      const m = normalized.match(
        new RegExp(
          escaped + "[：:\\s]*([0-9]+(?:\\.[0-9]+)?)\\s*(万|亿|%|秒)?",
        ),
      );
      if (!m) continue;
      let n = Number(m[1]);
      if (m[2] === "万") n *= 10000;
      if (m[2] === "亿") n *= 100000000;
      const percentage = [
        "completion",
        "bounce2",
        "retention3",
        "retention5",
      ].includes(key);
      if (percentage && (m[2] !== "%" || n > 100)) continue;
      val = n;
      break;
    }
    candidates[key] = val;
  }
  return candidates;
}
