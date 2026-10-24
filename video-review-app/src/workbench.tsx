"use client";
import { browserOcr } from "@/lib/browser-media";
import {
  browserApi as api,
  localImport as uploadCloudVideo,
} from "@/lib/browser-api";
import { StoredImage, StoredVideo } from "@/components/stored-media";
import BrowserSettings from "@/components/browser-settings";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  Clapperboard,
  Clock3,
  Copy,
  Database,
  Download,
  FileText,
  Film,
  FolderOpen,
  ImagePlus,
  Layers3,
  LayoutDashboard,
  LoaderCircle,
  Plus,
  Play,
  ScanLine,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Upload,
  Video as VideoIcon,
  X,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  metricDefs,
  type Video,
  type Metrics,
  type ReviewReport,
  type Evidence,
} from "@/lib/types";
import { derive, performance, accountInsights } from "@/lib/metrics";

type Settings = {
  aiEnabled: boolean;
  model: string;
  baseUrl: string;
  hasKey: boolean;
  transcription: boolean;
  dataDir: string;
  maxVideoMB: number;
  maxFrames: number;
  workerOnline: boolean;
  displayName?: string;
};
type Page =
  | "dashboard"
  | "new"
  | "library"
  | "compare"
  | "insights"
  | "settings"
  | "report"
  | "edit";
const navs = [
  ["dashboard", "工作台", LayoutDashboard],
  ["library", "视频复盘库", FolderOpen],
  ["compare", "视频对比", Layers3],
  ["insights", "账号洞察", BarChart3],
] as const;
const statusText = {
  draft: "待复盘",
  queued: "排队中",
  processing: "分析中",
  complete: "已完成",
  failed: "需重试",
};
const fmt = (n: number | null | undefined, digits = 1) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("zh-CN", { maximumFractionDigits: digits }).format(
        n,
      );
const compact = (n: number) =>
  n >= 10000 ? `${(n / 10000).toFixed(1)}万` : fmt(n, 0);
const time = (n: number) =>
  `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
const localInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
function Btn({
  children,
  onClick,
  primary = false,
  disabled = false,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      className={`${primary ? "btn primary" : "btn"} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Clapperboard size={28} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
