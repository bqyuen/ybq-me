---
title: "从零搭建我的本地 AI 知识库：5000 文件、双索引 RAG 与自动化流水线"
description: "一个制造业管理者的个人知识库实战：PARA 结构、双索引 RAG、每日增量同步、领域 wiki 与 100 个思维模型如何组合成一套可复用的第二大脑系统。"
date: 2026-07-18
tags: ["AI", "RAG", "知识管理", "Obsidian", "PARA", "个人知识库"]
cover:
    image: "cover.png"
    relative: true
---

> **一句话结论**：我的知识库不是「买了个工具」，而是按自己的业务与学习习惯，**自建了一整套数据主权、检索与自动化流水线**——5000 文件、双 RAG 索引、每日 12:00 自动增量同步，最终目标是让任何业务问题都能被知识库接住。

---

## 一、为什么不是 Obsidian / Notion / Dify？

市面上 60 多款工具我都看过。它们分为两类：

| 范式 | 代表 | 优点 | 致命缺陷（对我） |
|------|------|------|------------------|
| **笔记工具** | Obsidian、Notion、SiYuan | 上手快、移动端好 | 检索只能关键词，AI 集成深度不够 |
| **AI 知识库工具** | Dify、RAGFlow、AnythingLLM | 5 分钟搭一个客服库 | 数据格式私有、SaaS 不敢放业务数据、EXCLUDE/重建策略动不了 |

我的核心约束是：

1. **数据主权 100% 本地**：大量采购明细、供应商档案、客户报价不能进任何 SaaS。
2. **业务深度耦合**：跨境计价规则、双产品线结构、供应商画像，通用工具里都没有。
3. **AI 召回可控**：哪些文件进索引、哪些排除、xlsx 如何聚合，必须由我定。

所以我没有选择「现成整机」，而是选择了**自建范式**：纯 Markdown + 自写脚本 + 本地向量索引 + 自动化流水线。

---

## 二、总体架构：四层 + 双索引

```
┌─────────────────────────────────────────┐
│  Layer 1 · 记忆层（WorkBuddy 4 层记忆）   │
│  SOUL / IDENTITY / USER / MEMORY + 每日日志 │
├─────────────────────────────────────────┤
│  Layer 2 · 知识库层（PARA + 领域 wiki）    │
│  10-PROJECTS / 20-AREAS / 30-RESOURCES   │
│  + 业务真实数据（软链穿透）               │
├─────────────────────────────────────────┤
│  Layer 3 · 索引层（双 RAG 索引）          │
│  A 索引：含 xlsx 聚合（业务问题）          │
│  B 索引：零 xlsx（通用检索）              │
├─────────────────────────────────────────┤
│  Layer 4 · 自动化层（7 个 automation）     │
│  每日增量同步 / 月度兜底重建 / 死链扫描   │
└─────────────────────────────────────────┘
```

**关键设计**：
- **PARA 4 域**：Projects（项目）、Areas（长期责任）、Resources（参考资料）、Archive（归档）。
- **业务数据软链归一**：根目录 `business/` 是真实数据，`10-PROJECTS/01-business/` 是软链穿透——避免双副本，RAG 不会重复索引。
- **领域 wiki 子项目**：用 Karpathy LLM Wiki 模式，把环保制冷战略、供应商、竞品等资料编译成 `wiki/concepts/`、`wiki/entities/`、`wiki/strategies/` 结构化页面。

---

## 三、RAG 索引：从全量重建到每日增量

### 早期：手动全量重建

一开始每次改完文件，手动跑 `full_rag.py build`：

- 全量扫描 1100+ 文件
- 60-70 秒重建 A/B 双索引
- 没有自动同步，经常忘记跑

### 现在：每日 12:00 自动增量同步

2026-06-17 起升级为 5 阶段流水线：

```
scan → embed → merge → verify → sync_obsidian
```

| 阶段 | 作用 | 关键输出 |
|------|------|----------|
| scan | 文件指纹对比，识别新增/修改/删除 | `dirty_files.json` |
| embed | 只向量化变更文件 | `embed_pending.npy` |
| merge | 把新向量合并进 A/B 索引 | `full_workspace.npy` |
| verify | 20 题回归验证，命中不足触发兜底 | 通过/失败 |
| sync_obsidian | 默认 dry-run，生成同步报告 | `obsidian_sync_YYYYMMDD.json` |

**效果**：
- 无变更时 <3 秒；有变更时 2-3 分钟。
- 索引规模：A 索引 58,834 块 / B 索引 118,387 块（2026-07-11 基线）。
- 每月 1 号 12:30 强制全量重建兜底。

