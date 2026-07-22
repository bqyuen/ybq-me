# Plaud → ybq.me 发布 SOP（合并版 v1.0）

> 合并来源：
> - **ybq.me 侧**：`content/daily/_index.md` 跨工作区同步流程 + `content/daily/2026-07-17-001` 每日核心标准模板
> - **WorkBuddy 侧**：`plaud_exports` 三篇落地文章（全球债务账单 / 刻意练习 / 半年专家）提炼的博客版结构标准
>
> 触发方式：任何工作区丢一个 Plaud 分享链接（或 `plaud_exports/` 下的导出文件）+ 一句「请同步到我的博客」。

---

## 一、素材提取（统一入口）

1. 解析分享链接中的 `sharekey`（`pub_xxx::token` 整段）
2. 调用接口取数据：
   ```
   GET https://api.plaud.ai/share/access/{sharekey}
   ```
3. 取三个字段：
   - `data_file.transaction_polish` — 润色后逐字稿（优先于 `trans_result`）
   - `data_file.notes_list[].data_content` — AI 总结
   - `data_file.outline_result` — 章节大纲（带时间戳）
4. 本地留档：转写稿 + AI 总结存一份 markdown 到当前工作区（溯源用）

---

## 二、输出模式判定（二选一，由 Agent 指派并说明理由）

| 模式 | 适用内容 | 落地栏目 | 篇幅 |
|---|---|---|---|
| **A · 每日核心（短文）** | 单一核心观点、清单类、短音频（≤15 分钟） | `content/daily/YYYY-MM-DD-NNN-slug.md` | ≤5 分钟读完（约 1500-2500 字） |
| **B · 博客版（长文）** | 深度主题、多案例、数据/报告类 | `content/insights/<slug>/` 或 `content/ai-learning/<slug>/`（页 bundle） | **2500-3500 字** |

**栏目指派规则**：
- 决策/经济/行业大主题 → `insights/`（决策科学与洞察）
- 学习方法/AI 实战/个人成长 → `ai-learning/`
- 其余轻量内容 → `daily/`

---

## 三、模式 A：每日核心模板

### Front Matter

```yaml
---
title: "每日核心 #NNN · 主题"
date: YYYY-MM-DD
draft: false
description: "分类 · 一句话钩子"
tags: ["每日核心", 主题词...]
categories: ["思维方法 | 决策日志 | AI 实战 | 行业洞察 | 阅读笔记"]
aliases: ["/blog/daily/YYYY-MM-DD-NNN-slug/"]
cover:
    image: "/images/covers/YYYY-MM-DD-NNN-slug.png"
    alt: "主题"
    caption: "一句话金句"
---
```

### 正文四段式

1. **🎯 一句话核心** — 加粗，一句话讲完
2. **💡 为什么重要** — 3-4 条 bullet
3. **🧰 怎么做** — 分节清单/步骤（主体内容）
4. **🔧 实战** — 一个具体场景案例（可用代码块画因果链）
5. **🔗 关联** — 站内互链（其他 daily / 思维模型编号）
6. **💼 今日行动** — 引用块，1 个可执行动作
7. **📌 收尾** — 编号 + 素材溯源说明

### 封面

- 1200×630，每日核心固定版式（米白底/徽标/#N/金线/大数字/金句胶囊）
- 存放 `static/images/covers/YYYY-MM-DD-NNN-slug.png`

---

## 四、模式 B：博客版模板（WorkBuddy 标准）

### Front Matter

```yaml
---
title: "反直觉 / 有悬念的博客主题（不照抄 PLAUD 原标题）"
date: YYYY-MM-DD
draft: false
description: "80-150 字钩子：核心反差 + 读者痛点"
tags: [主题词 1, 主题词 2, 主题词 3, 主题词 4]
category: "学习方法 / 思维进化 / 经济 ..."
cover:
    image: "cover.png"
    alt: "封面信息图描述"
    caption: "一句话金句 / 副标题"
    relative: true
---
```

- `title` 必须改写，不得直接用 PLAUD 原文件名
- `description` 是 SEO 和分享卡片的核心，要钩人

### 开头钩子（300-500 字）

两种开法任选：**名人名言切入** 或 **反直觉提问切入**。结构：

1. 一句话锚点（名言/反问）
2. 揭示常见认知误区（"很多人以为……但真相是……"）
3. 明确核心反差
4. 过渡到正文（"下面要拆给你看的，是……"）

### 正文（2000-2800 字）

- **4-6 个 H2 章节**，用中文序号「一、二、三、四」（不用 1. 2. 3.）
- 每节 400-600 字，结构：主题句 → 展开论证（案例/数据/比喻）→ **金句收束**
- 章节递进三段式：**破认知**（前 2 节）→ **讲方法**（中间 2-3 节）→ **落到读者**（末节扣回"你"）
- 关键数字、核心概念、反差金句加粗；核心概念括号注英文
- 保留 PLAUD 原始音频的关键案例和数字，**改写表达**（不直接复制转录）
- 短句优先，单段 ≤ 5 行

### 结尾（300-500 字）

三种收法任选：**回到开篇问题** / **行动清单** / **三个问题**。最后一句必须有金句感、留余味。

### 封面

- 深色信息图风格，16:9，页 bundle 内 `cover.png`（`relative: true`）

---

## 五、两种模式共用规范

| 维度 | 要求 |
|---|---|
| 语言 | 简体中文 |
| 段长 | 短，单段 ≤ 5 行 |
| 分隔 | `---` 分大章节；`>` 引用名人原话 |
| 互链 | 指向站内相关文章（刻意练习 ↔ 半年专家 ↔ daily 等） |
| 溯源 | 文末注明素材来源（Plaud 音频时长/日期），数字另附来源说明（可选） |
| 部署 | git push → `bqyuen/ybq-me` main → Cloudflare Pages 自动构建 |
| 验证 | `curl -s -o /dev/null -w '%{http_code}'` 页面 + 封面均 200；约 1-2 分钟生效 |

---

## 六、执行 Checklist（落盘前逐项过）

1. ✅ 接口取数成功，`transaction_polish` + `notes_list` + `outline_result` 齐全
2. ✅ 本地留档转写稿 markdown（溯源）
3. ✅ 判定输出模式（A/B）并说明理由；B 模式给 3 个候选标题并明确推荐 1 个
4. ✅ 标题改写（不照抄原标题）、description 钩人
5. ✅ 结构符合所选模式模板（A：四段式；B：三段式递进 + 每节金句）
6. ✅ 保留原文关键案例和数字，表达已改写
7. ✅ 字数达标（A ≤ 2500；B 2500-3500）
8. ✅ 封面图生成并放入正确路径
9. ✅ `hugo` 本地构建通过，页面产物存在
10. ✅ git push 后线上页面 + 封面均返回 200

---

*已验证案例：每日核心 #003 驭人术（2026-07-22，模式 A 全流程 ~2 分钟上线）；博客版三篇（WorkBuddy 侧 plaud_exports）。*
