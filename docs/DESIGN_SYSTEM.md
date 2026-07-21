# ybq.me 设计系统与结构知识库

> 版本：2026-07 高级感最终版（commit 978976a，Gary 已确认为最终版）
> 适用范围：ybq.me 全站样式、首页改版、新栏目设计。改动样式前先读本文件。

---

## 1. 设计原则：高级感来自哪里

1. **动效克制是底线**。全站只用三类动效：滚动入场淡入（`.reveal`）、hero 数字 count-up、导航毛玻璃。**禁止** loading spinner、无意义 marquee、hover scale-105 这类滥竽充数的动效。
2. **用留白、字重、分隔线做层次，不要卡片套卡片**。卡片只允许出现在真正的列表项上（模型卡、top10 卡、工具箱卡），区块之间靠 `.home-band` 背景分区和大留白区分。
3. **中文永远不用 italic**；加粗靠字重（700/800），不靠斜体。
4. **双宽度策略（核心决策）**：展示页宽——首页/栏目列表页 `min(1280px, 92vw)`；阅读页窄——文章正文保持 720px 阅读宽度，**绝不动**。实现方式是 `body.list` 选择器：列表页 body 有 `.list` class，文章页没有，CSS 只作用于 `body.list`。
5. **hero 主标题不用 emoji**；栏目图标（🧠🤖🎯📅）可以保留在导航、栏目卡、tag 上。
6. **字体栈保留系统中文**：`-apple-system, PingFang SC, Microsoft YaHei` 等，不引外部字体。

---

## 2. 配色与字体

### 配色（以 `assets/css/extended/custom.css` 实际值为准）

| 角色 | 值 | 用途 |
|------|-----|------|
| 暖金主色 | `#C89F65`（#c9a227 系） | 强调字、统计数字、eyebrow、CTA、进度条 |
| 深蓝主色 | `#1E3A5F` | 实心按钮、深色分区带、mchip 激活态 |
| 深蓝渐变 | `#16223a → #1E3A5F → #234468` | `.band--dark`、星图横幅 |
| 浅蓝点缀 | `#7fb3c8` | 星图 SVG 节点 |
| 米白 | `#FAF9F6` | 深色底上的文字 |
| PaperMod 变量 | `--theme / --entry / --primary / --secondary / --border / --code-bg` | 明暗主题自动切换，新组件优先用变量 |

暖灰分区带 = `linear-gradient(rgba(200,159,101,.07)…) + var(--code-bg)`，深色模式下自动变暗，不需要单独写暗色值。

### 流式排版（clamp）

- hero 主标题：`clamp(26px, 4.4vw, 48px)`
- 分区标题 `.band-title`：`clamp(20px, 2.6vw, 28px)`
- 列表页 H1：`clamp(26px, 3.4vw, 40px)`
- 统计数字：`clamp(22px, 2.4vw, 30px)` + `font-variant-numeric: tabular-nums`
- 栅格间距：`clamp(12px, 1.4vw, 18px)` 等

### 断点（折叠屏适配）

| 宽度 | 场景 | 要求 |
|------|------|------|
| 374px | 折叠屏合起 | 无横向滚动（`html,body{overflow-x:clip}`），hero 内边距收紧、按钮变小 |
| 768px | 手机/小平板 | top10 横滑、recent 单列、models 双列 |
| 1280px | 桌面 | 主容器满宽，栅格 4-5 列 |
| 1812px | 折叠屏展开 | 容器封顶 1280，两侧留白 |

---

## 3. 核心组件清单