### 双索引策略

| 索引 | 包含 | 用途 |
|------|------|------|
| **A 索引** | 全库 + xlsx 聚合 | 业务问题：采购价格、供应商占比、成本结构 |
| **B 索引** | 零 xlsx | 通用检索：概念、战略、笔记 |
| **思维模型索引** | 30-RESOURCES/mental-models | 方法调用：把模型桥接到业务场景 |

**防爆块规则**：xlsx 大表、200+ 行明细不直接入索引，必须先按分类 / Top N / 时间 / 业务主题四维聚合。

---

## 四、领域 wiki：把资料变成可决策的知识

我的知识库不只是「能搜到」，还要**能回答战略问题**。

`wiki/` 子项目专门处理一个核心业务方向（例如环保制冷战略）：

| 目录 | 内容 | 示例 |
|------|------|------|
| `raw/articles/` | 原始资料，不可变 | 产品卡、法规文件、展会资料 |
| `wiki/concepts/` | 概念页 | `环保制冷剂.md`、`法规.md`、`品牌体系.md` |
| `wiki/entities/` | 实体页 | `产品目录.md`、`供应商画像.md` |
| `wiki/strategies/` | 战略决策页 | `五星酒店准入.md`、`风险评估.md` |
| `outputs/queries/` | 查询结果存档 | 每次业务问题的结构化答案 |

每次新资料进来，走 **Ingest 流水线**：边界判定 → 提取 5W1H → 创建/更新 wiki 页 → 级联更新 related → 更新 4 个 index → 写 log → Lint 质检。

这个模式让我可以用自然语言问业务问题，例如：
- "环保制冷剂在高端酒店的商务材料里怎么讲？"
- "某物料 A 与 B 供应商 2026 采购价格对比"
- "核心供应商 采购 2025 占比"

答案来自知识库本身，不是 LLM 编造。

---

## 五、全库贯通：从 0 到 88.2% 双向链接率

2026-06-23 做了一次大规模贯通工程：

- **30 张方法调用卡**：把 100 个思维模型桥接到家庭、团队、采购 3 个场景。
- **跨域 40 格矩阵**：4 域 × 10 类方法，97.5% 填满。
- **80 对双向链接**：补齐 4 域与核心思维模型之间的双向引用。
- **wikilink 格式统一**：1152 文件 / 6297 处 body 100% 合规。

结果：
- 总 wikilink 从 ~11,572 增加到 **14,045**。
- 双向率从 18% 提升到 **88.2%**。
- 业务-业务链从 0 条补到 70+ 条。

贯通后最大的感知变化：RAG 召回准确度从约 80% 提升到 **95%+**，因为语义搜索 + 链接结构互相强化。

---

## 六、踩过的三个大坑

### 坑 1：软链归一事故（2026-06-17）

原本以为 `10-PROJECTS/01-business/` 是真实目录，后来发现它只是软链。一次误操作导致 168 份业务笔记逻辑丢失，幸好根目录 `business/` 是真理源，RAG 通过软链穿透读取了真实文件。

**红线**：软链下不做 git 操作；RAG 以根目录真实文件为准。

### 坑 2：RAG 块数数据漂移

README / RAG 索引 SOP / MEMORY.md 三份文档写的索引块数不一致（7614 / 8985 / 9846），新机器复刻时根本不知道以哪个为基线。

**修复**：统一用 2026-06-17 实测基线 A 9846 / B 9596，后续增量同步按 fingerprint 重新算。

### 坑 3：增量同步误判连续触发兜底（2026-07-13~16）

dirty_files.json 异常导致连续 4 天 verify 失败，自动走月初全量重建兜底。每次重建 3 小时，虽然没丢数据，但暴露了阈值和自愈逻辑不够健壮。

**升级**：增量同步 SOP 从 v1.1 升级到 v1.3，把误判根因、兜底条件、连续 INC 处理写进 SOP，并联动 automation prompt。

---

## 七、关键数字（2026-07-18 快照）

| 指标 | 数值 | 说明 |
|------|------|------|
| 知识库文件总数 | ~5,000 | 排除 40-ARCHIVE / .workbuddy / .obsidian |
| 业务真实数据 | 535 文件 | 根目录 `business/`，含 md/xlsx/pdf 等 |
| RAG A 索引 | ~58,834 chunks | 含 xlsx 聚合，qwen3-embedding:0.6b |
| RAG B 索引 | ~118,387 chunks | 零 xlsx，同模型 |
| 思维模型索引 | 100+ 模型 | 30 张方法调用卡已完成反向锚定 |
| 每日增量同步 | 2-3 分钟 | 典型 dirty 3-7 文件 |
| 自动化任务数 | 7 个 | 增量、兜底、THRS 日报、思维 Pipeline、死链修复等 |
| 链接双向率 | 88.2% | 贯通工程后 |

