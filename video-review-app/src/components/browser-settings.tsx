import { useState } from "react";
import { getAIConfig, setAIConfig } from "../lib/ai-config";
import { Database, Sparkles, ArrowUpRight, ShieldCheck } from "lucide-react";
export default function BrowserSettings() {
  const saved = getAIConfig();
  const [base, setBase] = useState(saved.AI_BASE_URL),
    [model, setModel] = useState(saved.AI_MODEL),
    [key, setKey] = useState(saved.AI_API_KEY),
    [message, setMessage] = useState("");
  function save() {
    try {
      setAIConfig({
        AI_BASE_URL: base,
        AI_MODEL: model,
        AI_API_KEY: key,
        AI_ENABLED: "true",
      });
      setMessage(
        key && model
          ? "已应用 AI 配置。返回视频报告，点击重新复盘即可。"
          : "已切换到数据基础模式。",
      );
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  return (
    <>
      <div className="page-head">
        <div className="heading">
          <div className="eyebrow">BROWSER PREFERENCES</div>
          <h1>你的浏览器工作台</h1>
          <p>无需登录。视频和复盘记录只保存在当前浏览器中。</p>
        </div>
        <a className="btn" href="../">
          <ArrowUpRight size={15} />
          返回 IP 工具箱
        </a>
      </div>
      <div className="settings-grid">
        <section className="panel padded">
          <h2>
            <Sparkles size={18} />
            AI 服务（可选）
          </h2>
          <p className="muted">
            配置你自己的 OpenAI
            兼容视觉模型，点击复盘时生成内容分析。不配置也能使用数据报告、证据与历史对比。
          </p>
          <label className="field">
            HTTPS 服务基础地址
            <input
              type="url"
              value={base}
              onChange={(e) => setBase(e.target.value)}
              placeholder="https://api.example.com/v1"
              autoComplete="off"
            />
          </label>
          <label className="field">
            视觉模型 ID
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="填写服务商提供的模型名称"
              autoComplete="off"
            />
          </label>
          <label className="field">
            你自己的 API Key
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              autoComplete="off"
              placeholder="只在本次页面会话中使用"
            />
          </label>
          <div className="button-row">
            <button className="btn primary" onClick={save}>
              应用配置
            </button>
            <button
              className="btn"
              onClick={() => {
                setKey("");
                setAIConfig({
                  ...getAIConfig(),
                  AI_API_KEY: "",
                  AI_ENABLED: "false",
                });
                setMessage("API Key 已从本次页面会话清除。");
              }}
            >
              清除密钥
            </button>
          </div>
          <p role="status" aria-live="polite" className="hint">
            {message}
          </p>
          <div className="notice">
            <ShieldCheck size={16} />
            密钥仅在当前页面内存中保存，刷新后清空。点击复盘会把标题、字幕、指标和最多
            8
            张压缩帧发送给你填写的服务商，并按其规则计费。服务需支持浏览器跨域请求（CORS）、图像输入及
            JSON 输出。
          </div>
          <h3>连接失败时</h3>
          <p className="muted">
            若服务商不允许浏览器请求，请使用你信任的、配置了跨域权限的兼容 API
            服务。这里不会转发密钥到网站作者的服务器。
          </p>
        </section>
        <section className="panel padded">
          <h2>
            <Database size={18} />
            存储与使用说明
          </h2>
          <div className="settings-row">
            <span>存储位置</span>
            <b>当前浏览器 · IndexedDB</b>
          </div>
          <div className="settings-row">
            <span>原视频上限</span>
            <b>200 MB / 20 分钟</b>
          </div>
          <div className="settings-row">
            <span>关键帧</span>
            <b>原片采样 · 最多 8 帧</b>
          </div>
          <p className="notice">
            清除网站数据、浏览器自动清理或使用无痕模式，可能导致记录丢失。重要报告请及时导出。不同设备、浏览器之间不会自动同步。
          </p>
          <h3>视频与截图</h3>
          <p className="muted">
            原片和 OCR 截图在浏览器内处理，基础模式不上传素材。OCR
            组件和语言包由本网站提供，识别结果必须人工核对。浏览器可用存储空间不足时，保存会给出提示。
          </p>
          <h3>字幕与声音</h3>
          <p className="muted">
            粘贴逐字稿或 SRT
            字幕后可分析文案。暂不自动转写音频，不评价未听取的声音。推荐 H.264
            视频 + AAC 音频；原片帧率显示未知。
          </p>
          <h3>分析与记录</h3>
          <p className="muted">
            分析时保持网页打开。AI 请求最长 65 秒，失败后可重试；最多保存 1000
            条视频，样本不足时不会生成运营评分。
          </p>
        </section>
      </div>
    </>
  );
}