| 组件 | CSS class | 位置 | 要点 |
|------|-----------|------|------|
| Hero | `.hero` `.hero-title` `.hero-accent` `.hero-stats` | `content/_index.md` + custom.css「2025 升级」块 | 伪元素淡网格（`::before`，mask 渐隐）+ 星光 twinkle（`::after`，`heroTwinkle` 5.5s 动画），纯 CSS 零 JS 零 canvas |
| Count-up 统计 | `.hero-stat-num[data-count]` | 同上 + extend_footer.html | HTML 里写真实数字做无 JS 兜底；JS 进入视口后 0→目标值，1.2s 三次缓出 |
| 滚动入场 | `.reveal` → `.in` | `layouts/partials/extend_footer.html` | IntersectionObserver，threshold 0.12，淡入 + translateY(16px)，触发一次即 unobserve |
| 分区带 | `.home-band` `.band--plain` `.band--warm` `.band--dark` | custom.css | 全出血：`margin-inline: calc(50% - 50vw)` + `padding-inline: calc(50vw - 50%)`，白/暖灰/深蓝交替形成翻页节奏 |
| 毛玻璃导航 | `.header` `.header.scrolled` | custom.css + extend_footer.html | sticky + `backdrop-filter: blur(14px)` + `color-mix` 半透明，滚动 >8px 加细分隔线；提供 color-mix 与 backdrop-filter 双重降级 |
| 星图横幅 | `.starmap-banner`（`.slim` 变体） | custom.css | 首页入口只用静态 SVG 迷你预览，**不嵌入完整星图**，保首屏性能 |
| 文章正文 | `.post-content` | custom.css 开头 | 720px 居中、1.85 行高、两端对齐——**标杆样式，勿动** |

### `prefers-reduced-motion` 降级约定

任何新动效必须同时满足：① `@media (prefers-reduced-motion: reduce)` 里关掉 CSS 动画/过渡；② JS 里 `matchMedia('(prefers-reduced-motion: reduce)')` 判断后走静态路径（数字直接显示终值，`.reveal` 直接加 `.in`）。

---

## 4. 站点结构地图

| 路径 | 内容 | 样式注意 |
|------|------|---------|
| `/` | 首页：hero → 镇站十篇 → 星图横幅 → 四个工具箱（深色带）→ 分类 → 最近在更新 → 联系 | `content/_index.md`，六个 `.home-band` 分区 |
| `/models/` | 100 个思维模型，筛选 chips + 搜索 + 四列卡片 | 自定义模板 `layouts/models/list.html` |
| `/models/NNN-*/` | 模型正文 | 720px，勿动 |
| `/graph/` | 思维模型星图（100 节点 + 353 边，阻尼拖动物理） | **全站最强视觉资产，勿破坏**；独立页面 |
| `/ai-learning/` `/insights/` `/daily/` | 三个栏目 | 标准 PaperMod 列表 |
| `/search/` | 关键词 + AI 问答双模式 | extend_head.html 内联脚本 |
| 评论区 | giscus | `layouts/partials/comments.html`，**配置勿动** |
| AI 助手 | 右下悬浮对话 | extend_footer.html，接 Cloudflare Worker |

---

## 5. 质量标杆

- **015 马斯洛需求层次理论、072 杠杆原理** 是 Gary 认可的文章排版标杆。新文章的封面、行文节奏、信息图密度向它们看齐。
- 全站 E2E 体检脚本 `scripts/e2e_check.js`（最近一次 39/39 通过），大改后跑一遍。

## 6. 反面清单（升级前的问题，禁止回退）

- ❌ 首页被 PaperMod 默认 720px 束缚，大片留白浪费宽屏
- ❌ 零动效、一白到底，没有翻页节奏
- ❌ hero 只有小标题 + 按钮，没有统计数字、没有星图入口
- ❌ 导航随滚动消失，无毛玻璃
- ❌ 标题固定 px，折叠屏上比例失调

## 7. 验收清单（每次改样式后必查）

页面：
- [ ] `/` 首页（hero、六个分区带、count-up 触发）
- [ ] `/models/` 列表页（1280 宽度、筛选可用）
- [ ] `/models/072-杠杆原理/`（正文仍为 720px，排版无变化）
- [ ] `/graph/`（星图可拖动、可点击）
- [ ] 深色模式切换一次（分区带、毛玻璃、hero 网格都要看）

断点：374 / 768 / 1280 / 1812，全部无横向滚动、无文字溢出。

构建：`hugo --gc --minify` 无 ERROR；`hugo server` 自查后**必须停掉**。

脱敏：`grep -rE '源秉谦|Gary Yuen|白云电气|威廉士' content/ layouts/ assets/` 无匹配。