---

## 八、给想自建知识库的人 5 条建议

1. **先定范式，再选工具**。想清楚是要「现成整机」还是「自己组装」，不要混合。
2. **数据主权优先**。任何 SaaS 都可能改协议、收费、消失；本地 Markdown 30 年后仍可读。
3. **RAG 不是奢侈品，是必需品**。关键词检索对语义模糊问题基本失效，向量检索是知识库能用的关键。
4. **自动化是 maintenance 的解药**。没有每日增量同步，5000 文件的知识库会迅速「失忆」。
5. **链接即知识**。双向链接率越高，RAG 召回越准；把知识网状化，比单纯堆积文件更重要。

---

## 九、下一步

- 把 `qa/ask` 生成式问答接进 WorkBuddy（需 `models.json` + API key）。
- 继续升级增量同步 SOP 到 v1.4，根治 dirty_files 误判。
- 评估 Agentic RAG / GraphRAG 是否值得引入，避免自建范式被甩开 12-18 个月。

---

> **最后一句**：知识库不是存资料的仓库，而是**能帮你做判断的伙伴**。如果你的知识库不能回答你自己的业务问题，它只是另一个收藏夹。

---

## 十、实战附录：在 WorkBuddy 里一次性搭一套最小可用知识库

> 本节给想动手复刻的人一个**完整可复制的最小版本**。假设你有一台 Mac，已经装了 WorkBuddy 和 Obsidian，目标是：用一条命令搭建目录骨架 + 索引脚本 + 自动化，第二天就能问知识库问题。

### 步骤 1：一键创建目录骨架

把下面命令复制到终端执行（`KB_ROOT` 改成你的目录）：

```bash
export KB_ROOT="$HOME/Documents/MyKB"
mkdir -p "$KB_ROOT"/{00-INBOX/2026,10-PROJECTS,20-AREAS,30-RESOURCES,40-ARCHIVE,99-SYSTEM/SOPs}
mkdir -p "$KB_ROOT/.workbuddy"/{scripts,memory/incremental_sync,memory/incremental_sync_logs,memory/state/rag_history}
```

### 步骤 2：写第一篇笔记并加 frontmatter

```bash
cat > "$KB_ROOT/00-INBOX/2026/2026-07-18-hello-kb.md" <<'EOF'
---
title: "我的知识库第一页"
date: 2026-07-18
tags: ["kb", "start"]
status: active
---

# 我的知识库第一页

这是我知识库的第一条笔记。后续所有思考、项目、阅读材料都会从这里开始，再归类到 PARA 的四个域。
EOF
```

### 步骤 3：放最小版 RAG 脚本

把下面脚本存为 `$KB_ROOT/.workbuddy/scripts/kb_search.sh`：

```bash
#!/bin/bash
set -e
KB_ROOT="${KB_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
QUERY="${1:-知识库}"
TOPK="${2:-5}"

cd "$KB_ROOT"
python3 - <<PY
import os, json, pickle, numpy as np, sys, re
from sentence_transformers import SentenceTransformer

q = """${QUERY}"""
topk = int("""${TOPK}""")
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
emb = model.encode(q, normalize_embeddings=True)

for name in ["full_workspace", "workspace_summary"]:
    npy = f"{os.environ['KB_ROOT']}/.workbuddy/memory/{name}.npy"
    pkl = f"{os.environ['KB_ROOT']}/.workbuddy/memory/{name}_meta.pkl"
    if not os.path.exists(npy):
        print(f"[{name}] 索引不存在，先跑 build"); continue
    vecs = np.load(npy)
    meta = pickle.load(open(pkl, 'rb'))
    scores = vecs @ emb
    top = np.argsort(scores)[::-1][:topk]
    print(f"\n=== {name} ===")
    for i, idx in enumerate(top, 1):
        print(f"{i}. {scores[idx]:.3f} | {meta[idx]['source']}")
        print(meta[idx]['text'][:200].replace('\n',' '))
PY
```

赋权：

```bash
chmod +x "$KB_ROOT/.workbuddy/scripts/kb_search.sh"
```

### 步骤 4：最小版构建脚本

把下面脚本存为 `$KB_ROOT/.workbuddy/scripts/kb_build.sh`：

