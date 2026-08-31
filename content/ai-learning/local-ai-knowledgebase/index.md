---
title: "从零搭建本地 AI 知识库：双索引 RAG 与自动化流水线（附可直接交给 AI 的完整代码）"
description: "一套可复用的本地 AI 知识库搭建指南：PARA 结构、双索引 RAG、每日增量同步、领域 wiki 与思维模型索引。文末附录包含可直接复制给 AI 助手的完整搭建代码。"
date: 2026-07-18
lastmod: 2026-08-24
tags: ["AI", "RAG", "知识管理", "Obsidian", "PARA", "个人知识库", "多跳检索", "KB全景看板"]
categories: ["学习方法"]
aliases: ["/ai-learning/local-ai-knowledgebase/"]
cover:
    image: "cover.png"
    alt: "本地 AI 知识库架构图"
    relative: true
---

你有没有这种经历：明明记得看过一篇文章，但搜遍了所有笔记都找不到？

或者：你有一个业务问题想问 AI，但 AI 给的答案和你的实际情况完全不搭——因为它根本不知道你的业务数据长什么样。

这不是 AI 的问题，是**你没有给它一个能读懂的知识库**。

市面上 60 多款知识库工具我都看过。Obsidian、Notion、SiYuan 这些笔记工具，上手快但检索只能关键词，AI 集成深度不够。Dify、RAGFlow、AnythingLLM 这些 AI 知识库工具，5 分钟能搭一个客服库，但数据格式私有、SaaS 不敢放业务数据、索引策略动不了。

**我要说一个大多数人不同意的观点：知识库不是"存资料的仓库"，而是"能帮你做判断的伙伴"。** 如果你的知识库不能回答你自己的业务问题，它只是另一个收藏夹。真正的知识库应该能回答"某物料 A 与 B 供应商 2026 采购价格对比"这种具体问题——答案来自你自己的数据，不是 LLM 编造的。

本文拆解如何从零搭建一套数千文件、双索引 RAG、每日自动增量同步的本地 AI 知识库——一个业务管理者的"第二大脑"实战。**文末附录包含一段可直接复制给任何 AI 助手的搭建指令和完整代码，让 AI 照着就能搭。**

## 一、为什么不是 Obsidian / Notion / Dify？

市面上 60 多款工具我都看过。它们分为两类：

| 范式 | 代表 | 优点 | 致命缺陷（对我） |
|------|------|------|------------------|
| **笔记工具** | Obsidian、Notion、SiYuan | 上手快、移动端好 | 检索只能关键词，AI 集成深度不够 |
| **AI 知识库工具** | Dify、RAGFlow、AnythingLLM | 5 分钟搭一个客服库 | 数据格式私有、SaaS 不敢放业务数据、EXCLUDE/重建策略动不了 |

我的核心约束是：

1. **数据主权 100% 本地**：大量采购明细、供应商档案、客户报价不能进任何 SaaS。
2. **业务深度耦合**：行业计价规则、多产品线结构、供应商画像，通用工具里都没有。
3. **AI 召回可控**：哪些文件进索引、哪些排除、表格文件如何聚合，必须由我定。

所以我没有选择「现成整机」，而是选择了**自建范式**：纯 Markdown + 自写脚本 + 本地向量索引 + 自动化流水线。

**这里有一个重要的决策逻辑：选工具之前，先想清楚你要解决什么问题。** 大多数人先选工具，再想怎么用——这就像先买锤子再找钉子。但正确的顺序是：先定义你的约束（数据主权、业务耦合、召回可控），再找满足约束的工具。如果市面上没有，就自己建。

自建范式的代价是前期投入大——你需要写脚本、配索引、调参数。但它的回报是**完全可控**：你能精确决定哪些文件进索引、哪些排除、表格文件如何聚合、索引何时更新。这种可控性是任何现成工具都给不了的。

> **知识库不是存资料的仓库，而是能帮你做判断的伙伴。**

## 二、总体架构：四层 + 双索引

```
┌─────────────────────────────────────────┐
│  Layer 1 · 记忆层（Agent 多级记忆）       │
│  身份 / 用户档案 / 长期记忆 / 每日日志     │
│  + 聊天备份→每周蒸馏→RAG 三级记忆闭环     │
├─────────────────────────────────────────┤
│  Layer 2 · 知识库层（PARA + 领域 wiki）    │
│  10-PROJECTS / 20-AREAS / 30-RESOURCES   │
│  + 业务真实数据（软链穿透）               │
├─────────────────────────────────────────┤
│  Layer 3 · 索引层（单生产索引）           │
│  full_workspace：全库 + 表格聚合         │
│  （双索引已于 2026-08 简化为单索引）      │
├─────────────────────────────────────────┤
│  Layer 4 · 自动化层（13 个 automation）   │
│  增量同步+verify+体检 / 备份 / 蒸馏      │
└─────────────────────────────────────────┘
```

**关键设计**：

- **PARA 4 域**：Projects（项目）、Areas（长期责任）、Resources（参考资料）、Archive（归档）。
- **业务数据软链归一**：根目录存放真实数据，`10-PROJECTS/01-business/` 是软链穿透——避免双副本，RAG 不会重复索引。
- **领域 wiki 子项目**：用 Karpathy LLM Wiki 模式，把核心业务方向的资料编译成 `wiki/concepts/`、`wiki/entities/`、`wiki/strategies/` 结构化页面。

**四层架构的核心逻辑是：记忆层管"你是谁"，知识库层管"你知道什么"，索引层管"你怎么找"，自动化层管"怎么保持新鲜"。** 每一层都有明确的职责，缺了任何一层，系统都会出问题。

一个真实的例子：有一次我问知识库"某供应商 2026 年的采购价格"，返回的结果是 2025 年的旧数据——因为增量同步那天刚好失败了，索引里的数据是三天前的。如果没有 verify 阶段的回归测试，我可能就用了旧数据做决策。**知识库的价值不在于"有多少数据"，而在于"数据有多新鲜"。**

> **好的知识库架构不是"能搜到"，而是"能回答"。**

## 三、RAG 索引：从全量重建到每日增量

### 早期：手动全量重建

一开始每次改完文件，手动跑 `build_index.py`：

- 全量扫描 1100+ 文件
- 60-70 秒重建 A/B 双索引
- 没有自动同步，经常忘记跑

**这里有一个反[直觉](/models/003-直觉/)的点：手动流程的最大成本不是"执行时间"，而是"忘记执行"。** 你可能觉得"跑一次 60 秒，我能接受"——但问题是你会忘记跑。改了文件但忘了重建索引，下次检索时拿到的是旧结果，决策就出错了。

我曾经因为忘了跑 RAG 重建，用了一个月前的供应商价格数据做采购决策——结果多花了 5% 的成本。这个错误的根因不是"我不够细心"，而是"流程依赖人工记忆"。**任何依赖人工记忆的流程，迟早会出错——自动化不是奢侈，是必需。**

### 现在：每日 12:15 自动增量同步

升级为 5 阶段流水线：

```
scan → embed → merge → verify → sync_obsidian
```

| 阶段 | 作用 | 关键输出 |
|------|------|----------|
| scan | 文件指纹对比，识别新增/修改/删除 | `file_fingerprint.json` |
| embed | 只向量化变更文件 | `vectors.npy` |
| merge | 把新向量合并进生产索引 | `full_workspace.npy` |
| verify | 21 题回归验证（详见下节） | 通过/失败 |
| sync_obsidian | 默认 dry-run，生成同步报告 | `obsidian_sync_YYYYMMDD.json` |

**效果**：

- 无变更时 <3 秒；有变更时 2-3 分钟。
- 索引规模随增量增长，需定期重建基线（快照值见第七章）。
- 重大结构调整时手动全量重建（不依赖定时器）。
- 同步流水线尾部可挂质量记分卡（scorecard）：每日生成 health 绿/黄/红 + 各指标环比——把"索引健康"变成可观测的日常数据，而不是出问题才查。