function Badge({ video }: { video: Video }) {
  return (
    <span className={`badge ${video.status}`}>
      <i />
      {statusText[video.status]}
    </span>
  );
}
function MiniCover({ v }: { v: Video }) {
  const cover = v.coverFile || v.frames[0]?.file;
  return (
    <div className="mini-cover">
      {cover ? (
        <StoredImage videoId={v.id} file={cover} alt="视频封面" />
      ) : (
        <Film size={22} />
      )}
    </div>
  );
}
function Stat({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: ReactNode;
}) {
  return (
    <div className="stat panel">
      <div className="stat-label">
        {label}
        <span>{icon}</span>
      </div>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  );
}
function Chart({ videos }: { videos: Video[] }) {
  const points = [...videos]
    .filter((v) => v.metrics.plays != null)
    .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt))
    .slice(-20)
    .map((v) => ({
      name: new Date(v.publishedAt).toLocaleDateString("zh-CN", {
        month: "numeric",
        day: "numeric",
      }),
      播放量: v.metrics.plays,
      title: v.title,
    }));
  return points.length ? (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={points}
          margin={{ left: -12, right: 12, top: 20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f520ea" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#f520ea" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="#34203e"
            strokeDasharray="3 5"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            stroke="#747987"
            tickLine={false}
            axisLine={false}
            fontSize={11}
          />
          <YAxis
            stroke="#747987"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            tickFormatter={compact}
          />
          <Tooltip
            contentStyle={{
              background: "#151022",
              border: "1px solid #73307d",
              borderRadius: 12,
              color: "#eee",
            }}
            labelFormatter={(_, items) => items[0]?.payload?.title || ""}
          />
          <Area
            type="monotone"
            dataKey="播放量"
            stroke="#ed28f5"
            strokeWidth={2.5}
            fill="url(#chart-fill)"
            dot={{
              r: 3.5,
              fill: "#ff8128",
              stroke: "#ffd0a4",
              strokeWidth: 1.5,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  ) : (
    <div className="chart-empty">
      <div className="grid-lines" />
      <svg viewBox="0 0 600 130" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M0 110 C70 110 80 80 130 85 S220 115 270 60 S350 90 400 45 S500 75 600 15"
          fill="none"
          stroke="#a02ddb"
          strokeWidth="2"
          strokeDasharray="5 8"
        />
      </svg>
      <span>你的第一条数据，将从这里开始</span>
      <small>趋势示意 · 暂无真实数据</small>
    </div>
  );
}
export default function Workbench() {
  const [page, setPage] = useState<Page>("dashboard"),
    [videos, setVideos] = useState<Video[]>([]),
    [settings, setSettings] = useState<Settings | null>(null),
    [selected, setSelected] = useState<string | null>(null),
    [checked, setChecked] = useState<string[]>([]),
    [toast, setToast] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [query, setQuery] = useState(""),
    [account, setAccount] = useState(""),
    [category, setCategory] = useState(""),
    [dateFrom, setDateFrom] = useState(""),
    [dateTo, setDateTo] = useState(""),
    [sort, setSort] = useState("latest"),
    [deleteId, setDeleteId] = useState<string | null>(null);
  const notify = (s: string) => {
    setToast(s);
  };
  const load = async () => {
    try {
      const [v, s] = await Promise.all([
        api<Video[]>("/api/videos"),
        api<Settings>("/api/settings"),
      ]);
      setVideos(v);
      setSettings(s);
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
    const tick = setInterval(() => {
      void load();
    }, 4000);
    const restore = () => {
      const [p, id] = location.hash.slice(1).split("/");
      if (
        [
          "dashboard",
          "new",
          "library",
          "compare",
          "insights",
          "settings",
          "report",
          "edit",
        ].includes(p)
      ) {
        setPage(p as Page);
        setSelected(id || null);
      }
    };
    restore();
    window.addEventListener("hashchange", restore);
    return () => {
      clearInterval(tick);
      window.removeEventListener("hashchange", restore);
    };
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 6500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  function go(p: Page, id?: string) {
    setPage(p);
    setSelected(id || null);
    location.hash = p + (id ? "/" + id : "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const analyze = async (id: string) => {
    go("report", id);
    await api(`/api/videos/${id}/analyze`, { method: "POST" });
    await load();
    go("report", id);
  };
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify("已复制到剪贴板");
    } catch {
      notify("复制失败，请手动选择文本复制");
    }
  };
  const filtered = videos
    .filter(
      (v) =>
        (!query ||
          `${v.title} ${v.transcript}`
            .toLowerCase()
            .includes(query.toLowerCase())) &&
        (!account || v.account === account) &&
        (!category || v.category === category) &&
        (!dateFrom ||
          v.publishedAt >= new Date(dateFrom + "T00:00:00").toISOString()) &&
        (!dateTo ||
          v.publishedAt <= new Date(dateTo + "T23:59:59.999").toISOString()),
    )
    .sort((a, b) =>
      sort === "plays"
        ? (b.metrics.plays ?? -1) - (a.metrics.plays ?? -1)
        : b.publishedAt.localeCompare(a.publishedAt),
    );
  const current = videos.find((v) => v.id === selected);
  const pending = videos.filter((v) => v.status !== "complete");
  const completed = videos.filter((v) => v.status === "complete");
  const pageLabel =
    page === "report"
      ? "复盘报告"
      : page === "new"
        ? "新建视频复盘"
        : page === "edit"
          ? "编辑复盘资料"
          : page === "settings"
            ? "设置"
            : navs.find((n) => n[0] === page)?.[1] || "工作台";
  const toggle = (id: string) =>
    setChecked((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 5
          ? [...prev, id]
          : (notify("最多选择 5 条视频"), prev),
    );
  const table = (items: Video[], select = false) => (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {select && <th>对比</th>}
            <th>视频内容</th>
            <th>账号 / 分类</th>
            <th>播放量</th>
            <th>完播率</th>
            <th>统计窗口</th>
            <th>状态</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((v) => (
            <tr key={v.id}>
              {select && (
                <td>
                  <input
                    aria-label={`选择 ${v.title}`}
                    type="checkbox"
                    checked={checked.includes(v.id)}
                    onChange={() => toggle(v.id)}
                  />
                </td>
              )}
              <td>
                <button
                  className="video-cell"
                  onClick={() => go("report", v.id)}
                >
                  <MiniCover v={v} />
                  <span>
                    <b>{v.title}</b>
                    <small>
                      {new Date(v.publishedAt).toLocaleDateString("zh-CN")} ·{" "}
                      {v.duration ? time(v.duration) : "待解析"}
                    </small>
                  </span>
                </button>
              </td>
              <td>
                <span>{v.account}</span>
                <small>{v.category}</small>
              </td>
              <td className="number">{fmt(v.metrics.plays, 0)}</td>
              <td className="number">
                {v.metrics.completion == null
                  ? "—"
                  : `${fmt(v.metrics.completion)}%`}
              </td>
              <td>
                <span className="subtle">{v.windowHours} 小时</span>
              </td>
              <td>
                <Badge video={v} />
              </td>
              <td>
                <button
                  className="icon-btn"
                  title="查看报告"
                  onClick={() => go("report", v.id)}
                >
                  <ArrowUpRight size={17} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-pattern" aria-hidden="true" />
        <button
          className="brand"
          aria-label="返回工作台"
          onClick={() => go("dashboard")}
        >
          <span className="brand-symbol">
            <Activity size={23} />
          </span>
          <div>
            视频复盘官<small>VIDEO INTELLIGENCE</small>
          </div>
        </button>
        <div className="workspace-label">
          <span className="avatar">我</span>
          <span>
            我的创作空间<small>浏览器工作区</small>
          </span>
          <ShieldCheck size={15} />
        </div>
        <div className="nav-label">工作空间</div>
        <nav>
          {navs.map(([key, label, Icon]) => (
            <button
              key={key}
              className={page === key ? "active" : ""}
              onClick={() => go(key)}
            >
              <Icon size={18} />
              {label}
              {key === "library" && (
                <span className="nav-count">{videos.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-card">
            <span className="live-dot" /> 你的浏览器空间
            <p>每一次复盘，积累下一次创作的底气。</p>
            <span className="tiny">
              本地保存 · 无需登录 <ShieldCheck size={12} />
            </span>
          </div>
          <button
            className={`settings-nav ${page === "settings" ? "active" : ""}`}
            onClick={() => go("settings")}
          >
            <Settings2 size={18} />
            设置与 AI 服务
          </button>
          <div className="profile">
            <span className="avatar purple">创</span>
            <span>
              创作者<small>Personal workspace</small>
            </span>
            <span className="version">v1.0</span>
          </div>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div>
            <span className="muted">我的工作空间</span>
            <ChevronRight size={13} />
            <span>{pageLabel}</span>
          </div>
          <div className="top-status">
            <span
              className={`live-dot ${settings?.workerOnline ? "" : "offline"}`}
            />
            {settings?.workerOnline ? "浏览器存储已就绪" : "正在打开浏览器存储"}
            <span className="divider" />
            <span className="avatar small">我</span>
          </div>
        </header>
        <main className="content">
          {page === "dashboard" && (
            <>
              <div className="page-head neon-hero">
                <div className="hero-pattern" aria-hidden="true" />
                <span className="hero-star star-start" aria-hidden="true">
                  ✷
                </span>
                <span className="hero-star star-end" aria-hidden="true">
                  ✷
                </span>
                <div className="heading">
                  <div className="eyebrow">
                    CREATOR WORKSPACE <span> / 01</span>
                  </div>
                  <h1>
                    每一次复盘，都是下一次进步
                    <span className="purple-text">。</span>
                  </h1>
                  <p>连接内容与数据，让每一条视频都有迹可循。</p>
                </div>
                <Btn primary onClick={() => go("new")}>
                  <Plus size={18} />
                  新建视频复盘
                </Btn>
              </div>
              <div className="stats">
                <Stat
                  label="视频总数"
                  value={fmt(videos.length, 0)}
                  sub={`${new Set(videos.map((v) => v.account)).size} 个账号的创作资产`}
                  icon={<Film size={18} />}
                />
                <Stat
                  label="累计播放量"
                  value={compact(
                    videos.reduce((s, v) => s + (v.metrics.plays || 0), 0),
                  )}
                  sub="各条视频最新录入值之和 · 非去重人数"
                  icon={<Activity size={18} />}
                />
                <Stat
                  label="已完成复盘"
                  value={fmt(completed.length, 0)}
                  sub={`${completed.filter((v) => v.report?.mode === "ai").length} 份 AI 报告 · ${completed.filter((v) => v.report?.mode === "local").length} 份数据报告`}
                  icon={<CheckCircle2 size={18} />}
                />
                <Stat
                  label="待处理任务"
                  value={fmt(pending.length, 0)}
                  sub={
                    pending.length
                      ? "准备好开启下一次复盘"
                      : "工作区已就绪，随时开始"
                  }
                  icon={<Clock3 size={18} />}
                />
              </div>
              <div className="dashboard-grid">
                <section className="panel trend-panel">
                  <div className="panel-head">
                    <div>
                      <h2>
                        内容表现趋势 <span className="chip">播放量</span>
                      </h2>
                      <p>最近 20 条有播放数据的视频</p>
                    </div>
                    <span className="tiny">按发布时间</span>
                  </div>
                  <Chart videos={videos} />
                  <div className="chart-note">
                    <span className="legend-dot" />
                    视频播放量
                    <span>各视频窗口与流量体量可能不同，仅作走势参考</span>
                  </div>
                </section>
                <section className="panel focus-panel">
                  <div className="panel-head">
                    <h2>创作进化，从这里开始</h2>
                    <Sparkles size={18} className="purple-text" />
                  </div>
                  <div className="orbit-art" aria-hidden="true">
                    <div className="orbit o1" />
                    <div className="orbit o2" />
                    <div className="orbit-center">
                      <Play size={38} fill="currentColor" />
                    </div>
                    <span className="orbit-tag tag-a">
                      <Activity size={13} />
                      数据
                    </span>
                    <span className="orbit-tag tag-b">
                      <Clapperboard size={13} />
                      内容
                    </span>
                    <span className="orbit-spark">✦</span>
                  </div>
                  <h3>找到下一条视频的突破口</h3>
                  <p>
                    从开头钩子到内容节奏，基于真实视频证据，获得可执行的优化方向。
                  </p>
                  <button className="text-action" onClick={() => go("new")}>
                    开始你的复盘 <ArrowRight size={16} />
                  </button>
                </section>
              </div>
              <div className="section-heading">
                <h2>
                  最近复盘 <span className="count">{videos.length}</span>
                </h2>
                <button
                  className="text-action muted"
                  onClick={() => go("library")}
                >
                  查看全部 <ArrowRight size={15} />
                </button>
              </div>
              <section className="panel">
                {videos.length ? (
                  table(videos.slice(0, 5))
                ) : (
                  <Empty
                    title="你的内容成长记录，从第一条开始"
                    description="上传已发布的视频，录入运营数据，把每一次创作变成可以复用的经验。"
                    action={
                      <Btn onClick={() => go("new")}>
                        <Upload size={16} />
                        导入第一条视频
                      </Btn>
                    }
                  />
                )}
              </section>
              <div className="bottom-tip">
                <ShieldCheck size={16} />
                <span>真实数据 · 真实证据 · 可执行建议</span>
                <span>数据不足时，我们会明确告诉你。</span>
              </div>
            </>
          )}
          {(page === "new" || page === "edit") && (
            <ImportForm
              key={page + (selected || "")}
              edit={page === "edit" ? current : undefined}
              settings={settings}
              notify={notify}
              cancel={() => go(current ? "report" : "dashboard", current?.id)}
              saved={async (v, run) => {
                await load();
                if (run) await analyze(v.id);
                else go("report", v.id);
              }}
            />
          )}
          {page === "library" && (
            <>
              <div className="page-head">
                <div className="heading">
                  <div className="eyebrow">CONTENT LIBRARY</div>
                  <h1>每一条内容，都有沉淀</h1>
                  <p>管理视频、更新数据，回看你的创作进化。</p>
                </div>
                <Btn primary onClick={() => go("new")}>
                  <Plus size={17} />
                  新建视频复盘
                </Btn>
              </div>
              <div className="filters panel">
                <label className="search-field">
                  <Search size={17} />
                  <input
                    placeholder="搜索标题或字幕…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <select
                  aria-label="筛选账号"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                >
                  <option value="">全部账号</option>
                  {[...new Set(videos.map((v) => v.account))].map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
                <select
                  aria-label="筛选分类"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">全部分类</option>
                  {[...new Set(videos.map((v) => v.category))].map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
                <input
                  aria-label="发布起始日期"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
                <span className="muted">至</span>
                <input
                  aria-label="发布结束日期"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
                <select
                  aria-label="排序"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="latest">最新发布</option>
                  <option value="plays">播放量降序</option>
                </select>
              </div>
              <div className="section-heading">
                <p>共 {filtered.length} 条视频</p>
                <Btn
                  disabled={checked.length < 2}
                  onClick={() => go("compare")}
                >
                  <Layers3 size={16} />
                  对比所选（{checked.length}/5）
                </Btn>
              </div>
              <section className="panel">
                {filtered.length ? (
                  table(filtered, true)
                ) : (
                  <Empty
                    title={loading ? "正在读取本地记录…" : "暂无符合条件的视频"}
                    description="可以调整筛选条件，或者导入一条新视频。"
                  />
                )}
              </section>
            </>
          )}
          {page === "report" &&
            (current ? (
              <Report
                video={current}
                videos={videos}
                settings={settings}
                copy={copy}
                edit={() => go("edit", current.id)}
                run={() => void act(() => analyze(current.id))}
                remove={() => setDeleteId(current.id)}
                back={() => go("library")}
                busy={busy}
              />
            ) : (
              <Empty
                title={loading ? "正在加载…" : "未找到这条视频"}
                description="记录可能已删除，请返回视频库。"
                action={<Btn onClick={() => go("library")}>返回视频库</Btn>}
              />
            ))}
          {page === "compare" && (
            <Compare
              videos={videos}
              checked={checked}
              toggle={toggle}
              open={(id) => go("report", id)}
            />
          )}
          {page === "insights" && (
            <Insights videos={videos} open={(id) => go("report", id)} />
          )}
          {page === "settings" && (
            <SettingsView settings={settings} copy={copy} />
          )}
        </main>
        <footer>
          AI 视频复盘官 <span>每一条视频，都应该让下一条更好。</span>
          <span>LOCAL & PRIVATE / EVIDENCE BASED</span>
        </footer>
      </div>
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button
            className="icon-btn"
            onClick={() => setToast("")}
            aria-label="关闭提示"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {deleteId && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="danger-icon">
              <Trash2 />
            </div>
            <h2>删除这条视频及复盘？</h2>
            <p>
              将从当前浏览器移除记录，并删除上传的视频、封面和关键帧。此操作无法撤销。
            </p>
            <div className="button-row">
              <Btn onClick={() => setDeleteId(null)}>保留记录</Btn>
              <Btn
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    await api(`/api/videos/${deleteId}`, { method: "DELETE" });
                    setDeleteId(null);
                    await load();
                    go("library");
                    notify("记录及关联媒体文件已删除");
                  })
                }
              >
                确认删除
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ImportForm({
  edit,
  settings,
  notify,
  cancel,
  saved,
}: {
  edit?: Video;
  settings: Settings | null;
  notify: (s: string) => void;
  cancel: () => void;
  saved: (v: Video, run: boolean) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null),
    [cover, setCover] = useState<File | null>(null),
    [preview, setPreview] = useState(""),
    [duration, setDuration] = useState<number | null>(null),
    [busy, setBusy] = useState(false),
    [uploadPct, setUploadPct] = useState(0),
    [uploadMessage, setUploadMessage] = useState(""),
    [drag, setDrag] = useState(false);
  const [title, setTitle] = useState(edit?.title || ""),
    [account, setAccount] = useState(edit?.account || ""),
    [category, setCategory] = useState(edit?.category || "知识分享"),
    [platform, setPlatform] = useState(edit?.platform || "抖音"),
    [published, setPublished] = useState(
      localInput(edit?.publishedAt || new Date().toISOString()),
    ),
    [captured, setCaptured] = useState(
      localInput(edit?.capturedAt || new Date().toISOString()),
    ),
    [hours, setHours] = useState(String(edit?.windowHours || 24)),
    [transcript, setTranscript] = useState(edit?.transcript || ""),
    [metrics, setMetrics] = useState<Record<string, string>>(() =>
      Object.fromEntries(
        metricDefs.map(([k]) => [
          k,
          edit?.metrics[k] == null ? "" : String(edit.metrics[k]),
        ]),
      ),
    );
  const [ocrBusy, setOcrBusy] = useState(false),
    [ocrText, setOcrText] = useState(""),
    [ocrValues, setOcrValues] = useState<Record<string, string> | null>(null),
    [ocrConfirmed, setOcrConfirmed] = useState(false);
  const videoInput = useRef<HTMLInputElement>(null),
    imageInput = useRef<HTMLInputElement>(null),
    ocrInput = useRef<HTMLInputElement>(null),
    formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  function choose(f?: File) {
    if (!f) return;
    if (!/\.(mp4|mov)$/i.test(f.name)) {
      notify("仅支持 MP4、MOV 视频");
      return;
    }
    if (f.size > (settings?.maxVideoMB || 200) * 1024 * 1024) {
      notify("视频超出上传大小限制");
      return;
    }
    setFile(f);
  }
  const ocrGeneration = useRef(0);
  async function ocr(f?: File) {
    if (!f) return;
    const generation = ++ocrGeneration.current;
    setOcrBusy(true);
    setOcrValues(null);
    setOcrConfirmed(false);
    try {
      const result = await browserOcr(f);
      if (generation !== ocrGeneration.current) return;
      setOcrText(result.text);
      setOcrValues(
        Object.fromEntries(
          metricDefs.map(([k]) => [
            k,
            result.candidates[k] == null ? "" : String(result.candidates[k]),
          ]),
        ),
      );
    } catch (e) {
      notify((e as Error).message);
    } finally {
      if (generation === ocrGeneration.current) setOcrBusy(false);
    }
  }
  async function submit(run: boolean) {
    if (!formRef.current?.reportValidity()) return;
    if (!edit && !file) {
      notify("请先选择视频");
      return;
    }
    if (ocrBusy || ocrValues) {
      notify("请等待 OCR 完成并核对识别结果，或取消本次识别");
      return;
    }
    setBusy(true);
    try {
      const input = {
        title,
        account,
        category,
        platform,
        publishedAt: new Date(published).toISOString(),
        capturedAt: new Date(captured).toISOString(),
        windowHours: Number(hours),
        transcript,
        metrics: Object.fromEntries(
          metricDefs.map(([k]) => [
            k,
            metrics[k] === "" ? null : Number(metrics[k]),
          ]),
        ),
      };
      let v: Video;
      if (edit)
        v = await api<Video>(`/api/videos/${edit.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
      else {
        v = await uploadCloudVideo(file!, cover, input, (message, pct) => {
          setUploadMessage(message);
          if (pct !== undefined) setUploadPct(pct);
        });
      }
      await saved(v, run);
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-head">
        <div className="heading">
          <button className="text-action muted" onClick={cancel}>
            <ArrowLeft size={15} />
            返回
          </button>
          <h1>{edit ? "更新视频资料" : "给这条视频，一次认真复盘"}</h1>
          <p>上传内容，补充数据，把创作直觉变成有据可依的行动。</p>
        </div>
        <span className="chip">
          <ShieldCheck size={13} />
          无需登录 · 本地保存
        </span>
      </div>
      <div className="stepper">
        <span className="current">
          <b>01</b>导入视频
        </span>
        <i />
        <span>
          <b>02</b>录入数据
        </span>
        <i />
        <span>
          <b>03</b>生成复盘
        </span>
      </div>
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          void submit(true);
        }}
      >
        <div className="import-grid">
          <div>
            <section className="panel padded">
              <h2>
                <span className="section-number">01</span>视频与内容
              </h2>
              {edit ? (
                <StoredVideo
                  className="upload-preview"
                  controls
                  videoId={edit.id}
                  file={edit.videoFile}
                />
              ) : (
                <div
                  className={`drop-zone ${drag ? "dragging" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDrag(true);
                  }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDrag(false);
                    choose(e.dataTransfer.files[0]);
                  }}
                >
                  {preview ? (
                    <>
                      <video
                        controls
                        src={preview}
                        onLoadedMetadata={(e) =>
                          setDuration(e.currentTarget.duration)
                        }
                      />
                      <div className="file-line">
                        <span>
                          {file?.name} · {duration ? time(duration) : "读取中"}
                        </span>
                        <button
                          type="button"
                          className="text-action"
                          onClick={() => videoInput.current?.click()}
                        >
                          更换视频
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="upload-target"
                      onClick={() => videoInput.current?.click()}
                    >
                      <span className="upload-icon">
                        <Upload size={25} />
                      </span>
                      <strong>点击上传，或将视频拖到这里</strong>
                      <span>
                        支持 MP4 / MOV，最大 {settings?.maxVideoMB || 200} MB
                      </span>
                      <small>保存原片与关键帧，让判断有据可依</small>
                    </button>
                  )}
                  <input
                    ref={videoInput}
                    type="file"
                    accept=".mp4,.mov,video/mp4,video/quicktime"
                    hidden
                    onChange={(e) => choose(e.target.files?.[0])}
                  />
                </div>
              )}
              {!edit && (
                <>
                  <input
                    ref={imageInput}
                    type="file"
                    hidden
                    accept=".png,.jpg,.jpeg,.webp"
                    onChange={(e) => setCover(e.target.files?.[0] || null)}
                  />
                  <button
                    type="button"
                    className="cover-upload"
                    onClick={() => imageInput.current?.click()}
                  >
                    <ImagePlus size={19} />
                    {cover ? cover.name : "添加视频封面（可选）"}
                    <Plus size={16} />
                  </button>
                </>
              )}
              <label className="field">
                视频标题 <em>*</em>
                <input
                  value={title}
                  required
                  maxLength={200}
                  placeholder="输入视频发布时的真实标题"
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <div className="form-grid">
                <label className="field">
                  所属账号 <em>*</em>
                  <input
                    value={account}
                    required
                    maxLength={80}
                    placeholder="例如：小林的创作日记"
                    onChange={(e) => setAccount(e.target.value)}
                  />
                </label>
                <label className="field">
                  内容分类{" "}
                  <input
                    value={category}
                    required
                    maxLength={60}
                    list="categories"
                    onChange={(e) => setCategory(e.target.value)}
                  />
                  <datalist id="categories">
                    <option>知识分享</option>
                    <option>生活记录</option>
                    <option>产品测评</option>
                    <option>剧情故事</option>
                    <option>好物推荐</option>
                  </datalist>
                </label>
                <label className="field">
                  发布平台
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                  >
                    {["抖音", "视频号", "小红书", "快手", "B站", "其他"].map(
                      (p) => (
                        <option key={p}>{p}</option>
                      ),
                    )}
                  </select>
                </label>
                <label className="field">
                  发布时间 <em>*</em>
                  <input
                    type="datetime-local"
                    required
                    value={published}
                    onChange={(e) => setPublished(e.target.value)}
                  />
                </label>
              </div>
              <label className="field">
                逐字稿 / SRT 字幕{" "}
                <span className="optional">可选 · 有字幕，分析更完整</span>
                <textarea
                  rows={7}
                  maxLength={60000}
                  value={transcript}
                  placeholder={
                    "粘贴实际口播文案，或带时间戳的 SRT 字幕…\n\n没有字幕时，系统会明确标注无法判断口播，不会编造原片台词。"
                  }
                  onChange={(e) => setTranscript(e.target.value)}
                />
              </label>
              <div className="tiny">
                {settings?.transcription
                  ? "已配置自动转录；无手动字幕时会尝试识别音频。"
                  : "未配置语音转录，可直接粘贴已有字幕。"}{" "}
                支持最多 60,000 字符。
              </div>
            </section>
          </div>
          <div>
            <section className="panel padded">
              <div className="panel-head compact">
                <h2>
                  <span className="section-number">02</span>运营数据
                </h2>
                <span className="chip">全部选填</span>
              </div>
              <p className="muted intro">
                只填写已知数据，留空即为缺失。不要用 0 代替未知。
              </p>
              <input
                ref={ocrInput}
                type="file"
                hidden
                accept=".png,.jpg,.jpeg,.webp"
                onChange={(e) => {
                  void ocr(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={ocrBusy}
                className="ocr-upload"
                onClick={() => ocrInput.current?.click()}
              >
                {ocrBusy ? (
                  <LoaderCircle className="spin" size={20} />
                ) : (
                  <ScanLine size={20} />
                )}
                <span>
                  <strong>
                    {ocrBusy
                      ? "截图识别中，完成后请核对…"
                      : ocrConfirmed
                        ? "已核对识别结果，可继续编辑"
                        : "上传后台数据截图"}
                    <small>中英文 OCR · 识别后逐项确认 · 最大 10 MB</small>
                  </strong>
                </span>
                <ArrowUpRight size={17} />
              </button>
              {ocrBusy && (
                <button
                  type="button"
                  className="text-action"
                  onClick={() => {
                    ocrGeneration.current++;

                    setOcrBusy(false);
                  }}
                >
                  取消等待，使用手动输入
                </button>
              )}
              <div className="form-grid window-fields">
                <label className="field">
                  统计窗口（发布后小时）
                  <input
                    type="number"
                    min={1}
                    max={8760}
                    required
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                  />
                </label>
                <label className="field">
                  数据记录时间
                  <input
                    type="datetime-local"
                    required
                    value={captured}
                    onChange={(e) => setCaptured(e.target.value)}
                  />
                </label>
              </div>
              <p className="hint">
                请填写截图实际对应的累计时段，如发布后 24
                小时。不同窗口不会进入同一评分基准。
              </p>
              <div className="form-grid metric-fields">
                {metricDefs.map(([key, label, unit]) => (
                  <label className="field" key={key}>
                    {label}
                    <div className="input-unit">
                      <input
                        type="number"
                        min={0}
                        max={unit === "%" ? 100 : undefined}
                        step={unit === "%" || unit === "秒" ? "any" : 1}
                        value={metrics[key] || ""}
                        placeholder="未填写"
                        onChange={(e) =>
                          setMetrics({ ...metrics, [key]: e.target.value })
                        }
                      />
                      <span>{unit}</span>
                    </div>
                  </label>
                ))}
              </div>
            </section>
            <div className="info-box">
              <ShieldCheck size={18} />
              <div>
                <strong>
                  {settings?.aiEnabled
                    ? "已启用多模态 AI 分析"
                    : "未配置 AI，基础功能仍可使用"}
                </strong>
                <p>
                  {settings?.aiEnabled
                    ? `点击分析将发送标题、字幕、指标及最多 ${settings.maxFrames} 张压缩帧到配置的 AI 服务。`
                    : "先生成真实数据报告、查看关键帧。配置 AI 后可重新生成内容分析及优化文案。"}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="form-footer">
          <span>
            {busy
              ? `${uploadMessage || "正在保存"}${uploadPct ? ` · ${uploadPct}%` : ""}`
              : "视频与复盘记录保存在当前浏览器中"}
          </span>
          <div className="button-row">
            <Btn disabled={busy || ocrBusy} onClick={() => void submit(false)}>
              保存，稍后分析
            </Btn>
            <Btn primary type="submit" disabled={busy || ocrBusy}>
              {busy ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Sparkles size={17} />
              )}
              保存并开始复盘
            </Btn>
          </div>
        </div>
      </form>
      {ocrValues && (
        <div className="modal-backdrop">
          <div className="modal wide">
            <div className="panel-head">
              <div>
                <h2>请核对截图识别结果</h2>
                <p>OCR 值尚未保存。空白表示未识别，必须确认后才会填入表单。</p>
              </div>
              <button
                className="icon-btn"
                onClick={() => setOcrValues(null)}
                aria-label="取消 OCR 结果"
              >
                <X />
              </button>
            </div>
            <div className="form-grid metric-fields">
              {metricDefs.map(([k, l, u]) => (
                <label className="field" key={k}>
                  {l}（{u}）
                  <input
                    type="number"
                    min={0}
                    value={ocrValues[k]}
                    placeholder="缺失 / 未识别"
                    onChange={(e) =>
                      setOcrValues({ ...ocrValues, [k]: e.target.value })
                    }
                  />
                </label>
              ))}
            </div>
            <details>
              <summary>查看 OCR 原始文本</summary>
              <pre>{ocrText || "未识别到文字"}</pre>
            </details>
            <p className="hint">
              原表单已有值仅在此处填写了有效数值时替换。也请核对表单中的统计窗口。
            </p>
            <Btn
              primary
              onClick={() => {
                for (const [k, , u] of metricDefs) {
                  const s = ocrValues[k];
                  if (
                    s !== "" &&
                    (!Number.isFinite(Number(s)) ||
                      Number(s) < 0 ||
                      (u === "%" && Number(s) > 100) ||
                      (!["%", "秒"].includes(u) &&
                        !Number.isInteger(Number(s))))
                  ) {
                    notify("请修正无效数值后再确认");
                    return;
                  }
                }
                setMetrics({
                  ...metrics,
                  ...Object.fromEntries(
                    Object.entries(ocrValues).filter(([, v]) => v !== ""),
                  ),
                });
                setOcrValues(null);
                setOcrConfirmed(true);
                notify("识别结果已确认填入，保存视频后才写入数据库");
              }}
            >
              <Check size={17} />
              确认并填入数据
            </Btn>
          </div>
        </div>
      )}
    </>
  );
}

function reportText(v: Video) {
  const r = v.report;
  if (!r) return "";
  return `# ${v.title}\n账号：${v.account} · 统计窗口：${v.windowHours} 小时\n报告类型：${r.mode === "ai" ? "AI 内容复盘（主观参考）" : "数据复盘报告（无 AI 内容判断）"}\n\n${r.ai?.summary || "数据已计算，视频证据已提取。"}\n\n## 数据指标\n${r.metrics.map((m) => `${m.label}：${m.value == null ? "暂无数据" : fmt(m.value) + m.unit}（${m.formula}）`).join("\n")}\n\n## 运营评分\n${r.performance.score ?? "暂无足够基准"}\n${r.performance.reason}\n\n## 优化清单\n${r.ai ? [...r.ai.findings.map((f) => `[${f.priority}] ${f.title}：${f.action}；证据 ${f.evidence_ids.join(", ")}`), ...r.ai.improvement_actions.map((s) => s.text)].join("\n") : r.localActions.join("\n")}\n\n## 新开头\n${r.ai?.suggested_hooks.map((s) => s.text).join("\n") || "未生成"}\n\n## 新标题\n${r.ai?.suggested_titles.map((s) => s.text).join("\n") || "未生成"}\n\n## 口播新稿\n${r.ai?.rewritten_script || "未生成"}\n\n## 下一条计划\n${r.ai ? JSON.stringify(r.ai.next_video_plan, null, 2) : "按相同窗口记录下一条视频"}\n\n## 证据\n${r.evidence.map((e) => `${e.id} ${e.time != null ? time(e.time) : ""} ${e.text}`).join("\n")}\n\n## 限制\n${r.warnings.join("\n")}`;
}
function Report({
  video: v,
  videos,
  settings,
  copy,
  edit,
  run,
  remove,
  back,
  busy,
}: {
  video: Video;
  videos: Video[];
  settings: Settings | null;
  copy: (s: string) => void;
  edit: () => void;
  run: () => void;
  remove: () => void;
  back: () => void;
  busy: boolean;
}) {
  const player = useRef<HTMLVideoElement>(null);
  const [tab, setTab] = useState("diagnosis");
  const [activeEvidence, setActiveEvidence] = useState<string | null>(null);
  const r = v.report;
  const ai = r?.ai;
  const running = ["queued", "processing"].includes(v.status);
  const jump = (seconds: number) => {
    if (player.current) {
      player.current.currentTime = seconds;
      player.current.scrollIntoView({ behavior: "smooth", block: "center" });
      void player.current.play().catch(() => {});
    }
  };
  const showEvidence = (id: string) => {
    setActiveEvidence(id);
    const e = r?.evidence.find((e) => e.id === id);
    if (e?.time != null) jump(e.time);
  };
  const refs = (ids: string[]) => (
    <div className="evidence-refs">
      {ids.map((id) => (
        <button key={id} onClick={() => showEvidence(id)}>
          <FileText size={11} />
          {id}
        </button>
      ))}
    </div>
  );
  const exportReport = () => {
    const blob = new Blob([reportText(v)], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `复盘-${v.title.replace(/[<>:"/\\|?*]/g, "_")}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const evidence = r?.evidence.find((e) => e.id === activeEvidence);
  const perf = performance(v, videos);
  return (
    <>
      <div className="page-head report-head">
        <div className="heading">
          <button className="text-action muted" onClick={back}>
            <ArrowLeft size={15} />
            视频复盘库
          </button>
          <h1>{v.title}</h1>
          <p>
            {v.account} <span> / </span>
            {v.category} <span> / </span>
            {v.platform} <span> / </span>
            {new Date(v.publishedAt).toLocaleString("zh-CN")}
          </p>
        </div>
        <div className="button-row">
          <Btn disabled={running || busy} onClick={edit}>
            编辑数据
          </Btn>
          <Btn primary disabled={running || busy} onClick={run}>
            {running ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <Sparkles size={16} />
            )}{" "}
            {r ? "重新复盘" : "开始复盘"}
          </Btn>
          <button
            className="icon-btn danger"
            title="删除视频及文件"
            disabled={running}
            onClick={remove}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      {!settings?.workerOnline && (
        <div className="alert">
          浏览器存储不可用，请检查隐私设置后刷新重试。
        </div>
      )}
      {running && (
        <div className="progress-panel panel">
          <div>
            <LoaderCircle size={20} className="spin purple-text" />
            <strong>{v.stage}</strong>
            <span>{v.progress}%</span>
          </div>
          <div className="progress-bar">
            <i style={{ width: `${v.progress}%` }} />
          </div>
          <p>
            关键帧已提取 → 数据计算 → AI 证据分析 → 报告生成。分析请求最长 65
            秒，请保持网页连接。失败后数据仍会保留，可重新尝试。
          </p>
        </div>
      )}
      {v.error && (
        <div className="alert error">
          <strong>分析未完成</strong>
          <p>{v.error}</p>
          <Btn onClick={run} disabled={busy}>
            重新尝试
          </Btn>
          <span>已上传的视频与运营数据仍已保存。</span>
        </div>
      )}
      <div className="report-grid">
        <section className="panel player-panel">
          <div className="panel-head">
            <h2>
              <VideoIcon size={17} />
              原始视频
            </h2>
            <Badge video={v} />
          </div>
          <StoredVideo
            ref={player}
            controls
            playsInline
            preload="metadata"
            videoId={v.id}
            file={v.videoFile}
            posterFile={v.coverFile}
          />
          <div className="video-meta">
            <span>{v.duration ? time(v.duration) : "待解析"}</span>
            <span>{v.width ? `${v.width} × ${v.height}` : "分辨率待解析"}</span>
            <span>{v.fps ? `${fmt(v.fps, 2)} fps` : ""}</span>
          </div>
          <div className="frame-title">
            <h3>关键帧证据</h3>
            <small>点击跳转原片</small>
          </div>
          <div className="frames">
            {v.frames.length ? (
              v.frames.map((f) => (
                <button key={f.file} onClick={() => jump(f.time)}>
                  <StoredImage
                    videoId={v.id}
                    file={f.file}
                    alt={`${time(f.time)} 的视频帧`}
                  />
                  <span>{time(f.time)}</span>
                </button>
              ))
            ) : (
              <p className="muted">导入时由浏览器提取真实视频帧。</p>
            )}
          </div>
          <div className="video-caption">
            <FileText size={15} />
            <span>
              {v.transcript
                ? `${v.transcript.length} 字字幕已录入`
                : "没有字幕 · 不对口播作判断"}
            </span>
          </div>
          <details className="transcript">
            <summary>查看实际字幕</summary>
            <pre>{v.transcript || "未提供字幕或转录文本"}</pre>
          </details>
        </section>
        <section className="panel summary-panel">
          <div className="panel-head">
            <h2>
              <Sparkles size={18} className="purple-text" />
              复盘概览
            </h2>
            <span className="chip">
              {r?.mode === "ai" ? "AI 内容复盘" : "数据复盘报告"}
            </span>
          </div>
          {r ? (
            <>
              <p className="summary-text">
                {ai?.summary ||
                  "视频资料与运营数据已整理完成。以下指标由程序计算；未启用 AI，因此不生成内容质量评分或伪装成分析结论的文案。你可以查看真实关键帧、检查录入数据，并在配置 AI 后重新复盘。"}
              </p>
              <div className="score-pair">
                <div>
                  <small>内容参考评分</small>
                  <strong>
                    {ai && ai.content_scores.every((s) => s.score !== null)
                      ? ai.content_scores.reduce(
                          (sum, s) => sum + (s.score || 0),
                          0,
                        )
                      : "—"}
                    <em>/ 100</em>
                  </strong>
                  <span>
                    {ai ? "AI 主观评价 · 非客观效果" : "未进行 AI 内容分析"}
                  </span>
                </div>
                <div>
                  <small>运营表现评分</small>
                  <strong>
                    {perf.score ?? "—"}
                    <em>/ 100</em>
                  </strong>
                  <span>
                    {perf.score === null
                      ? "暂无足够基准"
                      : `相对历史百分位 · ${perf.sampleCount} 个样本`}
                  </span>
                </div>
              </div>
              <div className="summary-bottom">
                <span className="live-dot" />
                证据 {r.evidence.length} 项
                <span>
                  {ai ? `判断信心：${ai.confidence}` : "判断信心：不适用"}
                </span>
              </div>
              <div className="notice">
                <ShieldCheck size={17} />
                <span>缺失的证据不会被补写，可能原因不会被当作确定结论。</span>
              </div>
              <div className="button-row">
                <Btn onClick={() => copy(reportText(v))}>
                  <Copy size={15} />
                  复制完整报告
                </Btn>
                <Btn onClick={exportReport}>
                  <Download size={15} />
                  导出报告
                </Btn>
              </div>
            </>
          ) : (
            <Empty
              title={running ? "正在建立证据链" : "视频已保存，随时开始"}
              description={
                running
                  ? "分析结果会自动出现在这里，无需刷新。"
                  : "点击开始复盘，提取关键帧并计算运营指标。"
              }
            />
          )}
        </section>
      </div>
      <div className="tabs">
        {[
          ["diagnosis", "问题与诊断"],
          ["metrics", "数据与评分"],
          ["actions", "优化工作台"],
          ["evidence", "证据与限制"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "diagnosis" && (
        <div className="diagnosis-grid">
          {ai ? (
            ai.findings.map((f, i) => (
              <section className="panel finding" key={i}>
                <div className="panel-head">
                  <span className={`priority p-${f.priority}`}>
                    {f.priority}优先级
                  </span>
                  <span className="tiny">{f.kind}</span>
                </div>
                <h3>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  {f.title}
                </h3>
                <p>{f.explanation}</p>
                {refs(f.evidence_ids)}
                <div className="action-box">
                  <Target size={16} />
                  <p>{f.action}</p>
                </div>
                {f.time !== null && (
                  <button className="text-action" onClick={() => jump(f.time!)}>
                    查看 {time(f.time)} 的真实画面 <ArrowUpRight size={14} />
                  </button>
                )}
                <button className="copy-link" onClick={() => copy(f.action)}>
                  <Copy size={13} />
                  复制建议
                </button>
              </section>
            ))
          ) : (
            <section className="panel padded full-width">
              <h2>当前可以确认的事实</h2>
              <p className="muted">
                {v.frames.length} 张真实采样帧 ·{" "}
                {Object.values(v.metrics).filter((x) => x != null).length}{" "}
                项原始指标 · {v.transcript ? "已提供字幕" : "暂无字幕"}
              </p>
              <div className="notice">
                {r
                  ? "本次为数据复盘报告。内容诊断需在设置中配置支持图像的 AI 服务，再重新复盘。"
                  : "复盘尚未完成，当前仅展示已保存资料。"}
              </div>
              {r?.localActions.map((a, i) => (
                <div className="check-row" key={a}>
                  <span>{i + 1}</span>
                  <p>{a}</p>
                  <button
                    className="icon-btn"
                    onClick={() => copy(a)}
                    title="复制建议"
                  >
                    <Copy size={15} />
                  </button>
                </div>
              ))}
            </section>
          )}
        </div>
      )}
      {tab === "metrics" && (
        <>
          <div className="section-heading">
            <h2>真实运营数据</h2>
            <span className="tiny">
              发布后 {v.windowHours} 小时 · 记录于{" "}
              {new Date(v.capturedAt).toLocaleString("zh-CN")}
            </span>
          </div>
          <div className="metric-cards">
            {derive(v.metrics).map((m) => (
              <div className="panel metric-card" key={m.key}>
                <small>{m.label}</small>
                <strong>
                  {m.value === null ? "—" : fmt(m.value)}
                  <em>{m.value === null ? "" : m.unit}</em>
                </strong>
                <span>{m.formula}</span>
              </div>
            ))}
          </div>
          <section className="panel padded">
            <h2>评分透明说明</h2>
            <p className="muted">{perf.reason}</p>
            {perf.dimensions.length > 0 && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>指标</th>
                      <th>本条</th>
                      <th>历史中位数</th>
                      <th>百分位得分</th>
                      <th>有效样本</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perf.dimensions.map((d) => (
                      <tr key={d.key}>
                        <td>{d.label}</td>
                        <td>{fmt(d.value)}%</td>
                        <td>{fmt(d.median)}%</td>
                        <td>{d.score}</td>
                        <td>{d.samples}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="hint">
              内容评分由 AI 主观给出：5 个维度各 20
              分，缺任何一项时不汇总。0–5：明显缺陷；6–10：基础呈现；11–15：清晰有效；16–20：证据充分且突出。稀疏帧无法证明连续剪辑和听觉效果。
            </p>
            {ai?.content_scores.map((s) => (
              <div className="score-dimension" key={s.dimension}>
                <div>
                  <h3>{s.dimension}</h3>
                  <strong>
                    {s.score ?? "无法判断"}
                    {s.score !== null && <small> / 20</small>}
                  </strong>
                </div>
                <p>{s.reason}</p>
                {refs(s.evidence_ids)}
                <p className="mint-text">改进方向：{s.improvement}</p>
              </div>
            ))}
          </section>
        </>
      )}
      {tab === "actions" &&
        (ai ? (
          <div className="actions-grid">
            <section className="panel padded">
              <div className="panel-head">
                <h2>3 种开头，重新抓住注意力</h2>
                <Zap size={18} className="purple-text" />
              </div>
              {ai.suggested_hooks.map((s, i) => (
                <div className="suggestion" key={i}>
                  <span className="tiny">HOOK 0{i + 1} · 新创意，待验证</span>
                  <p>{s.text}</p>
                  {refs(s.evidence_ids)}
                  <button className="copy-link" onClick={() => copy(s.text)}>
                    <Copy size={13} />
                    复制开头
                  </button>
                </div>
              ))}
            </section>
            <section className="panel padded">
              <h2>5 个可以直接使用的新标题</h2>
              {ai.suggested_titles.map((s, i) => (
                <div className="title-option" key={i}>
                  <b>0{i + 1}</b>
                  <div>
                    <p>{s.text}</p>
                    {refs(s.evidence_ids)}
                  </div>
                  <button
                    className="icon-btn"
                    title="复制标题"
                    onClick={() => copy(s.text)}
                  >
                    <Copy size={15} />
                  </button>
                </div>
              ))}
            </section>
            <section className="panel padded">
              <div className="panel-head">
                <h2>修改版口播文案</h2>
                <button
                  className="copy-link"
                  onClick={() => copy(ai.rewritten_script)}
                >
                  <Copy size={13} />
                  复制文案
                </button>
              </div>
              <p className="hint">
                AI 生成的创作草案，发布前请核实其中的事实和承诺。
              </p>
              <div className="script">{ai.rewritten_script}</div>
            </section>
            <section className="panel padded">
              <h2>剪辑与执行清单</h2>
              {ai.improvement_actions.map((s, i) => (
                <div className="check-row" key={i}>
                  <span>{i + 1}</span>
                  <div>
                    <p>{s.text}</p>
                    {refs(s.evidence_ids)}
                  </div>
                  <button
                    className="icon-btn"
                    title="复制执行项"
                    onClick={() => copy(s.text)}
                  >
                    <Copy size={15} />
                  </button>
                </div>
              ))}
              <button
                className="text-action"
                onClick={() =>
                  copy(
                    ai.improvement_actions
                      .map((s, i) => `${i + 1}. ${s.text}`)
                      .join("\n"),
                  )
                }
              >
                复制完整清单 <Copy size={14} />
              </button>
            </section>
            <section className="panel padded full-width next-plan">
              <div>
                <span className="eyebrow">NEXT VIDEO</span>
                <h2>把这次复盘，变成下一条创作</h2>
                <p>{ai.next_video_plan.topic}</p>
                <p className="muted">实验设计：{ai.next_video_plan.test}</p>
              </div>
              <div>
                <h3>重点观察</h3>
                {ai.next_video_plan.observe.map((s) => (
                  <span className="chip" key={s}>
                    {s}
                  </span>
                ))}
                <button
                  className="text-action"
                  onClick={() =>
                    copy(
                      `${ai.next_video_plan.topic}\n${ai.next_video_plan.test}\n${ai.next_video_plan.observe.join("、")}`,
                    )
                  }
                >
                  复制下一条计划 <Copy size={14} />
                </button>
              </div>
            </section>
          </div>
        ) : (
          <section className="panel">
            <Empty
              title="AI 优化文案尚未生成"
              description="配置支持图像输入的 AI 服务后，重新复盘即可生成有证据引用的新开头、标题、口播和剪辑建议。"
            />
          </section>
        ))}
      {tab === "evidence" && (
        <section className="panel padded">
          <h2>证据与分析边界</h2>
          {r?.warnings.map((w, i) => (
            <div className="notice" key={i}>
              {w}
            </div>
          ))}
          <p className="hint">
            AI
            的证据引用已经过结构和来源校验，但引用存在不代表推理一定正确。请结合原片复核。稀疏采样无法覆盖每个镜头，历史相关性不代表因果。
          </p>
          <div className="evidence-list">
            {r?.evidence.map((e) => (
              <button key={e.id} onClick={() => showEvidence(e.id)}>
                <span>{e.id}</span>
                <p>{e.text}</p>
                {e.time != null && <b>{time(e.time)}</b>}
              </button>
            ))}
          </div>
          <p className="tiny">
            生成时间：
            {r ? new Date(r.generatedAt).toLocaleString("zh-CN") : "尚未生成"} ·
            模型：{r?.model || "未使用 AI"}
          </p>
        </section>
      )}
      {evidence && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="panel-head">
              <h2>证据：{evidence.id}</h2>
              <button
                className="icon-btn"
                onClick={() => setActiveEvidence(null)}
                aria-label="关闭证据"
              >
                <X />
              </button>
            </div>
            {evidence.file && (
              <StoredImage
                className="evidence-image"
                videoId={v.id}
                file={evidence.file}
                alt="引用的真实关键帧"
              />
            )}
            <p className="script">{evidence.text}</p>
            {evidence.time != null && (
              <Btn
                onClick={() => {
                  jump(evidence.time!);
                  setActiveEvidence(null);
                }}
              >
                播放 {time(evidence.time)} 原片
              </Btn>
            )}
          </div>
        </div>
      )}
    </>
  );
}
function Compare({
  videos,
  checked,
  toggle,
  open,
}: {
  videos: Video[];
  checked: string[];
  toggle: (id: string) => void;
  open: (id: string) => void;
}) {
  const selected = videos.filter((v) => checked.includes(v.id));
  const defs = [
    ["plays", "播放量"],
    ["completion", "完播率"],
    ["retention3", "3 秒留存率"],
    ["retention5", "5 秒留存率"],
    ["likesRate", "点赞率"],
    ["commentsRate", "评论率"],
    ["savesRate", "收藏率"],
    ["followersRate", "转粉率"],
  ];
  const same =
    selected.length >= 2 &&
    selected.every(
      (v) =>
        v.account === selected[0].account &&
        v.platform === selected[0].platform &&
        v.windowHours === selected[0].windowHours &&
        v.category === selected[0].category,
    );
  const winner = [...selected]
    .filter((v) => v.metrics.plays != null)
    .sort((a, b) => b.metrics.plays! - a.metrics.plays!)[0];
  return (
    <>
      <div className="page-head">
        <div className="heading">
          <div className="eyebrow">SIDE BY SIDE</div>
          <h1>并排看见，内容之间的差异</h1>
          <p>选择 2–5 条历史视频，比较真实指标与内容特征。</p>
        </div>
        <span className="chip">已选 {selected.length} / 5</span>
      </div>
      <div className="compare-picker panel">
        {videos.length ? (
          videos.map((v) => (
            <label key={v.id}>
              <input
                type="checkbox"
                checked={checked.includes(v.id)}
                onChange={() => toggle(v.id)}
              />
              <span>
                {v.title}
                <small>
                  {v.account} · {v.windowHours} 小时
                </small>
              </span>
            </label>
          ))
        ) : (
          <Empty
            title="先积累两条视频"
            description="上传并保存视频后，就能在这里比较。"
          />
        )}
      </div>
      {selected.length >= 2 ? (
        <>
          <div className="notice">
            {same
              ? "已选择相同账号、平台、分类和统计窗口的视频。"
              : "当前视频的账号、平台、分类或统计窗口不同，比较结果存在明显局限。"}
            发布时间、分发体量、受众与外部环境也可能影响表现，不能据此认定创作方式导致了增长。
          </div>
          <section className="panel table-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th>对比维度</th>
                  {selected.map((v) => (
                    <th key={v.id}>
                      <button
                        className="text-action"
                        onClick={() => open(v.id)}
                      >
                        {v.title}
                        <ArrowUpRight size={13} />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {defs.map(([key, label]) => (
                  <tr key={key}>
                    <td>
                      {label}
                      {key.endsWith("Rate") && <small>分母：播放量</small>}
                    </td>
                    {selected.map((v) => {
                      const m = derive(v.metrics).find((m) => m.key === key)!;
                      return (
                        <td key={v.id} className="number">
                          {m.value === null
                            ? "暂无数据"
                            : `${fmt(m.value)}${m.unit}`}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {[
                  ["内容分类", (v: Video) => v.category],
                  [
                    "视频时长",
                    (v: Video) => (v.duration ? time(v.duration) : "待解析"),
                  ],
                  [
                    "开头结构",
                    (v: Video) => v.report?.ai?.features.hook || "无法判断",
                  ],
                  [
                    "文案结构",
                    (v: Video) =>
                      v.report?.ai?.features.structure || "无法判断",
                  ],
                  [
                    "标题风格",
                    (v: Video) =>
                      v.report?.ai?.features.title_style || "无法判断",
                  ],
                  ["统计窗口", (v: Video) => `${v.windowHours} 小时`],
                ].map(([label, get]) => (
                  <tr key={String(label)}>
                    <td>{String(label)}</td>
                    {selected.map((v) => (
                      <td key={v.id}>{(get as (v: Video) => string)(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="panel padded">
            <h2>可观察的差异</h2>
            <p>
              {winner
                ? `所选视频中，「${winner.title}」录入的播放量最高（${fmt(winner.metrics.plays, 0)} 次）。`
                : "缺少播放数据，暂时无法排序。"}
            </p>
            <p className="muted">
              {same
                ? "可结合上表观察开头、时长和文案结构的差异，并在下一条中只改变一个变量。"
                : "当前不生成跨窗口的共同特征结论，请先选择可比记录。"}{" "}
              小样本中的共同点只能作为下一轮实验假设，不能称为已经验证的爆款方法。
            </p>
            {same &&
              selected.length >= 3 &&
              (() => {
                const top = [...selected]
                  .filter((v) => v.metrics.plays != null)
                  .sort((a, b) => b.metrics.plays! - a.metrics.plays!)
                  .slice(0, 2);
                if (top.length < 2) return null;
                const hook = top[0].report?.ai?.features.hook;
                const shared =
                  hook &&
                  hook !== "无法判断" &&
                  hook === top[1].report?.ai?.features.hook;
                return (
                  <p>
                    播放量最高的两条内容
                    {shared
                      ? `都被 AI 标注为「${hook}」开头。这是候选相关特征，尚待更多样本验证。`
                      : "暂未出现可直接确认的相同开头标签；可回看原片人工比较。"}
                  </p>
                );
              })()}
          </section>
        </>
      ) : (
        <section className="panel">
          <Empty
            title="选择至少两条视频，开始对比"
            description="所有比率由程序计算，分母为零或缺失时显示暂无数据。"
          />
        </section>
      )}
    </>
  );
}
function Insights({
  videos,
  open,
}: {
  videos: Video[];
  open: (id: string) => void;
}) {
  const accounts = [...new Set(videos.map((v) => v.account))];
  const [account, setAccount] = useState("");
  const items = videos.filter((v) => !account || v.account === account);
  const groups = accountInsights(items);
  return (
    <>
      <div className="page-head">
        <div className="heading">
          <div className="eyebrow">ACCOUNT MEMORY</div>
          <h1>让经验积累，成为创作优势</h1>
          <p>按真实历史记录形成账号画像，每一次新复盘都会参考可比的过去。</p>
        </div>
        <select
          aria-label="账号洞察筛选"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
        >
          <option value="">全部账号</option>
          {accounts.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </div>
      <section className="panel trend-panel">
        <div className="panel-head">
          <h2>账号内容播放趋势</h2>
          <span className="tiny">原始记录 · 不同窗口可能不可比</span>
        </div>
        <Chart videos={items} />
      </section>
      <div className="section-heading">
        <h2>账号内容记忆</h2>
        <span className="tiny">账号 × 平台 × 分类 × 统计窗口</span>
      </div>
      {groups.length ? (
        <div className="insight-grid">
          {groups.map((g, i) => (
            <section key={i} className="panel padded">
              <div className="panel-head">
                <div>
                  <h2>{g.account}</h2>
                  <p>
                    {g.platform} · {g.category} · 发布后 {g.windowHours} 小时
                  </p>
                </div>
                <span className="chip">{g.count} 条样本</span>
              </div>
              <div className="insight-stat">
                <strong>{fmt(g.medianPlays, 0)}</strong>
                <span>播放量中位数</span>
              </div>
              <h3>历史播放量靠前的内容</h3>
              {g.top.map((v) => (
                <button
                  className="insight-video"
                  key={v.id}
                  onClick={() => open(v.id)}
                >
                  <div>
                    <b>{v.title}</b>
                    <small>
                      {v.duration ? time(v.duration) : "时长待解析"} · 开头：
                      {v.hook}
                    </small>
                    <small>文案结构：{v.structure}</small>
                  </div>
                  <span>
                    {compact(v.plays ?? 0)} <ArrowUpRight size={14} />
                  </span>
                </button>
              ))}
              {Object.entries(g.recurring).filter(([, n]) => n > 1).length >
                0 && (
                <>
                  <h3>重复出现的诊断标签</h3>
                  {Object.entries(g.recurring)
                    .filter(([, n]) => n > 1)
                    .map(([t, n]) => (
                      <span className="chip" key={t}>
                        {t} · {n} 次
                      </span>
                    ))}
                </>
              )}
              <p className="hint">
                {g.count < 5
                  ? "样本不足 5 条，暂不判断最优时长或稳定偏好。"
                  : "高播放内容的时长与开头仅作为观察线索，尚未通过控制实验验证。"}{" "}
                暂无因果证据可确认的有效优化方式。
              </p>
            </section>
          ))}
        </div>
      ) : (
        <section className="panel">
          <Empty
            title="账号记忆，会随着创作一起成长"
            description="保存真实视频与运营数据后，在这里查看分类表现、历史内容特征与重复问题。"
          />
        </section>
      )}
      <div className="notice">
        <Database size={17} />
        记忆基于本地历史记录实时汇总。新报告仅参考相同账号、平台、分类、统计窗口中更早的最多
        30 条记录。
      </div>
    </>
  );
}
function SettingsView(_props: {
  settings: Settings | null;
  copy: (text: string) => void;
}) {
  return <BrowserSettings />;
}
