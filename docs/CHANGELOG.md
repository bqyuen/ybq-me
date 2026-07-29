# ybq.me 更新日志

> 每次部署线上时同步更新。记录「改了什么 + 为什么改 + 谁做的」。
> 格式：日期 · 部署时间 · 变更摘要 · 操作者

---

## 2026-07-29

### 13:13 部署（WorkBuddy · commit `9fc161f` · wrangler deploy · Pages token `cfut_***7751`）

AI 助手面板高度微调（三档各+60px）。

| 变更 | 说明 |
|------|------|
| S 档高度 | 640px → **700px** |
| M 档高度 | 720px → **780px** |
| L 档高度 | 800px → **860px** |
| 中屏 L 档 | 750px → **810px** |

---

### 11:38 部署（WorkBuddy · commit `7b293b1` · wrangler deploy）

AI 助手面板三档尺寸调节（S/M/L）+ CHANGELOG 更新日志机制。

| 变更 | 说明 |
|------|------|
| AI 助手 S/M/L 尺寸按钮 | 面板 header 新增三档切换：S=400×640（手机）、M=560×720（iPad）、L=720×800（电脑） |
| 尺寸记忆 | localStorage 记住用户选择，下次打开自动恢复 |
| 移动端适配 | <600px 隐藏按钮、强制全宽；601-1024px 大档自动收窄 |
| docs/CHANGELOG.md | 新增更新日志文件，记录每次部署的变更摘要 |

---

### 01:06 部署（Kimi Code · direct upload）

**AI 功能全面上线**——Cloudflare Worker 后端 + 12 个前端 AI 组件。

| 变更 | 说明 |
|------|------|
| Cloudflare Worker `ybq-me-ai` | MiniMax M3 驱动，支持问答/摘要/案例/测验/推荐/token追踪 |
| 12 个 AI 组件 | ai-case-study / ai-article-qa / ai-article-summary / ai-quiz / ai-related-content / ai-daily-model / ai-inline-annotations / ai-cosmos / ai-alive-effects / ai-particles / ai-micro-interactions / extend_post_content |
| AI 模型对比页 | `/compare/` — 选两个模型，AI 分析异同 |
| 多 Agent 协同治理文章 | `/ai-learning/multi-agent-governance/` — 5000 文件知识库的多 Agent 管理实战 |
| About 页 AI 能量消耗 | 实时显示 MiniMax M3 token 消耗（24h 柱状图 + 7日历史） |
| 星图数据扩展 | graph.json +2514 行，100 模型关联图大幅扩展 |
| 搜索增强 | `layouts/_default/search.html` 接入 AI 搜索 |
| 导航栏新增 | ⚖️ 对比 入口（hugo.toml menu） |

**⚠️ 注意**：本次部署未 commit 到 git，本地工作区有未提交改动。

---

### 23:57 / 23:27 / 17:04 / 16:55 部署（Kimi Code · direct upload）

07-28 当天的迭代部署，逐步完善上述功能。

---

## 2026-07-23

### 01:05 commit `149e85b`（WorkBuddy）

视觉升级：封面 2x 高清 + 两篇文章内文插图（全图/因果链/对比/杠杆）+ SOP 视觉规范与案例区。

### 00:48 commit `162e801`

决策洞察 · 善良没有力量，就是猎物（Plaud 笔记博客版 · B 模式 v1.1 首单）。

### 00:45 commit `690e09b`

SOP v1.1：编号仲裁 + 量化门槛 + 质量门禁 + 内容断言验证；封面脚本参数化。

### 00:23 commit `29ee4b3`

修复稳定币文章：封面改用浅色背景（对齐 Kimi 风格 1620x919 RGBA）+ 正文添加插图。

### 00:16 commit `4f3994d`

docs: 新增 Plaud→ybq.me 发布 SOP。

---

## 2026-07-22

### commit `327664b`

决策洞察新增：稳定币美元霸权（Plaud 笔记扩写 · 美元体系姊妹篇 + 信息图封面）。

### commit `8dae772`

每日核心 #003 · 驭人术：管理者最贵的资产是信用（Plaud 笔记扩写 30 条 + 封面）。

---

## 2026-07-21

### commit `322b8e1`

新增设计系统知识库 `docs/DESIGN_SYSTEM.md`：沉淀高级感最终版的设计原则、组件清单与验收清单。

### commit `978976a`

首页升级：1280px 宽布局、Hero 重做（count-up/星光网格）、滚动入场动效、分区背景、流式排版、导航毛玻璃。

---

## 2026-07-20 及更早

- `4c1d4dd` E2E 体检加入 giscus 评论区断言（39/39 通过）
- `6a87457` 全站交互体检 38/38：修复相关推荐数据缺失、补知识库封面、新增 E2E 体检脚本
- `a028391` 修复星图阅读原文失效
- `c574ccb` 星图摊开：连线加长 + 斥力增强 + 碰撞间距翻倍
- `047503d` 星图阻尼感：黏滞物理 + 弹性绽放 + 呼吸浮动 + 星光光晕
- `02354cf` 清理 iCloud 冲突副本并加入 gitignore
- `6ed836c` 星图体验升级：沉浸画布 + 节点档案面板 + 搜索直达
- `41683de` 重建思维模型图谱：真实分类着色 + 悬停高亮关联 + 缩放探索
- `3781bb5` docs: README 新增内容导航
- `a3d91e0` 移除管理实战栏目（内容涉公司敏感信息）
- `416a9f1` docs: 移除根目录的审计报告