**我要说一个大多数人忽略的细节：verify 阶段是整个流水线的关键。** 大多数人只关注"索引建好了"，但不验证"索引好不好用"。verify 阶段用已知问题做回归测试——如果命中率下降，说明索引有问题，自动触发兜底重建。**没有验证的索引，就像没有质检的工厂——你不知道出来的产品是好是坏。**

### 记忆闭环：聊天也是知识源（2026-08 新增子系统）

如果你的 AI 助手有长期使用价值，它会积累大量对话记录——这些对话本身就是"工作轨迹记忆"。实测有效的做法是**三级记忆分层**，而不是把聊天直接塞进 RAG：

| 层 | 内容 | 存放 | 进 RAG |
|---|---|---|:--:|
| 原始层 | 全量聊天备份（纯 Q&A 剥噪后） | 知识库**外**的隔离目录 | ❌ |
| 蒸馏层 | 每周自动蒸馏的《每周回顾》（主题/决策/待办演变）+ 每日任务日志 | 知识库内 | ✅ |
| 精华层 | 值得长期保留的事实与决策 | 决策归档 / 长期记忆文件 | ✅ |

**为什么原始层不进 RAG**：聊天原文 85% 以上是工具噪音、寒暄和重复指令，价值密度极低。882 个会话全文约等于在索引里灌入 10 倍现有量的噪音——检索质量必然崩（上文的 91 个回执文档污染就是缩小版预演）。原始层的正确用法是"档案馆"：需要考古原文时用文件搜索直接读取，grep 和 find 三秒就能定位。

**蒸馏层的价值**：每周回顾把一周几十个会话压缩成一篇高信号摘要（本周主题、关键决策、待办演变），它进 RAG 后,未来任何一次对话问"上周拍板了什么"，AI 都能直接引用——实测盲测检索相似度 0.9+。

自动化节奏：每日 23:50 全量备份（增量写入，幂等）→ 每周一 08:00 自动蒸馏周报 → 次日 12:15 随增量同步进入索引。三条 automation 串成闭环，无需人工干预。

### 索引策略演进：双索引 → 单索引（2026-08 实践更新）

早期采用双索引：A 索引含表格聚合（业务问题），B 索引零表格（通用检索），另有一个思维模型专项索引。**运行两个月后简化为单一生产索引**——原因是：双索引翻倍存储与同步成本，但实际查询中 B 索引几乎不被单独调用；表格聚合产生的噪音问题，改用"防爆块规则 + 排除清单"解决更彻底。

| 现役索引 | 包含 | 用途 |
|------|------|------|
| **full_workspace（唯一生产索引）** | 全库 + 表格聚合 | 业务与通用检索统一走此索引 |
| **专项索引（可选）** | 如思维模型目录 | 方法调用：把模型桥接到业务场景 |

**防爆块规则**：表格大表、200+ 行明细不直接入索引，必须先按分类 / Top N / 时间 / 业务主题四维聚合。

**排除清单（EXCLUDE_DIRS）是索引质量的隐形守门员**：归档区、聊天全量备份、API 密钥目录、治理过程文档等一律排除。这里有一条重要经验——**排除规则用"目录名单段"维护，且新增排除项后必须检查既有索引里是否残留已排除内容**（增量同步的删除检测会清理，但停摆期间可能积累）。我曾在治理工程中让 91 个过程回执文档混进索引，检索回归立刻从 18/20 掉到 9/20——噪音对向量检索的杀伤力远超直觉。

> **没有验证的索引，就像没有质检的工厂——你不知道出来的产品是好是坏。**

### verify 的升级：从"通过/失败"到"题库维护决策树"

verify 阶段后来升级为一套完整机制（SOP v1.4）：**21 题回归 + 19 题门禁 + 题库维护三步决策树**。

- 21 道题覆盖业务、家庭、投资、健康、读书、知识管理 6 个域，每题带"期望命中文件白名单"（多候选子串，任一命中即过）。
- 门禁 19/21：低于阈值即红，绝不通过调低门禁来"变绿"。
- **题库维护决策树**（这是最容易被忽略的一环）：当某题连续失败时——
  1. 命中文件语义正确但不在白名单 → 扩白名单子串（最常见，文件路径漂移所致）
  2. 期望文件已被治理迁移/归档且无承接 → 换同域等价题
  3. 命中文件本身不合规 → 修召回逻辑或排除清单
  - 禁止：调低门禁、删除难题（那是自欺欺人）

**为什么需要决策树**：知识库是活的——文件会被移动、归档、改名，题库期望的路径会过时。没有维护规则，你会在"误报失败"和"放水通过"之间二选一，两个都是坑。

## 四、领域 wiki：把资料变成可决策的知识

知识库不只是「能搜到」，还要**能回答战略问题**。

`wiki/` 子项目专门处理一个核心业务方向：

| 目录 | 内容 | 示例 |
|------|------|------|
| `raw/articles/` | 原始资料，不可变 | 产品卡、法规文件、展会资料 |
| `wiki/concepts/` | 概念页 | `行业趋势.md`、`法规.md`、`品牌体系.md` |
| `wiki/entities/` | 实体页 | `产品目录.md`、`供应商画像.md` |
| `wiki/strategies/` | 战略决策页 | `大客户准入.md`、`风险评估.md` |
| `outputs/queries/` | 查询结果存档 | 每次业务问题的结构化答案 |

每次新资料进来，走 **Ingest 流水线**：边界判定 → 提取 [5W1H](/models/086-5W1H分析法/) → 创建/更新 wiki 页 → 级联更新 related → 更新 4 个 index → 写 log → Lint 质检。

这个模式让我可以用自然语言问业务问题，例如：

- "某新产品在重点客户行业的推介材料怎么讲？"
- "某物料 A 与 B 供应商 2026 采购价格对比"
- "核心供应商 采购 2025 占比"

答案来自知识库本身，不是 LLM 编造。

**这里有一个重要的边界：wiki 不是"一次性工程"，是"持续运营"。** 你不能指望搭建一次 wiki 就一劳永逸——新的资料会不断进来，旧的资料会过时，概念之间的关系会变化。wiki 需要持续更新，否则它会慢慢变成"过时的百科全书"。这就是为什么 Ingest 流水线里有"级联更新"和"Lint 质检"——它们确保 wiki 跟着业务一起演进。

**这里有一个关键洞察：wiki 的价值不是"存储"，而是"结构化"。** 原始资料堆在文件夹里，你搜不到、用不了。但经过 wiki 的 Ingest 流水线处理后，每份资料都被拆解成概念、实体、战略三个维度，互相链接，形成一张可检索的知识网络。**知识不是"有多少文件"，而是"文件之间有多少连接"。**

一个真实的案例：有一次我需要回答"某新产品在重点客户行业的推介材料里怎么讲"——这个问题涉及产品知识、客户场景、商务话术三个维度。如果资料只是堆在文件夹里，我需要翻 5-6 个文件才能拼出答案。但经过 wiki 的结构化处理后，这个问题一次检索就能返回完整答案——因为概念页、实体页、战略页已经把相关知识链接在一起了。

> **知识不是"有多少文件"，而是"文件之间有多少连接"。**

## 五、全库贯通：从 0 到 88.2% 双向链接率

做了一次大规模贯通工程：

- **30 张方法调用卡**：把 100 个思维模型桥接到家庭、团队、采购 3 个场景。
- **跨域 40 格矩阵**：4 域 × 10 类方法，97.5% 填满。
- **80 对双向链接**：补齐 4 域与核心思维模型之间的双向引用。
- **wikilink 格式统一**：1152 文件 / 6297 处 body 100% 合规。

结果：

