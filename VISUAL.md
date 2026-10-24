# Data Bloom 视觉素材

日期：2026-10-24。用户提供 `dataflower.mp4` 作为风格参考，并确认了静态首页预览，授权修改与公开部署。

`public/assets/data-bloom.webp` 使用内置 image_gen 生成，再编码为 WebP 以供网页使用；不是用户参考视频或完整网页截图。图片无文字、Logo、工具入口或操作控件，实际界面由 HTML/CSS 渲染。没有调用用户 API 密钥。图像保留橙红矩形像素花朵、暗红流动碎片和黑色留白；CSS 添加轻微呼吸效果，访客可以暂停。

生成参考：已确认的首页概念图。生成方式：内置 image_gen，非 CLI。

最终提示词：

> Create ONLY a clean website hero BACKGROUND ART asset, derived from the exact orange-red pixel data flower in the reference image. The reference is a previously approved website mockup: ignore and REMOVE all its UI, every text, typography, cards, buttons, lines, icons, logo and numbers. We need the artwork alone so a real HTML interface can be laid over it. Landscape 16:9 high resolution. Pure jet black background #030303. A very large luminous abstract flower made entirely of a dense matrix of narrow vertical rectangular LED cells / pixel grid, in glowing ember orange, rich dark red, burnt orange and pale butter-cream highlights. Bloom centered around 73% across / 46% down, occupying almost the full right half. Its orange-red wisps and flowing horizontal fragments extend toward the left across the middle, fading to dark black. Keep the upper-left and lower-left substantially black with minimal dark-red details so white text will be readable. Bottommost 15 percent fades seamlessly to pure black. The shape should match the approved reference, like a sculptural organic red dahlia / chrysanthemum translated into data, with cream angular petals at top/right, rich shadowy red center, fragmented pixel ribbons. Crisp small individual vertical LED cells with thin dark separators, extremely tactile luminous digital texture, no smooth photo petals, no regular rainbow color, no blue or teal. High contrast, moody, sophisticated digital-art gallery quality. No words, no lettering, no watermark, no outline of a webpage. This is a new reusable hero background asset, not a screenshot.

# 验证

- 构建成功，现有 17 项测试通过。
- 本地预览桌面 1280 与手机 390 宽均无横向溢出。
- 首页实际显示七个入口，保留同时新增的 AI 视频复盘官；开始创作跳转到工具区，动效按钮可暂停。
- 从首页进入商单，生成 22 条示例要求和 3 个待确认事项，可返回首页。
- 雷达显示 2026-10-24 当天 TOP 50；核心新闻及联网搜索实现保持原样。