```bash
#!/bin/bash
set -e
KB_ROOT="${KB_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$KB_ROOT"
python3 - <<PY
import os, pickle, numpy as np
from sentence_transformers import SentenceTransformer

KB_ROOT = os.environ.get('KB_ROOT', os.getcwd())
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

files = []
for root, _, fs in os.walk(KB_ROOT):
    # 排除这些目录
    if any(x in root for x in ['.workbuddy','.obsidian','.git','40-ARCHIVE','00-INBOX']):
        continue
    for f in fs:
        if f.endswith('.md'):
            files.append(os.path.join(root, f))

chunks, meta = [], []
for path in files:
    text = open(path, encoding='utf-8').read()
    # 简单按 800 字切块
    for i in range(0, len(text), 800):
        chunk = text[i:i+1200]
        if len(chunk) < 100: continue
        chunks.append(chunk)
        meta.append({'source': os.path.relpath(path, KB_ROOT), 'text': chunk})

print(f"索引 {len(files)} 文件 -> {len(chunks)} chunks")
vecs = model.encode(chunks, normalize_embeddings=True, show_progress_bar=True)
mem = f"{KB_ROOT}/.workbuddy/memory"
np.save(f"{mem}/full_workspace.npy", vecs)
pickle.dump(meta, open(f"{mem}/full_workspace_meta.pkl", 'wb'))
np.save(f"{mem}/workspace_summary.npy", vecs)
pickle.dump(meta, open(f"{mem}/workspace_summary_meta.pkl", 'wb'))
print("done")
PY
```

赋权：

```bash
chmod +x "$KB_ROOT/.workbuddy/scripts/kb_build.sh"
```

### 步骤 5：运行构建

```bash
export KB_ROOT="$HOME/Documents/MyKB"
"$KB_ROOT/.workbuddy/scripts/kb_build.sh"
```

首次会下载 `paraphrase-multilingual-MiniLM-L12-v2` 模型（约 400MB），之后复用 cache。

### 步骤 6：验证检索

```bash
"$KB_ROOT/.workbuddy/scripts/kb_search.sh" "知识库第一页" 3
```

正常应输出 top3 结果，包含 `2026-07-18-hello-kb.md` 的路径和片段。

### 步骤 7：配 WorkBuddy 自动化（每日同步）

在 WorkBuddy 中创建 automation：

- **name**: MyKB 每日增量同步
- **scheduleType**: recurring
- **rrule**: `FREQ=DAILY;BYHOUR=12;BYMINUTE=0`
- **cwds**: `$HOME/Documents/MyKB`
- **prompt**: `检查 $KB_ROOT 是否有新增或修改的 .md 文件，如果有，重新运行 $KB_ROOT/.workbuddy/scripts/kb_build.sh 重建 RAG 索引；然后运行 $KB_ROOT/.workbuddy/scripts/kb_search.sh "知识库" 3 做冒烟测试。所有路径用 KB_ROOT 环境变量，不要 hard-code。`

### 步骤 8：打开 Obsidian vault

在 Obsidian 中选择「打开另一个 vault」→ 选 `$HOME/Documents/MyKB`。之后每篇笔记都可以在这里写，RAG 索引由自动化维护。

### 最小可用清单

| 项 | 路径 | 状态 |
|----|------|------|
| PARA 目录骨架 | `MyKB/{00-INBOX,10-PROJECTS,20-AREAS,30-RESOURCES,40-ARCHIVE,99-SYSTEM}` | ✅ |
| 第一篇笔记 | `MyKB/00-INBOX/2026/2026-07-18-hello-kb.md` | ✅ |
| RAG 构建脚本 | `MyKB/.workbuddy/scripts/kb_build.sh` | ✅ |
| RAG 检索脚本 | `MyKB/.workbuddy/scripts/kb_search.sh` | ✅ |
| 索引文件 | `MyKB/.workbuddy/memory/full_workspace.npy` | ✅ |
| 每日自动化 | WorkBuddy automation | ✅ |
| Obsidian vault | 打开 `MyKB` | ✅ |

### 进阶建议

1. **不要一开始就追求 5000 文件**。先让 100 篇笔记能被 RAG 检索，再慢慢扩展。
2. **先写再问**。写 10 篇有结构的笔记，再跑检索，比空有索引没内容有效得多。
3. **frontmatter 必须统一**。用 `title`、`date`、`tags` 三个最小字段，后续自动化才好统计。
4. **xlsx/pdf 不要直接丢进索引**。先写成聚合分析 md，再入索引，否则块会爆炸。
5. **每周跑一次 `kb_build.sh full`**。重建能清理删除文件留下的旧向量，比增量更稳。

---

> **复刻的本质不是复制我的文件，而是复制我的约束**：数据本地、结构清晰、检索可控、自动化维护。工具可以换，但这四条原则换不得。
