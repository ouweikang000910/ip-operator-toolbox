import type { Video, Evidence } from "./types";
import { derive } from "./metrics";
function seconds(s: string) {
  const p = s.replace(",", ".").split(":").map(Number);
  return p.reduce((a, b) => a * 60 + b, 0);
}
export function buildEvidence(v: Video): Evidence[] {
  const e: Evidence[] = [{ id: "title", type: "title", text: v.title }];
  const text = v.transcript.trim();
  const srt =
    /(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})[^\n]*\n([\s\S]*?)(?=\n\s*\n|$)/g;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = srt.exec(text)) && n < 80) {
    const time = seconds(m[1]),
      end = seconds(m[2]);
    if (time > end || end > (v.duration || Infinity)) continue;
    e.push({
      id: `text_${n++}`,
      type: "transcript",
      time,
      end,
      text: m[3].trim(),
    });
  }
  if (!n && text) {
    for (let i = 0; i < Math.min(text.length, 18000); i += 1500)
      e.push({
        id: `text_${i / 1500}`,
        type: "transcript",
        text: text.slice(i, i + 1500),
      });
  }
  for (const [i, f] of v.frames.entries())
    e.push({
      id: `frame_${i}`,
      type: "frame",
      text: `视频采样帧，时间 ${f.time} 秒；只代表这一帧，不代表连续运动或声音`,
      time: f.time,
      file: f.file,
    });
  for (const m of derive(v.metrics))
    if (m.value !== null)
      e.push({
        id: `metric_${m.key}`,
        type: "metric",
        text: `${m.label}：${m.value.toFixed(2)} ${m.unit}；${m.formula}；发布后 ${v.windowHours} 小时累计数据；记录时间 ${v.capturedAt}`,
      });
  return e;
}