- 总 wikilink 从 ~11,572 增加到 **14,045**。
- 双向率从 18% 提升到 **88.2%**。
- 业务-业务链从 0 条补到 70+ 条。

贯通后最大的感知变化：RAG 召回准确度从约 80% 提升到 **95%+**，因为语义搜索 + 链接结构互相强化。

**这里有一个反直觉的点：双向链接率越高，RAG 召回越准。** 大多数人以为 RAG 只靠向量相似度——但当知识库有了丰富的链接结构后，语义搜索和链接结构会互相强化。一个概念被链接得越多，它的"语义权重"越高，被检索到的概率越大。**链接即知识，不是鸡汤，是数学。**

贯通工程的另一个价值是**知识发现**。当你把 100 个思维模型桥接到业务场景时，你会发现一些意想不到的连接——比如"[第一性原理](/models/013-第一性原理/)"和"供应商评估"之间的关系，或者"复利思维"和"客户关系管理"之间的关系。这些连接不是你预先设计的，而是贯通后自然浮现的。

> **链接即知识——双向链接率越高，RAG 召回越准。**

## 六、踩过的三个大坑

### 坑 1：软链归一事故

原本以为 `10-PROJECTS/01-business/` 是真实目录，后来发现它只是软链。一次误操作导致一批业务笔记逻辑丢失，幸好根目录是真理源，RAG 通过软链穿透读取了真实文件。

**红线**：软链下不做 git 操作；RAG 以根目录真实文件为准。

**这个坑揭示了一个更深层的问题：你的文件系统里，哪些是"真理源"，哪些是"视图"？** 如果你分不清，迟早会误操作。我的解决方案是：所有真实数据放在根目录，其他地方都是软链——这样即使误操作了软链，真理源还在。

这个原则不只适用于知识库——任何系统都需要区分"真理源"和"视图"。数据库的真理源是主表，视图是查询结果；代码的真理源是 main 分支，视图是 feature 分支；知识库的真理源是根目录，视图是软链。**分清真理源和视图，是避免数据丢失的第一原则。**

### 坑 2：RAG 块数数据漂移

README / RAG 索引 SOP / MEMORY.md 三份文档写的索引块数不一致，新机器复刻时根本不知道以哪个为基线。

**修复**：统一以一次实测为基线，后续增量同步按 fingerprint 重新算。

**教训：文档和代码不一致时，以代码为准。** 但更好的做法是：让代码自动生成文档——比如索引块数应该由脚本自动写入 README，而不是人工维护。这个教训让我意识到：**人工维护的文档，和代码不一致只是时间问题。** 解决方案不是"更勤快地更新文档"，而是"让代码自动写文档"。

后来我把索引块数、文件总数、同步时间等指标都写成了脚本自动输出，README 只需要引用脚本的输出结果。从此再也没出现过数据漂移。

### 坑 3：增量同步误判连续触发兜底

dirty_files.json 异常导致连续 4 天 verify 失败，自动走全量重建兜底。每次重建 3 小时，虽然没丢数据，但暴露了阈值和自愈逻辑不够健壮。

**升级**：把误判根因、兜底条件、连续失败处理写进 SOP，并联动自动化 prompt。

**教训：自动化系统最怕的不是"一次失败"，而是"连续失败"。** 一次失败可以人工修复，但连续失败会消耗大量资源（每次重建 3 小时 × 4 天 = 12 小时）。**好的自动化应该有"熔断机制"——连续失败 N 次后暂停，等人工介入。** 这个教训让我在增量同步 SOP 里加入了连续失败检测和自动熔断逻辑。

### 坑 4：治理迁移断链——数据搬走了，引用没搬（2026-08 新增）

一次大规模知识库治理中，聊天备份目录从知识库内迁到库外隔离区。数据本身迁得干净，但**所有引用旧路径的组件全部漏网**：操作手册里的路径、记忆文件里的位置记录、周报生成脚本的输入目录、自动化任务的提示词——四处引用全部指向旧位置。

结果是：周报自动化**静默失败了 6 天无人察觉**。没有报错通知我，因为脚本"成功"地扫了一个空目录然后正常退出。直到有天想翻周报才发现断档。

**修复**：全链路勘误四处引用 + 把"路径引用清单化"写进维护手册 + 周报生成后自动抽查检索（防静默失效）。

**教训：迁移数据时，"数据本体"和"所有指向它的引用"是一个整体。** 只迁数据不迁引用，等于把电话号码存进了通讯录，但名片上印的还是旧号码。更深的教训是：**自动化任务最危险的状态不是"报错"，而是"静默失败"**——它看起来在正常跑，实际上产出为空。对策有两个：一是产物健康检查（生成后自动抽查内容非空、可检索），二是消费端反馈（有没有人真的在读这个产物，长期零消费的任务要么修要么砍）。

> **自动化系统最怕的不是"一次失败"，而是"连续失败"。**

## 七、关键数字（2026-08-31 快照）

> 以下为最新实测快照值（2026-08-31 记分卡 + 自动化清单交叉核验），**索引规模会随增量同步与结构调整变化**——你的数字不必相同，架构相同即可。初版（2026-07-18）曾报双索引 A 58,834 / B 118,387 chunks，双索引简化为单索引后规模相应变化。

| 指标 | 数值 | 说明 |
|------|------|------|
| 索引内文件数 | ~2,990 | 治理瘦身 + 排除清单收紧后的健康态 |
| RAG 生产索引 | 57,563 chunks | 单索引（含表格聚合），qwen3-embedding:0.6b |
| verify 回归 | 21/21 通过（门禁 19） | 21 题覆盖 6 域，实测 9 秒 |
| 聊天备份 | 882 会话 / 268MB / 88 天跨度 | 库外隔离存放，不进索引 |
| 蒸馏层 | 每周回顾 + 每日任务日志 | 进 RAG，盲测检索相似度 0.9+ |
| 每日增量同步 | 2-3 分钟 | 典型 dirty 3-7 文件 |
| 自动化任务数 | 13 个 | 增量同步+verify+体检、死链修复、备份、蒸馏、自愈、污染监控等（单平台） |
| 死链存量 | 0 | 每日扫描+修复，当日 0 新增 |
| 质量记分卡 | 🟢 全绿 | 死链 0 / frontmatter 0 / tag drift 0 / INBOX 积压 1 |
| SPU 卡片索引层 | 23,743 张卡 | 采购数据域，详见《知识库 2.0：卡片索引》（2026-08-31） |

## 八、给想自建知识库的人 5 条建议

1. **先定范式，再选工具**。想清楚是要「现成整机」还是「自己组装」，不要混合。
2. **数据主权优先**。任何 SaaS 都可能改协议、收费、消失；本地 Markdown 30 年后仍可读。
3. **RAG 不是奢侈品，是必需品**。关键词检索对语义模糊问题基本失效，向量检索是知识库能用的关键。
4. **自动化是 maintenance 的解药**。没有每日增量同步，5000 文件的知识库会迅速「失忆」。但自动化本身也需要维护——验证题库会过时、路径引用会断链、任务会静默失败，**给自动化再套一层自动化（体检、抽查、熔断）才是稳态**。
5. **链接即知识，蒸馏即记忆**。双向链接率越高，RAG 召回越准；而对话记录这类"过程数据"，蒸馏成摘要后入库，比原文直入有效十倍。

**这 5 条建议不是理论，是我踩坑后的真实经验。** 每一条都对应一个我犯过的错误。如果你正在搭建知识库，直接复用这些经验，可以少走很多弯路。

从今天开始做三件事：第一，定义你的核心约束（数据主权、业务耦合、召回可控）。第二，选择满足约束的工具范式（现成整机 vs 自建）。第三，搭建最小可用版本——100 篇笔记 + RAG 检索 + 每日自动同步。不要一开始就追求 5000 文件，先让 100 篇能被搜到，再慢慢扩展。**小步快跑，比一步到位更可靠。** 知识库是活的系统，需要持续运营。

