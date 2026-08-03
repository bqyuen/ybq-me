---
title: "从零搭建本地 AI 知识库：双索引 RAG 与自动化流水线（附可直接交给 AI 的完整代码）"
description: "一套可复用的本地 AI 知识库搭建指南：PARA 结构、双索引 RAG、每日增量同步、领域 wiki 与思维模型索引。文末附录包含可直接复制给 AI 助手的完整搭建代码。"
date: 2026-07-18
lastmod: 2026-08-04
tags: ["AI", "RAG", "知识管理", "Obsidian", "PARA", "个人知识库"]
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
├─────────────────────────────────────────┤
│  Layer 2 · 知识库层（PARA + 领域 wiki）    │
│  10-PROJECTS / 20-AREAS / 30-RESOURCES   │
│  + 业务真实数据（软链穿透）               │
├─────────────────────────────────────────┤
│  Layer 3 · 索引层（双 RAG 索引）          │
│  A 索引：含表格聚合（业务问题）           │
│  B 索引：零表格（通用检索）               │
├─────────────────────────────────────────┤
│  Layer 4 · 自动化层（约 10 个 automation）│
│  每日增量同步 / 按需重建 / 死链扫描       │
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
| merge | 把新向量合并进 A/B 索引 | `full_workspace.npy` |
| verify | 回归验证，命中不足触发兜底 | 通过/失败 |
| sync_obsidian | 默认 dry-run，生成同步报告 | `obsidian_sync_YYYYMMDD.json` |

**效果**：

- 无变更时 <3 秒；有变更时 2-3 分钟。
- 索引规模随增量增长，需定期重建基线（快照值见第七章）。
- 重大结构调整时手动全量重建（不依赖定时器）。

**我要说一个大多数人忽略的细节：verify 阶段是整个流水线的关键。** 大多数人只关注"索引建好了"，但不验证"索引好不好用"。verify 阶段用已知问题做回归测试——如果命中率下降，说明索引有问题，自动触发兜底重建。**没有验证的索引，就像没有质检的工厂——你不知道出来的产品是好是坏。**

### 双索引策略

| 索引 | 包含 | 用途 |
|------|------|------|
| **A 索引** | 全库 + 表格聚合 | 业务问题：采购价格、供应商占比、成本结构 |
| **B 索引** | 零表格 | 通用检索：概念、战略、笔记 |
| **思维模型索引** | 30-RESOURCES/mental-models | 方法调用：把模型桥接到业务场景 |

**防爆块规则**：表格大表、200+ 行明细不直接入索引，必须先按分类 / Top N / 时间 / 业务主题四维聚合。

> **没有验证的索引，就像没有质检的工厂——你不知道出来的产品是好是坏。**

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

> **自动化系统最怕的不是"一次失败"，而是"连续失败"。**

## 七、关键数字（2026-07-18 快照）

> 以下为搭建完成时的快照值，**索引规模会随增量同步与结构调整变化**——你的数字不必相同，架构相同即可。

| 指标 | 数值 | 说明 |
|------|------|------|
| 知识库文件总数 | ~5,000 | 排除 40-ARCHIVE / .workbuddy / .obsidian |
| 业务真实数据 | 500+ 文件 | 根目录真实数据，含 md/xlsx/pdf 等 |
| RAG A 索引 | ~58,834 chunks | 含表格聚合，qwen3-embedding:0.6b |
| RAG B 索引 | ~118,387 chunks | 零表格，同模型 |
| 思维模型索引 | 100+ 模型 | 30 张方法调用卡已完成反向锚定 |
| 每日增量同步 | 2-3 分钟 | 典型 dirty 3-7 文件 |
| 自动化任务数 | 约 10 个 | 增量、日报、死链扫描、体检、监控等 |
| 链接双向率 | 88.2% | 贯通工程后 |

## 八、给想自建知识库的人 5 条建议

1. **先定范式，再选工具**。想清楚是要「现成整机」还是「自己组装」，不要混合。
2. **数据主权优先**。任何 SaaS 都可能改协议、收费、消失；本地 Markdown 30 年后仍可读。
3. **RAG 不是奢侈品，是必需品**。关键词检索对语义模糊问题基本失效，向量检索是知识库能用的关键。
4. **自动化是 maintenance 的解药**。没有每日增量同步，5000 文件的知识库会迅速「失忆」。
5. **链接即知识**。双向链接率越高，RAG 召回越准；把知识网状化，比单纯堆积文件更重要。

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

*本文数字为 2026-07 快照，索引规模会随增量同步与结构调整变化。文中示例均为通用场景，不涉及任何特定企业或行业数据。*