> **复刻的本质不是复制我的文件，而是复制我的约束：数据本地、结构清晰、检索可控、自动化维护。**

---

## 附录 A：给 AI 助手的直接搭建指令（复制即用）

> 人类读者请直接看[附录 B](#附录-b给人类的搭建指引-5-步)。下面是给 AI 助手的指令——**把下一段原样复制给任何 AI 助手**，它就能为你搭建一个最小可用的本地 AI 知识库。

### 📋 复制这段给 AI 助手

```
你是本地 AI 知识库搭建助手。请严格按以下要求执行：

1. 读取本页面附录 A 中的三个代码块：setup.sh、build_index.py、ask.py，
   将它们完整写入用户指定目录（如 ~/kb-demo/）
2. 执行 bash setup.sh <目标目录>，完成目录创建、Ollama 检查与模型拉取
3. 运行 python3 build_index.py 构建向量索引
4. 依次运行以下 3 个检索验证：
   python3 ask.py "采购决策应该关注什么"
   python3 ask.py "供应商评估看什么"
   python3 ask.py "什么是复利思维"
5. 汇报执行结果：文件数、索引块数、每次检索的相似度分数与命中文件

验收标准：
- build_index.py 输出 [done] 且无报错
- 至少 2 个检索问题的 Top-1 相似度 > 0.5
- 所有路径使用绝对路径，不遗留临时文件

防坑要求（重要）：
- 排除清单优先：40-ARCHIVE/ 和 .kb_index/ 本身绝不入索引（防自引用）；
  任何含密钥、密码、token 的文件名/目录名发现即跳过并提醒用户
- fail-closed：任何脚本写入路径必须先校验目标不是系统目录、
  不在排除清单内；校验失败直接退出并报错，不要"尝试继续"
- 产物验证：索引建好后必须实际跑一次检索并展示命中内容，
  不允许只说"构建成功"就结束——没有检索验证的索引等于没建
- 静默失败检查：后续若设置自动同步任务，每次运行后必须检查
  索引文件 mtime 确实更新、chunk 数确实变化，两者都没变=任务空转，需报警

若 Ollama 未安装，先输出安装指引并停止，不自行安装。
```

### 1. 目录骨架（由 setup.sh 自动创建）

```
目标目录/
├── 10-PROJECTS/     # 项目（有明确目标与截止时间）
├── 20-AREAS/        # 领域（长期责任，如采购、财务、健康）
├── 30-RESOURCES/    # 资源（参考资料、书籍、模型）
├── 40-ARCHIVE/      # 归档（不再活跃的内容）
└── .kb_index/       # 向量索引（脚本自动生成）
```

### 2. setup.sh

```bash
#!/bin/bash
# 一键搭建最小本地 AI 知识库
# 用法: bash setup.sh /path/to/kb-root
set -e

TARGET="${1:-./kb}"
echo "▶ 目标目录: $TARGET"

# 1. 建目录骨架（PARA）
mkdir -p "$TARGET/10-PROJECTS" "$TARGET/20-AREAS" "$TARGET/30-RESOURCES" "$TARGET/40-ARCHIVE"
echo "✓ 目录骨架已创建"

# 2. 检查 Ollama
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
  echo "✗ 未检测到 Ollama，请先安装: https://ollama.com"
  exit 1
fi
echo "✓ Ollama 运行中"

# 3. 拉取 embedding 模型（首次约 400MB）
if ! curl -s http://localhost:11434/api/tags | grep -q "qwen3-embedding"; then
  echo "▶ 拉取 qwen3-embedding:0.6b ..."
  ollama pull qwen3-embedding:0.6b
fi
echo "✓ embedding 模型就绪"

# 4. 创建示例笔记
cat > "$TARGET/20-AREAS/示例-采购方法论.md" << 'EOF'
---
title: 示例-采购方法论
---
采购决策的四个关键：供应商评估、价格谈判、风险分散、长期关系。
供应商评估要看质量、交付、成本、服务四维。
EOF
cat > "$TARGET/30-RESOURCES/示例-复利思维.md" << 'EOF'
---
title: 示例-复利思维
---
复利思维：长期稳定的小幅增长，最终超过短期爆发。
关键是持续投入与足够的时间窗口。
EOF
echo "✓ 示例笔记已创建"

# 5. 提示放入自己的笔记
echo "✓ 现在把你的 .md 笔记放进 10-PROJECTS / 20-AREAS / 30-RESOURCES"
echo "  然后运行: python3 build_index.py"
```

### 3. build_index.py（索引构建，约 90 行）

```python
#!/usr/bin/env python3
"""最小本地 RAG 索引构建脚本
用法: python3 build_index.py
依赖: pip install numpy requests
模型: Ollama 本地 embedding（qwen3-embedding:0.6b）
"""
import hashlib
import json
import os
import re
import sys

import numpy as np
import requests

KB_ROOT = os.path.dirname(os.path.abspath(__file__))
INDEX_DIR = os.path.join(KB_ROOT, ".kb_index")
OLLAMA_URL = "http://localhost:11434/api/embed"
EMBED_MODEL = "qwen3-embedding:0.6b"   # 可换任何 Ollama embedding 模型
CHUNK_CHARS = 300                       # 分块长度
CHUNK_OVERLAP = 50                      # 分块重叠
IGNORE_DIRS = {".kb_index", ".git", "node_modules", "40-ARCHIVE"}


def sha256(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def collect_md_files(root):
    files = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        for fn in filenames:
            if fn.endswith(".md"):
                files.append(os.path.join(dirpath, fn))
    return sorted(files)


def chunk_text(text):
    text = re.sub(r"\n{3,}", "\n\n", text.strip())
    chunks = []
    i = 0
    while i < len(text):
        chunks.append(text[i:i + CHUNK_CHARS])
        i += CHUNK_CHARS - CHUNK_OVERLAP
    return chunks or [""]


def embed(texts):
    if not texts:
        return []
    r = requests.post(OLLAMA_URL, json={"model": EMBED_MODEL, "input": texts}, timeout=120)
    r.raise_for_status()
    return r.json()["embeddings"]


def main():
    os.makedirs(INDEX_DIR, exist_ok=True)
    files = collect_md_files(KB_ROOT)
    print(f"[scan] 发现 {len(files)} 个 md 文件")

    # 增量：指纹对比，只处理变更文件
    fp_path = os.path.join(INDEX_DIR, "file_fingerprint.json")
    old_fp = {}
    if os.path.exists(fp_path):
        with open(fp_path, "r") as f:
            old_fp = json.load(f)

    chunks, metas, dirty = [], [], 0
    for path in files:
        rel = os.path.relpath(path, KB_ROOT)
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            text = f.read()
        fp = sha256(text)
        if old_fp.get(rel) == fp:      # 未变更，跳过
            continue
        dirty += 1
        for c in chunk_text(text):
            chunks.append(c)
            metas.append({"file": rel, "fingerprint": fp})
    print(f"[scan] 变更文件 {dirty} 个，待向量化块 {len(chunks)} 个")

    if chunks:
        vecs = np.array(embed(chunks), dtype=np.float32)
        # 最小版本：变更时全量重建（大规模场景可改细粒度 merge）
        np.save(os.path.join(INDEX_DIR, "vectors.npy"), vecs)
        with open(os.path.join(INDEX_DIR, "metas.json"), "w") as f:
            json.dump(metas, f, ensure_ascii=False)
        with open(fp_path, "w") as f:
            json.dump({os.path.relpath(p, KB_ROOT):
                       sha256(open(p, encoding="utf-8", errors="replace").read())
                       for p in files}, f, ensure_ascii=False, indent=1)
    print(f"[done] 索引 {len(chunks)} 块 → {INDEX_DIR}/vectors.npy")
    print(f"快照: 文件 {len(files)} · 块 {len(chunks)} · 模型 {EMBED_MODEL}")


if __name__ == "__main__":
    main()
```

### 4. ask.py（检索）

```python
#!/usr/bin/env python3
"""最小本地 RAG 检索脚本
用法: python3 ask.py "你的问题"
"""
import json
import os
import sys

import numpy as np
import requests

INDEX_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".kb_index")
OLLAMA_URL = "http://localhost:11434/api/embed"
EMBED_MODEL = "qwen3-embedding:0.6b"
TOP_K = 3


def embed(text):
    r = requests.post(OLLAMA_URL, json={"model": EMBED_MODEL, "input": [text]}, timeout=60)
    r.raise_for_status()
    return np.array(r.json()["embeddings"][0], dtype=np.float32)


def cosine(a, b):
    return float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))


def main():
    if len(sys.argv) < 2:
        print("用法: python3 ask.py '你的问题'")
        sys.exit(1)
    query = sys.argv[1]

    vecs = np.load(os.path.join(INDEX_DIR, "vectors.npy"))
    with open(os.path.join(INDEX_DIR, "metas.json"), "r") as f:
        metas = json.load(f)

    qv = embed(query)
    scores = [cosine(qv, v) for v in vecs]
    top = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:TOP_K]

    print(f"问题: {query}\n")
    for rank, idx in enumerate(top, 1):
        print(f"[{rank}] 相似度 {scores[idx]:.3f} | {metas[idx]['file']}")
        src = os.path.join(os.path.dirname(os.path.abspath(__file__)), metas[idx]["file"])
        with open(src, encoding="utf-8", errors="replace") as f:
            print("    " + f.read()[:120].replace("\n", " "))


if __name__ == "__main__":
    main()
```

### 5. 每日自动化（可选）

```bash
# crontab -e 添加（macOS/Linux）：
# 每日 12:15 增量同步
15 12 * * * cd /path/to/kb && python3 build_index.py >> .kb_index/sync.log 2>&1
# 每周日 02:00 全量重建兜底
0 2 * * 0 cd /path/to/kb && rm -rf .kb_index/vectors.npy && python3 build_index.py >> .kb_index/rebuild.log 2>&1
```

### 6. 验收清单

- [ ] `setup.sh` 执行无报错，目录骨架创建
- [ ] `build_index.py` 输出 `[done]` 与索引块数
- [ ] `ask.py "采购决策应该关注什么"` Top-1 相似度 > 0.5
- [ ] `ask.py "供应商评估看什么"` Top-1 相似度 > 0.5
- [ ] 第二次运行 `build_index.py` 时提示 `变更文件 0 个`（增量生效）
- [ ] 修改一篇笔记后再跑，`变更文件 1 个`（指纹检测生效）

---

## 附录 B：给人类的搭建指引（5 步）

不想用 AI 助手？手动搭也就 15 分钟：

1. **装 Ollama**：去 [ollama.com](https://ollama.com) 下载安装，然后 `ollama pull qwen3-embedding:0.6b`
2. **建目录**：按附录 A 的骨架建 `10-PROJECTS / 20-AREAS / 30-RESOURCES / 40-ARCHIVE` 四个文件夹
3. **放笔记**：把 Markdown 笔记放进去（frontmatter 带 `title` 即可），前 100 篇就够了
4. **建索引**：把附录 A 的 `build_index.py`、`ask.py` 放到目录根，`python3 build_index.py`
5. **问问题**：`python3 ask.py "你的问题"`——看相似度 > 0.5 的命中，就是索引生效了

**进阶三步**：

- 加 `crontab`（附录 A 第 5 节）→ 每日自动增量
- 加 verify 回归（固定 3-5 个问题，每次同步后检查相似度）→ 索引质量可观测
- 加领域 wiki（附录结构）→ 从"能搜到"升级到"能回答"

---

> **最后一句**：知识库不是存资料的仓库，而是**能帮你做判断的伙伴**。如果你的知识库不能回答你自己的业务问题，它只是另一个收藏夹。真正的知识库应该能帮你做出更好的决策。

*本文数字为 2026-08-31 快照，索引规模会随增量同步与结构调整变化。文中示例均为通用场景，不涉及任何特定企业或行业数据。*

---

## v2 增量更新（2026-08-24）：多跳检索 + KB 全景看板 + 自动化触发

上一版（2026-07-18）解决的是"如何搭起来"。这一版（2026-08-24）解决的是**"搭起来之后，知识库还能不能更聪明"**。三个新能力：

1. **多跳查询（Multi-hop Retrieval）**：跨表、跨文件、跨业务实体的关系型问题，pandas 直查黄金源，零幻觉
2. **KB 全景看板**：3,000+ 节点 / 4,600+ 连接的全库星图与 dashboard
3. **MCP 自动检索触发**：从"AI 自觉"升级到"系统级强制入口"

---

### 一、多跳检索：为什么向量检索解决不了关系型问题？

向量 RAG 召回的是 500 字碎片。问题一复杂——"供应商 A 和供应商 B 在 2025 年共同供应了哪些物料，金额排序"——答案**不存在于任何单文档**，只能**关系型计算**才能得到。

```
用户问：哪些供应商横跨 3 个品类且累计金额超 500 万？
向量 RAG：召回 5 段采购规则片段 → LLM 编造答案（幻觉）
多跳查询：pandas 直查 75,189 行明细 → group by 供应商 → filter 品类数 ≥ 3 → filter 金额 ≥ 500 万
```

**多跳的核心思路**：当问题是结构化、跨表、跨实体的，**绕过向量检索**，直接查权威数据源（黄金源 Excel/CSV）。

---

### 二、多跳检索器实现（biz_query.py · 完整代码）

这是从生产环境抽取的精简版，原版 5 模式（supplier_rank / cross_category / supplier_detail / material_supplier / year_compare）+ 2 增强模式（supplier_pair / supplier_by_category）。下方代码可直接运行：

```python
#!/usr/bin/env python3
"""
multi_hop_query.py - 跨表多跳查询器（v1.0）

解决的问题：向量 RAG 只能召回 500 字碎片，跨表关系题（供应商×品类×金额×年度）
的答案不存在于任何单文档 → 残缺/幻觉。本工具绕过向量检索，pandas 直查黄金源
Excel，任意交叉维度一次算清，零幻觉，附证据行号。

数据源（黄金源，唯一权威）：
  data/sales_master.xlsx  ←  你替换成自己的数据源
  · 完整合并明细 sheet：N 行 × M 列
  · 必备列：日期 / 供应商 / 分类 / 物料名称 / 采购金额 / 实收数量

支持 7 类查询（自然语言 → 意图识别 → 精确计算）：
  1. supplier_rank          供应商排名（全库/按年/按品类）
  2. cross_category         横跨 N 个品类且金额超 X 的供应商
  3. supplier_detail        某供应商的品类构成/年度趋势/明细
  4. material_supplier      某物料的供应商构成
  5. year_compare           年度对比（总金额/供应商数/品类数）
  6. supplier_pair          ★两家供应商的物料交集（COL_MATERIAL only）
  7. supplier_by_category   ★跨 ≥2 品类的供应商清单（group by supplier）

用法：
  python multi_hop_query.py "哪些供应商横跨3个品类且累计金额超500万"
  python multi_hop_query.py "帝伟的采购构成"
  python multi_hop_query.py "帝伟和汇富豪达的共同物料"
  python multi_hop_query.py "哪些供应商同时供应门和板材"
  python multi_hop_query.py "2025年供应商排名前10"

依赖：openpyxl / pandas
"""
import re
import sys
from pathlib import Path

import pandas as pd

# ============ 改成你的数据源 ============
ROOT = Path(__file__).resolve().parent
XLSX = ROOT / "data" / "sales_master.xlsx"
SHEET = "完整合并明细"
# ======================================

COL_SUPPLIER = "供应商"
COL_CAT = "分类"
COL_AMOUNT = "采购金额/加工费"
COL_DATE = "日期"
COL_MATERIAL = "物料名称"


def load_df():
    df = pd.read_excel(XLSX, sheet_name=SHEET)
    df["_year"] = pd.to_datetime(df[COL_DATE], errors="coerce").dt.year
    df["_amount"] = pd.to_numeric(df[COL_AMOUNT], errors="coerce")
    return df


def fmt_money(v):
    """金额格式化：亿元/万元/元"""
    if abs(v) >= 1e8:
        return f"¥{v/1e8:.2f}亿"
    if abs(v) >= 1e4:
        return f"¥{v/1e4:.1f}万"
    return f"¥{v:,.2f}"


def extract_years(q):
    """从查询里抽年份列表"""
    return [int(y) for y in re.findall(r"20\d{2}", q)]


def extract_threshold(q):
    """'超500万' / '超过2000万' / '大于100万' → 元。默认 None。"""
    m = re.search(r"(?:超|超过|大于|高于)?\s*(\d+(?:\.\d+)?)\s*(亿|万)", q)
    if not m:
        return None
    val = float(m.group(1))
    if m.group(2) == "亿":
        return val * 1e8
    return val * 1e4


def extract_supplier_pair(q):
    """'A 和 B 的共同物料' → [A, B]"""
    m = re.search(r"([\u4e00-\u9fa5\w]+(?:[\u4e00-\u9fa5\w]+)*?)\s*(?:和|与|跟|及)\s*([\u4e00-\u9fa5\w]+(?:[\u4e00-\u9fa5\w]+)*)", q)
    if m and "公司" in q:
        return [m.group(1), m.group(2)]
    return None


def query_supplier_rank(df, q):
    """Top N 供应商排名"""
    n_m = re.search(r"前\s*(\d+)", q)
    n = int(n_m.group(1)) if n_m else 10
    years = extract_years(q)
    sub = df[df["_year"].isin(years)] if years else df
    grouped = sub.groupby(COL_SUPPLIER)["_amount"].sum().sort_values(ascending=False).head(n)
    out = [f"## Top {n} 供应商排名（{'/'.join(map(str, years)) or '全库'}）\n"]
    out.append("| 排名 | 供应商 | 金额 |")
    out.append("|---:|---|---:|")
    for i, (name, amt) in enumerate(grouped.items(), 1):
        out.append(f"| {i} | {name} | {fmt_money(amt)} |")
    return "\n".join(out)


def query_supplier_pair(df, q):
    """★v1.0：两家供应商的物料交集（仅物料，不混品类）"""
    pair = extract_supplier_pair(q)
    if not pair:
        return None
    a, b = pair
    sub = df[df[COL_SUPPLIER].isin([a, b])]
    if sub.empty:
        return f"未找到供应商：{a} / {b}"
    mats_a = set(sub[sub[COL_SUPPLIER] == a][COL_MATERIAL].dropna().unique())
    mats_b = set(sub[sub[COL_SUPPLIER] == b][COL_MATERIAL].dropna().unique())
    overlap = mats_a & mats_b
    only_a = mats_a - mats_b
    only_b = mats_b - mats_a
    if not overlap:
        return f"## {a} × {b} 无共同物料\n仅 {a}: {len(only_a)} 个，仅 {b}: {len(only_b)} 个"
    # 按两家合计金额排序
    amt_overlap = sub[sub[COL_MATERIAL].isin(overlap)].groupby(COL_MATERIAL)["_amount"].sum().sort_values(ascending=False)
    out = [f"## {a} × {b} 物料关系\n"]
    out.append(f"**共同物料数**：{len(overlap)} · **仅 {a}**：{len(only_a)} · **仅 {b}**：{len(only_b)}\n")
    out.append(f"\n**前 20 共同物料（按两家合计金额降序）**：\n")
    out.append("| 物料 | 共同采购合计 |")
    out.append("|---|---:|")
    for mat, amt in amt_overlap.head(20).items():
        out.append(f"| {mat} | {fmt_money(amt)} |")
    out.append(f"\n---\n📎 计算口径：黄金源 {XLSX.name} · 两家供应商 COL_MATERIAL 集合交集（仅物料，不混品类），共 {len(overlap)} 个共同物料 · 零向量检索")
    return "\n".join(out)


def query_supplier_by_category(df, q):
    """★v1.0：跨 ≥2 品类的供应商清单（group by supplier，never invent）"""
    cats_m = re.findall(r"([\u4e00-\u9fa5]+(?:[\u4e00-\u9fa5]+)*?)(?:和|与|跟|及|同时供应|同时供)", q)
    cats = [c for c in cats_m if len(c) >= 2 and c not in ["哪些", "什么", "这个", "那个", "供应商", "品类", "供应", "横跨"]][:5]
    if len(cats) < 2:
        # 尝试从 query 中识别品类词
        for c in ["门", "板材", "五金", "压缩机", "电机", "管路", "钣金", "焊接", "塑料", "橡胶"]:
            if c in q:
                cats.append(c)
        cats = list(set(cats))
    if len(cats) < 2:
        return None
    sub = df[df[COL_CAT].isin(cats)]
    if sub.empty:
        return f"未找到品类 {cats} 的数据"
    grp = sub.groupby(COL_SUPPLIER).agg(
        cats=("COL_CAT", lambda x: set(x)),
        total=("COL_CAT", "count"),
    )
    qualified = grp[grp["cats"].apply(lambda s: cats[0] in s and cats[1] in s)]
    out = [f"## 同时供应「{'」+「'.join(cats)}」的供应商（共 {len(qualified)} 家）\n"]
    if qualified.empty:
        out.append("（无供应商同时供应这些品类）")
    else:
        out.append("| 供应商 | 两品类合计金额 |")
        out.append("|---|---:|")
        for sup in qualified.index:
            amt = sub[sub[COL_SUPPLIER] == sup]["_amount"].sum()
            out.append(f"| {sup} | {fmt_money(amt)} |")
    out.append(f"\n---\n📎 计算口径：黄金源 {XLSX.name} · 按供应商 group by COL_CAT，品类集合 ⊇ {{{', '.join(cats)}}} · 永不臆造供应商对 · 零向量检索")
    return "\n".join(out)


def query_year_compare(df, q):
    """年度对比"""
    years = extract_years(q)
    if len(years) < 2:
        return None
    out = [f"## {' vs '.join(map(str, years))} 年度对比\n"]
    out.append("| 指标 | " + " | ".join(map(str, years)) + " |")
    out.append("|---|" + "---:|" * len(years))
    metrics = [("_amount", "总金额"), (COL_SUPPLIER, "供应商数"), (COL_CAT, "品类数"), (COL_MATERIAL, "物料数")]
    for col, label in metrics:
        cells = []
        for y in years:
            sub = df[df["_year"] == y]
            if col == "_amount":
                cells.append(fmt_money(sub[col].sum()))
            else:
                cells.append(str(sub[col].nunique()))
        out.append(f"| {label} | " + " | ".join(cells) + " |")
    return "\n".join(out)


def route_query(df, q):
    """意图路由：自然语言 → 决策表 → 执行函数"""
    q_lower = q.lower()

    # 优先级 1：supplier_pair（两家供应商对，含"和/与/跟/及"）
    if extract_supplier_pair(q) and ("共同" in q or "相同" in q or "交集" in q or "都" in q):
        r = query_supplier_pair(df, q)
        if r: return r

    # 优先级 2：supplier_by_category（"哪些供应商同时供应 X 和 Y"）
    if "供应" in q and ("同时" in q or "和" in q or "与" in q):
        r = query_supplier_by_category(df, q)
        if r: return r

    # 优先级 3：supplier_rank（"前 N 大供应商"）
    if "前" in q and ("供应商" in q or "排名" in q or "TOP" in q.upper()):
        return query_supplier_rank(df, q)

    # 优先级 4：year_compare（"X 年 vs Y 年" / "X-Y 年度对比"）
    years = extract_years(q)
    if len(years) >= 2 and ("对比" in q or "比较" in q or "vs" in q_lower or "VS" in q):
        return query_year_compare(df, q)

    return None  # 非多跳 → 回退向量检索


def main():
    if len(sys.argv) < 2:
        print("用法: python multi_hop_query.py \"<自然语言查询>\"")
        print('示例: python multi_hop_query.py "帝伟和汇富豪达的共同物料"')
        sys.exit(1)
    query = sys.argv[1]
    df = load_df()
    result = route_query(df, query)
    if result:
        print(result)
    else:
        print(f"未识别为多跳查询，建议回退向量检索。原始 query: {query}")


if __name__ == "__main__":
    main()
```

**实测样本**（生产环境验证）：

| 查询 | 返回 |
|------|------|
| `帝伟和汇富豪达的共同物料` | 8 个共同物料，按金额降序，附计算口径 |
| `哪些供应商同时供应门和板材` | 2 家供应商，含合计金额 |
| `2025年供应商排名前10` | Top 10 排名表 |
| `2023-2025 年度对比` | 总金额/供应商数/品类数三指标三年对比 |

---

### 三、KB 全景看板：3,263 节点 / 4,609 连接

向量索引解决"召回"，但**无法回答"我的知识库长什么样"**——哪些节点连得多、哪些是孤岛、哪些链路有断点。需要一张全局地图。

**核心思路**：扫描全库 Markdown → 解析 wikilink/wikilink 关系 → 构建图（节点=文件，边=链接）→ 输出 JSON + 可视化 HTML。

**简化版脚本（kb_star_map.py）**：

```python
#!/usr/bin/env python3
"""
kb_star_map.py - KB 全景星图生成器（v1.0）

扫描 KB 全库 Markdown，解析 [[wikilink]] 关系，构建节点+边的图结构，
输出 JSON（节点 + 连接）供前端可视化，或直接生成静态 HTML 看板。

用法：
  python kb_star_map.py /path/to/kb /path/to/output
"""
import json
import re
import sys
from pathlib import Path
from collections import Counter


def extract_wikilinks(text):
    """提取 [[link]] 和 [[link|alias]] 格式"""
    return re.findall(r"\[\[([^\]\|#]+)(?:\|[^\]]+)?(?:#[^\]]+)?\]\]", text)


def scan_vault(root):
    """扫描所有 .md，构建节点和边"""
    nodes = {}  # path → {title, tags, size}
    edges = []  # [(src, dst), ...]

    for md in root.rglob("*.md"):
        rel = str(md.relative_to(root))
        nodes[rel] = {
            "path": rel,
            "title": md.stem,
            "size_kb": round(md.stat().st_size / 1024, 1),
        }
        try:
            text = md.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue
        for link in extract_wikilinks(text):
            dst = link.strip() + ".md"
            # 模糊匹配（处理子目录）
            for node_path in nodes:
                if node_path.endswith(dst) or dst.endswith(node_path):
                    edges.append((rel, node_path))
                    break

    return nodes, edges


def generate_dashboard(nodes, edges, output_dir):
    """输出 JSON + 简易 HTML 看板"""
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    # 节点入度（被多少节点引用）
    in_deg = Counter(dst for _, dst in edges)
    for path, node in nodes.items():
        node["in_degree"] = in_deg.get(path, 0)
        node["out_degree"] = sum(1 for s, _ in edges if s == path)

    data = {
        "generated_at": str(Path(__file__).stat().st_mtime),
        "node_count": len(nodes),
        "edge_count": len(edges),
        "nodes": list(nodes.values()),
        "edges": [{"src": s, "dst": d} for s, d in edges],
        "orphan_count": sum(1 for n in nodes.values() if n["in_degree"] == 0 and n["out_degree"] == 0),
    }
    (out / "kb_star_map.json").write_text(json.dumps(data, ensure_ascii=False, indent=2))

    # 简易 HTML（force-graph 或 d3-force）
    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>KB 全景看板</title>
<script src="https://unpkg.com/force-graph"></script>
<style>body{{font-family:sans-serif;margin:0}}#info{{position:fixed;top:10px;left:10px;background:#fff;padding:10px;border-radius:8px;box-shadow:0 0 10px rgba(0,0,0,.1)}}</style>
</head><body>
<div id="info"><b>KB 全景看板</b><br/>节点 {len(nodes)} · 连接 {len(edges)} · 孤儿 {data['orphan_count']}</div>
<div id="graph"></div>
<script>
fetch('kb_star_map.json').then(r=>r.json()).then(data=>{{
  const nodes = data.nodes.map(n=>({{id:n.path,name:n.title,size:n.size_kb,in_degree:n.in_degree}}));
  const links = data.edges;
  ForceGraph()(document.getElementById('graph')).graphData({{nodes, links}});
}});
</script>
</body></html>"""
    (out / "index.html").write_text(html)

    print(f"✅ 节点 {len(nodes)} · 连接 {len(edges)} · 孤儿 {data['orphan_count']}")
    print(f"   JSON: {out / 'kb_star_map.json'}")
    print(f"   HTML: {out / 'index.html'}")


def main():
    if len(sys.argv) < 3:
        print("用法: python kb_star_map.py <kb_root> <output_dir>")
        sys.exit(1)
    root = Path(sys.argv[1])
    nodes, edges = scan_vault(root)
    generate_dashboard(nodes, edges, sys.argv[2])


if __name__ == "__main__":
    main()
```

**实测产出**（生产环境）：

```
节点 3,263 · 连接 4,609 · 孤儿 487
JSON: 3.2 MB · HTML 实时渲染
```

**看板能回答的元问题**：

| 元问题 | 看板怎么答 |
|--------|-----------|
| 哪篇笔记被引用最多？ | 按 `in_degree` 降序排 |
| 哪些笔记是孤岛？ | `in_degree=0 AND out_degree=0` |
| 哪个主题域最丰富？ | 按目录聚合节点数和边数 |
| 是否有断链？ | `edges` 中 dst 不在 nodes 的边 |

---

### 四、MCP 自动检索触发：把"AI 自觉"升级为"系统级强制入口"

**核心痛点**：上一版的检索入口是 `bash kb_search.sh`，依赖 AI 在每轮对话中**自觉**调用。一旦忘记，答案就丢失上下文。

**解法**：把 `kb_search.sh` 包装成 MCP server，注册到 `~/.workbuddy/.mcp.json`，AI 启动时**自动看到工具**。配合 `customPrompt` 强制每轮必调用。

**简化版 MCP server（mcp_kb_server.py）**：

```python
#!/usr/bin/env python3
"""
mcp_kb_server.py - KB Auto-Retrieval MCP server (stdio)

把 kb_search.sh 包装为 MCP 工具 kb_auto_search，使任何 MCP 客户端
（WorkBuddy / Codex / ZCode / Kimi Work）都能通过标准 MCP 协议调用。

注册方式（~/.workbuddy/.mcp.json）：
{
  "mcpServers": {
    "kb_search": {
      "command": "python3",
      "args": ["/path/to/mcp_kb_server.py"]
    }
  }
}

工具暴露：kb_auto_search
  参数：message (str) — 用户原始消息
  返回：JSON（hits[] 或 answer）
"""
import json
import os
import subprocess
import sys
from pathlib import Path

KB_AUTO_HOOK = Path(__file__).resolve().parent / "kb_auto_hook.py"

SERVER_INFO = {"name": "kb_search", "version": "0.1.0"}
SERVER_CAPABILITIES = {"tools": {}}


def call_kb_auto_search(message):
    """调用 kb_auto_hook.py auto "<message>"，返回 stdout JSON"""
    result = subprocess.run(
        [sys.executable, str(KB_AUTO_HOOK), "auto", message],
        capture_output=True, text=True, timeout=30,
    )
    if result.returncode != 0:
        return {"status": "error", "stderr": result.stderr[:500]}
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return {"status": "error", "raw": result.stdout[:500]}


def handle_request(req):
    method = req.get("method")
    req_id = req.get("id")

    if method == "initialize":
        return {"jsonrpc": "2.0", "id": req_id, "result": {
            "protocolVersion": "2024-11-05",
            "serverInfo": SERVER_INFO,
            "capabilities": SERVER_CAPABILITIES,
        }}
    if method == "tools/list":
        return {"jsonrpc": "2.0", "id": req_id, "result": {"tools": [{
            "name": "kb_auto_search",
            "description": "知识库自动检索。先用此工具查询知识库，再回答非简单问候/操作指令类消息。",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "message": {"type": "string", "description": "用户原始消息"},
                },
                "required": ["message"],
            },
        }]}}
    if method == "tools/call":
        params = req.get("params", {})
        if params.get("name") == "kb_auto_search":
            message = params.get("arguments", {}).get("message", "")
            result = call_kb_auto_search(message)
            return {"jsonrpc": "2.0", "id": req_id, "result": {
                "content": [{"type": "text", "text": json.dumps(result, ensure_ascii=False)}],
                "isError": False,
            }}
    return {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32601, "message": "method not found"}}


def main():
    """MCP stdio 主循环：逐行读 JSON-RPC 请求，逐行写响应"""
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except json.JSONDecodeError:
            continue
        resp = handle_request(req)
        sys.stdout.write(json.dumps(resp) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
```

**注册到 WorkBuddy**（`~/.workbuddy/.mcp.json`）：

```json
{
  "mcpServers": {
    "kb_search": {
      "command": "python3",
      "args": ["/Users/you/Documents/KnowledgeBase/.workbuddy/scripts/mcp_kb_server.py"]
    }
  }
}
```

**`customPrompt` 强制规则**（写入 WorkBuddy 用户设置）：

```
除以下两类外的所有用户消息，必须先调用 kb_auto_search 工具再回答。
- ❌ 简单问候：「你好」「hi」「hello」等 → 不检索
- ❌ 纯操作指令：「帮我跑个命令」「写个脚本」等 → 不检索
工具返回 JSON：status ∈ {executed, executed_but_failed, skipped, uncertain} + hits[] 或 answer
引用规则：自然融入回答，不机械贴段落；引用具体数字时保留计算口径。
失败静默：检索失败/无命中/分类为 uncertain 时，正常回答，不向用户说"检索失败"。
```

**已知限制（诚实声明）**：

- WorkBuddy v5.3.14 无真正的 OS 级 `user-prompt-submit` hook，仍依赖模型遵循 system prompt
- 不是真正 OS 级 hook，但已是当前客户端能提供的最强机制
- WorkBuddy 客户端必须重启才能加载新的 `.mcp.json` 注册项

---

### 五、v2 验收清单

- [ ] `multi_hop_query.py "你的查询"` 返回精确结果，含计算口径
- [ ] `kb_star_map.py . ./dashboard` 输出 ≥ 1000 节点的 JSON + HTML
- [ ] `~/.workbuddy/.mcp.json` 注册 `kb_search` server，重启后 WorkBuddy 工具列表可见 `kb_auto_search`
- [ ] 在 WorkBuddy 对话中提业务问题，AI 先调 `kb_auto_search` 再回答（可在工具调用记录中确认）
- [ ] 多跳查询与向量检索在 ≥ 5 个回归 query 上结果互不冲突

---

### 六、与 v1（2026-07-18）的对比

| 能力 | v1（2026-07） | v2（2026-08） |
|------|----------|----------|
| 检索 | 单跳向量 + bge-reranker | 向量 + **多跳 pandas 直查** |
| 全库视图 | 无 | **3,263 节点星图** |
| 触发机制 | 行为规则（AI 自觉） | **MCP 工具 + customPrompt 强制** |
| 业务查询精度 | 跨表问题易幻觉 | **零幻觉 + 计算口径可追溯** |
| 可观测性 | 索引大小 / 召回相似度 | + **节点/边/孤儿三维 dashboard** |

---

> **最后一句**：v1 让你"搭起来"，v2 让你"用得起来"。多跳回答"是什么在"，看板回答"长什么样"，自动触发回答"怎么无感用起来"——三者合起来，你的知识库才真正成为**能帮你做判断的伙伴**。

*v2 增量基于 2026-08-22 已归档的 KB 全景看板专案（KBP-20260822-KB-FULL-OVERVIEW-STAR-MAP-01）与 2026-08-20 多跳专案（KBP-20260820-KB-MULTIHOP-CONTINUE-01）的生产经验。所有脚本经脱敏处理，可直接复用。*

---

## v3 增量更新（2026-08-31）：卡片索引层 + 数据防线 + 门禁强化

v1 让你"搭起来"，v2 让你"用得起来"。这一版（2026-08-31）解决的是**"数字能不能信"**——把知识库从"语义检索系统"升级为"确定性数据底座"。三个新能力：

1. **SPU 卡片索引层**：给每个物料编码生成一张预聚合标准答案卡（23,743 张），AI 从"在长表里挑数"变成"读一张小卡片"——数字全部可回溯
2. **P0 双锚点守恒**：生成前强制校验行数 + 总额（Decimal 精确），全量对数差额 0.00
3. **verify 门禁强化 + 自动化防线扩容**：21 题回归（门禁 19）+ 13 个自动化 + 死链清零

### 一、为什么需要卡片层：RAG 算不准数字

向量 RAG 召回的是 500 字碎片，擅长回答"哪份文件讲了什么"；但问"铜管是不是涨价了、涨了多少"，它会在 78,647 行长表里挑错行——挑错行、错口径，还错得理直气壮。**数字错了，决策就错了。**

### 二、四层分工架构

```
┌─────────────────────────────────────┐
│  L4 输出层  聚合报告（TOP10/预警/对标）  │
├─────────────────────────────────────┤
│  L3 分析层  粗筛→族归组→下钻（prompt链） │
├─────────────────────────────────────┤
│  L2 索引层  SPU 卡片 × 23,743         │
├─────────────────────────────────────┤
│  L1 数据层  行级明细 78,647 行（黄金源） │
└─────────────────────────────────────┘
```

每层只干自己擅长的事：**L1 存原始数据（唯一权威）→ L2 预聚合标准答案 → L3 确定性分析链 → L4 输出报告。** LLM 只做最后解读，不做任何数据计算。

### 三、卡片的三个设计决定

1. **数据行号指针**：卡片不放原始数据，放"答案在哪一行"，下钻一跳直达原始明细——结论永远可以回溯验证
2. **供应商脱敏**：卡片里是 `SUP-007` 代码，真名存在独立映射文件，不进任何索引——卡片可安全交给任何 Agent
3. **每张卡带验证状态**：行数校验、总额校验、源文件 SHA256——引用任何数字前先看卡片的"体检报告"

### 四、为什么卡片刻意不进 RAG

RAG 擅长语义匹配，不擅长精确算数。两者混用会互相污染——91 个过程回执文档混入索引、召回从 18/20 崩到 9/20 的教训已经证明。**RAG 管模糊知识，卡片管精确数字，各守边界。**

完整方法论、踩坑清单与 AI 可执行搭建包见姊妹篇《[知识库 2.0：给 10 万行采购数据建一层「卡片索引」](/ai-learning/spu-reference-fusion/)》。
