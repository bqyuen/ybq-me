---
title: "知识库 2.0 升级全解：11 个升级点的逻辑与好处（附 AI 可执行搭建包）"
description: "从 SPU 卡片层、P0 双锚点、verify 门禁到自动化 13 连——每个升级点为什么改、逻辑是什么、好处是什么。文末附可直接丢给任何 AI 助手的完整搭建包：5 个可运行脚本 + 验收清单，照着就能复刻。"
date: 2026-08-31
lastmod: 2026-08-31
tags: ["AI", "RAG", "知识管理", "Obsidian", "SPU", "数据架构", "自动化", "知识库"]
categories: ["学习方法"]
aliases: ["/ai-learning/kb-v2-upgrade-kit/"]
cover:
    image: "cover.png"
    alt: "知识库 2.0 四层架构升级"
    relative: true
---

这是"本地 AI 知识库实践"系列的第四篇。前面三篇分别讲了：怎么搭（[v1 搭建](/ai-learning/local-ai-knowledgebase/)）、怎么更聪明（v2 多跳检索 + 看板）、怎么让数字可信（[知识库 2.0 卡片索引](/ai-learning/spu-reference-fusion/)）。

这篇把 2.0 时代的全部升级点一次性讲透：**每个点改了什么、为什么改、逻辑是什么、好处是什么**——不是"我做了这些"，而是"我为什么这么做"。

文末附一段**可以直接复制给任何 AI 助手的搭建包**：5 个可运行脚本 + 验收清单，AI 照着就能在一个全新目录里复刻整套架构。

> 本文数字均来自 2026-08-31 实测（记分卡 + 自动化清单交叉核验），非估算。你的数字不必相同，架构相同即可。

## 一、SPU 卡片索引层：知识库 2.0 的核心

**改了什么**：给每个物料编码（SPU）生成一张预聚合的标准答案卡（约 2KB JSON），把 AI 从"在 78,647 行长表里挑数"变成"读 1 张卡"。生产环境 23,743 张卡。

**为什么改**：RAG 的天花板是——**能找文件、算不准数字**。长表塞进上下文，模型挑数就像在电话簿里核对账单，看错行的概率永远不为零，而且错得理直气壮。我实测问过"铜管是不是涨价了"，RAG 捞回几段话，一对原始数据，数字全错。

**逻辑**：四层分工，每层只干自己擅长的事：

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

**好处**：铜管核查从 30-60 分钟人工透视压缩到 **6 秒**；上下文从全表 10.3MB 降到 59KB（**-99.4%**）；每个数字带"数据行号"指针可一键回溯；结构性事实（5 个铜管编码全是同一家供应商）粗筛一眼可见——这是议价谈判里最值钱的信息，传统透视几乎发现不了。

## 二、卡片 JSON 刻意不进 RAG：守边界设计

**改了什么**：卡片层与 RAG 索引物理隔离，`spu_reference/` 在排除清单里，RAG 永远不索引卡片。

**为什么改**：RAG 擅长语义匹配（"哪份文件讲了什么"），不擅长精确算数（"数字到底是多少"）。两者混用会互相污染——我的教训是 91 个过程回执文档混入索引，检索回归从 18/20 崩到 9/20。

**逻辑**：**RAG 管模糊知识，卡片管精确数字，LLM 只做解读判断，不做计算。** 边界清晰，各自的天花板就不再是彼此的瓶颈。

**好处**：召回质量稳定（verify 21/21 全绿）；数字可信、可审计；两个子系统独立演进，互不拖累。

## 三、P0 双锚点守恒校验：先验证再生产

**改了什么**：生成卡片前强制门禁——**行数 + 总额双锚点**（Decimal 精确到分），任一不符立即中止，不许带病生成。生产值：78,647 行 / ¥214,956,793.43。

**为什么改**：源数据本身可能带病——被误改、被部分替换、被重打包。带病生成 = 全部卡片错 = 所有下游结论错。

**逻辑**：双锚点分工——**哈希管"文件没被换"，数学锚点管"数据没被改"**。SHA 漂移不一定是事故（xlsx 重打包后数据等价，我实测全量对数差额 0.00），数学一致才是硬道理。

**好处**：全量对数差额 **0.00** 的可复现保证；审计、对账有据可依；"文件好像变了"不再直接阻塞流程。

## 四、verify 回归门禁强化：题库维护决策树

**改了什么**：回归从 **20 题/门禁 18 → 21 题/门禁 19**（实测 21/21，9 秒跑完）。每次增量同步后自动执行，覆盖业务/家庭/投资/健康/读书/知识管理 6 域，每题带"期望命中文件白名单"。

**为什么改**：索引是活的——文件会移动、归档、改名，题库期望路径会过时。没有维护规则，只能在"误报失败"和"放水通过"之间二选一，两个都是坑。

**逻辑**：**题库维护三步决策树**——① 命中语义正确但不在白名单 → 扩白名单子串（最常见，路径漂移）；② 期望文件已被迁移且无承接 → 换同域等价题；③ 命中文件本身不合规 → 修召回或排除清单。**禁止调低门禁、禁止删难题**——那是自欺欺人。

**好处**：每次同步 9 秒确认"索引今天能用"；"板材价格 11 天悬案"靠标准答案卡 + 决策树当天清零 21/21。

## 五、自动化防线扩容：7 → 13 个（单平台）

**改了什么**：从 7 个扩到 **13 个 ACTIVE 自动化**，全部收敛到单平台统一管理：

| 时刻 | 任务 |
|---|---|
| 每日 12:15 | 增量同步（含 reranker） |
| 每日 13:00 | 死链扫描+修复 |
| 每日 23:30 | 日报汇总 |
| 每日 23:50 | 全量聊天备份（幂等） |
| 每日 07:00 | Status Board 刷新 ×3 |
| 每日 07:30 | Pipeline 健康自愈检查 |
| 每日 00:05 | 深读续跑 |
| 周一 08:00 | 每周回顾蒸馏 |
| 周五 14:00 | 污染逃逸周度监控 |
| 周五 16:00 | 系统健康度周报 |
| 每 6 小时 | embedding 健康检查 |
| 每月 1 号 | 深度体检（六维+趋势） |
| 每月 30 号 | 卡片月度复验与扩展决策 |

**为什么改**：自动化本身也会失效——我的周报曾**静默失败 6 天无人察觉**（脚本成功扫了空目录然后正常退出）。只堆任务不套监控，等于没有自动化。

**逻辑**：从"任务触发"升级到"**任务自愈**"：自愈检查、污染监控、健康周报都是"给自动化再套一层自动化"。静默失败的克星 = 产物健康检查 + 消费端反馈。

**好处**：故障从"事后发现"提前到"当日暴露"；多平台调度收敛为单平台，审计口径统一。

## 六、质量记分卡：每日绿/黄/红

**改了什么**：同步流水线尾部挂 scorecard，每日输出 health 绿/黄/红 + 各指标环比（死链 / 缺 frontmatter / tag drift / INBOX 积压）。当日实测：**🟢 全绿**（死链 0 · frontmatter 0 · tag drift 0 · INBOX 积压 1）。

**为什么改**："索引健康"不能靠感觉——出问题才查 = 问题已经发生了。

**逻辑**：健康状态变成**每日可观测的日常数据**，带环比趋势，绿→黄→红自动分级。

**好处**：任何一天索引质量退化都能在记分卡上看到拐点；跨月对比看出"治理是变好还是变差"。

## 七、死链清零工程：~493 → 0

**改了什么**：死链存量从 **~493 条 → 0**，每日 13:00 自动扫描+修复，当日 0 新增。

**为什么改**：wikilink 指向不存在目标 = 知识网络断点。**链接即知识**：双向链接率 88.2% 的网络里有 493 个空洞，等于知识失联。

**逻辑**：每日扫描（dry-run）→ 人工确认 → 修复入库 → 复扫 0 新增。新产出笔记强制带"关联导航"出链段。

**好处**：知识网络无空洞，RAG 召回与链接结构互相强化（召回 80% → 95%+）；复刻者不会被死链误导。

## 八、反孤岛 + 关联导航义务：结构变更预检

**改了什么**：两条硬规则——① **新产出笔记必须自带"关联导航"出链段**（出链 >0，父级补入链）；② **动知识库结构前，先过一遍所有自动化任务的检测口径**。

**为什么改**：卡片体系上线当天，每天刷 3 次的孤岛索引把 3 份分析报告误判为"孤立文件"——写完报告忘了加正文链接。**任何自动化检测器的判定口径，都是新结构的潜在冲突点。**

**逻辑**：对每个自动化任务问三问：它**扫什么**（检测口径）/ **清什么**（清理规则）/ **建什么**（重建范围）？对照新结构找交集，冲突先修任务或先补链接，改完**真实运行一次验证**——配置保存 ≠ 有效。

**好处**："边优化边损坏"的循环被打破；每次结构升级后死链/孤岛复扫 0 新增，自动化不被新结构误伤。

## 九、供应商脱敏：SUP-007 代码

**改了什么**：卡片里的供应商是 `SUP-007` 这类代码，**真名只存在独立的映射文件**（`_supplier_mask.json`），不进任何索引。

**为什么改**：卡片体系可能暴露给多个 Agent 使用；供应商真名 = 业务敏感信息，泄露面要收敛。

**逻辑**：**数据与身份分离**——分析逻辑（金额/波动/集中度）完全不受脱敏影响，身份信息独立存放。

**好处**：卡片可安全交给任何 Agent 用，不怕泄露；符合数据安全守则的脱敏要求。

## 十、两个 v2 已写、这里补全因果的点

**单索引简化**：双索引（A 含表格聚合 / B 零表格）→ 单一生产索引。双索引翻倍存储与同步成本，但 B 索引几乎不被单独调用；表格聚合噪音改用"防爆块规则 + 排除清单"解决更彻底。**好处**：维护面减半，召回质量不降反升。

**三级记忆闭环**：聊天记录按价值分层——原始层（库外隔离，不进 RAG）→ 蒸馏层（每周回顾，进 RAG）→ 精华层（决策归档）。聊天原文 85%+ 是噪音，直入索引等于灌入 10 倍噪音。**好处**：盲测检索相似度 0.9+，"上周拍板了什么"这类问题 AI 能直接引用。

---

## 附录：AI 可执行搭建包（丢给 AI 就能照搭）

> 目标：任何 AI 助手拿到下面这份指令 + 代码，就能在一个全新目录里复刻"卡片索引 + 确定性分析链 + 幂等自动刷新"整套核心。代码已脱敏、无业务数据，可直接运行。

### 📋 复制这段给 AI 助手（总体指令）

```
你是「知识库 2.0 卡片索引层」搭建助手。请严格按以下要求执行：

1. 读取本文档附录中的代码块（generate_spu_cards.py / spu_loader.py /
   spu_screen.py / spu_cards_autoupdate.py / verify_cards_conservation.py），
   完整写入目标目录（如 ~/kb2-demo/），不遗漏、不改动逻辑
2. 准备或生成一份行级明细 Excel（列：日期/供应商/物料编码/物料名称/分类/
   数量/单价/金额），记录其【行数】与【总额】作为 P0 期望值
3. 依次执行并记录输出：
   a. python3 generate_spu_cards.py --source <明细> --out spu_reference \
        --expected-rows <行数> --expected-total <总额>
   b. python3 verify_cards_conservation.py --cards spu_reference \
        --expected-total <总额>
   c. python3 spu_screen.py --cards spu_reference --top 20
   d. 对 SPU-00001 及任意 4 张卡运行
      python3 spu_loader.py --cards spu_reference --source <明细> --spu <SPU>
      验证行号回溯与卡片金额一致
4. 配置幂等自动刷新：crontab 或自动化平台每日触发
   python3 spu_cards_autoupdate.py（参数同上）
5. 反孤岛自检：新产出的每份分析报告正文末尾必须带「关联导航」段（出链>0）；
   跑一次死链扫描，确认 0 新增
6. 逐项完成下方验收清单，汇报每项 PASS/FAIL 与关键输出

验收标准（全部满足才算完成）：
- P0 双锚点通过（行数/总额），无「带病生成」
- 全量对数验证差额 0.00
- 粗筛候选全部为真实品类（无「杂码桶」类结构性噪声）
- loader 下钻行号指回原始明细，行数/金额与卡片一致
- 第二次运行 autoupdate 且源文件未变 → 输出 [skip]（幂等生效）
- 卡片 JSON 未混入 RAG 索引（确认排除清单含 spu_reference/）

防坑要求：
- 金额一律 Decimal，禁止 float 求和（精度污染）
- 供应商真名只写进 _supplier_mask.json，卡片里必须是 SUP-xxx
- 任何脚本写入路径先校验不在排除清单内，校验失败直接退出报错
- 不运行任何真实业务数据——用演示数据完成全流程即可
```

### 目录骨架

```
~/kb2-demo/
├── data/                        # 行级明细（黄金源，唯一权威）
│   └── 采购明细.xlsx
├── spu_reference/               # 卡片索引层（刻意不进 RAG）
│   ├── cards/SPU-00001.json …   # 每物料编码一张
│   ├── _manifest.json           # 生成元信息（卡数/时间/源SHA）
│   ├── _source_sha.json         # 幂等刷新锚点（源文件哈希）
│   └── _supplier_mask.json      # 真名→代码映射（独立存放）
├── outputs/                     # 粗筛候选/分析报告（自带关联导航）
├── generate_spu_cards.py
├── spu_loader.py
├── spu_screen.py
├── spu_cards_autoupdate.py
└── verify_cards_conservation.py
```

### 1. generate_spu_cards.py：P0 预检 + 卡片生成

```python
#!/usr/bin/env python3
"""
generate_spu_cards.py — SPU 卡片索引生成器（v1.0）

输入：行级采购明细（Excel/CSV）
输出：SPU 卡片（JSON，每物料编码一张）+ _manifest.json + _source_sha.json

核心设计：
1. P0 双锚点预检（行数 + 总额，Decimal 精确）——对不上就停，不带病生成
2. 按物料编码聚合：累计金额 / 年度金额 / 年度均价（加权=金额÷数量）/
   供应商集(脱敏) / 单价区间 / 价格离散系数 / 数据行号指针
3. 卡片 JSON 刻意不进 RAG 索引——语义检索不擅长精确算数，各守边界

用法：
  python3 generate_spu_cards.py \
      --source data/采购明细.xlsx --out spu_reference \
      --expected-rows 78647 --expected-total 214956793.43
依赖：pip install pandas openpyxl
"""
import argparse
import hashlib
import json
import sys
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

import pandas as pd

# ============ 字段映射（换成你的表头） ============
COL_DATE, COL_SUPPLIER = "日期", "供应商"
COL_CODE, COL_NAME, COL_CAT = "物料编码", "物料名称", "分类"
COL_QTY, COL_PRICE, COL_AMOUNT = "数量", "单价", "金额"
# ==================================================

DISCRETE_WARN = 2.0   # 离散系数（max/min）≥ 该值 → 波动预警


def money(v: Decimal) -> str:
    """Decimal 精确两位，字符串存储避免 float 精度污染"""
    return str(v.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def mask_supplier(name: str, mapping: dict) -> str:
    """供应商脱敏：真名 → SUP-xxx。真名只存于 _supplier_mask.json。"""
    if name not in mapping:
        mapping[name] = f"SUP-{len(mapping) + 1:03d}"
    return mapping[name]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def p0_precheck(df: pd.DataFrame, expected_rows: int, expected_total: str) -> None:
    """P0 门禁：行数 + 总额双锚点。任一不符 → 中止，不许带病生成。"""
    rows = len(df)
    total = sum((Decimal(str(v)) for v in df[COL_AMOUNT].fillna(0)), Decimal("0"))
    print(f"[P0] 行数 {rows}（期望 {expected_rows}）· 总额 {money(total)}（期望 {expected_total}）")
    if rows != expected_rows:
        sys.exit(f"✗ P0 行数不符：{rows} != {expected_rows}，停止生成")
    if total != Decimal(str(expected_total)):
        sys.exit(f"✗ P0 总额不符：{total} != {expected_total}，停止生成")
    print("[P0] ✓ 双锚点通过，可以生成卡片")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True, help="行级明细 Excel/CSV")
    ap.add_argument("--out", required=True, help="卡片输出目录")
    ap.add_argument("--expected-rows", type=int, required=True)
    ap.add_argument("--expected-total", type=str, required=True)
    args = ap.parse_args()

    src, out = Path(args.source), Path(args.out)
    cards_dir = out / "cards"
    cards_dir.mkdir(parents=True, exist_ok=True)
    src_sha = sha256_file(src)

    df = pd.read_excel(src) if src.suffix in (".xlsx", ".xls") else pd.read_csv(src)
    df[COL_AMOUNT] = pd.to_numeric(df[COL_AMOUNT], errors="coerce").fillna(0)
    df[COL_QTY] = pd.to_numeric(df[COL_QTY], errors="coerce").fillna(0)
    df["_year"] = pd.to_datetime(df[COL_DATE], errors="coerce").dt.year
    df["_row"] = range(2, len(df) + 2)          # Excel 真实行号（1=表头）

    p0_precheck(df, args.expected_rows, args.expected_total)

    supplier_map: dict = {}
    seq = 0
    for code, g in df.groupby(COL_CODE, sort=False):
        seq += 1
        total = sum((Decimal(str(v)) for v in g[COL_AMOUNT]), Decimal("0"))
        prices = g.loc[g[COL_PRICE] > 0, COL_PRICE]
        p_min, p_max = float(prices.min()), float(prices.max())
        discrete = round(p_max / p_min, 2) if p_min > 0 else None
        top_sup = g[COL_SUPPLIER].value_counts().index[0]
        year_amt = {
            str(y): money(sum((Decimal(str(v)) for v in s[COL_AMOUNT]), Decimal("0")))
            for y, s in g.groupby("_year")
        }
        year_avg = {
            str(y): money((Decimal(str(s[COL_AMOUNT].sum())) / Decimal(str(s[COL_QTY].sum())))
                          if s[COL_QTY].sum() else Decimal("0"))
            for y, s in g.groupby("_year")
        }
        card = {
            "spu_id": f"SPU-{seq:05d}",
            "物料编码": code,
            "物料名称": g[COL_NAME].iloc[0],
            "分类": g[COL_CAT].iloc[0],
            "累计金额": money(total),
            "数据行号": g["_row"].tolist(),        # ← 指回 Excel 原始行
            "年度金额": year_amt,
            "年度均价": year_avg,
            "主供应商_脱敏": mask_supplier(top_sup, supplier_map),
            "供应商数": int(g[COL_SUPPLIER].nunique()),
            "价格离散系数": discrete,
            "波动预警": bool(discrete is not None and discrete >= DISCRETE_WARN),
            "数据源SHA256": src_sha,
            "p0_行数校验": True,
            "p0_总额校验": True,
        }
        (cards_dir / f"{card['spu_id']}.json").write_text(
            json.dumps(card, ensure_ascii=False, indent=2), encoding="utf-8")

    (out / "_supplier_mask.json").write_text(
        json.dumps(supplier_map, ensure_ascii=False, indent=2), encoding="utf-8")
    (out / "_source_sha.json").write_text(
        json.dumps({"path": str(src), "sha256": src_sha}, indent=2), encoding="utf-8")
    (out / "_manifest.json").write_text(json.dumps({
        "generated_at": pd.Timestamp.now().isoformat(timespec="seconds"),
        "card_count": seq,
        "source": str(src),
        "source_sha256": src_sha,
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[done] 卡片 {seq} 张 → {cards_dir}")
    print(f"[done] 供应商脱敏映射 {len(supplier_map)} 条（真名仅存此处）")


if __name__ == "__main__":
    main()
```

### 2. spu_loader.py：卡片 → 原始行的一跳桥

```python
#!/usr/bin/env python3
"""
spu_loader.py — 卡片 → 原始行的一跳桥（v1.0）

输入 spu_id，按卡片里的「数据行号」指针从源文件抽对应行。
任何卡片数字都能一键回溯原始明细——审计、复盘、跟供应商对账。

用法：
  python3 spu_loader.py --cards spu_reference --source data/采购明细.xlsx --spu SPU-005
"""
import argparse
import json
from pathlib import Path

import pandas as pd


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cards", required=True, help="卡片目录")
    ap.add_argument("--source", required=True, help="行级明细源文件")
    ap.add_argument("--spu", required=True, help="SPU id，如 SPU-005")
    args = ap.parse_args()

    card = json.loads((Path(args.cards) / "cards" / f"{args.spu}.json").read_text(encoding="utf-8"))
    rows = card["数据行号"]
    print(f"▶ {args.spu} · {card['物料名称']} · 累计金额 ¥{card['累计金额']} · 命中 {len(rows)} 行")

    src = Path(args.source)
    df = pd.read_excel(src) if src.suffix in (".xlsx", ".xls") else pd.read_csv(src)
    sub = df.iloc[[r - 2 for r in rows]]           # Excel 行号 → 0 基索引
    print(sub.to_string(max_rows=30))
    total = float(sub["金额"].astype(float).sum())
    print(f"\n📎 合计 {len(sub)} 行 · 金额合计 ¥{total:,.2f}（应等于卡片累计金额）")


if __name__ == "__main__":
    main()
```

### 3. spu_screen.py：粗筛分析链（三信号）

```python
#!/usr/bin/env python3
"""
spu_screen.py — 粗筛分析链（v1.0）

三信号排序，输出候选清单（每条带卡片指针）：
1. 价格离散：分层阈值——大金额档从严（离散≥2.0 预警），小金额档从宽（≥5.0）
2. 单价同比异动：年度均价同比 ≥10% 预警线
3. 供应商集中度：只在大额档看「单一供应商占比」

LLM 只做最后的解读，不做任何数据计算——数字全部来自卡片。

用法：
  python3 spu_screen.py --cards spu_reference --top 20
"""
import argparse
import json
from decimal import Decimal
from pathlib import Path

AMOUNT_BIG = Decimal("1000000")   # 大金额档阈值（元）


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cards", required=True)
    ap.add_argument("--top", type=int, default=20)
    args = ap.parse_args()

    hits = []
    for p in sorted((Path(args.cards) / "cards").glob("SPU-*.json")):
        c = json.loads(p.read_text(encoding="utf-8"))
        total = Decimal(c["累计金额"])
        warn_threshold = 2.0 if total >= AMOUNT_BIG else 5.0   # 分层阈值

        sig = []
        d = c["价格离散系数"]
        if d is not None and d >= warn_threshold:
            sig.append(f"离散{d}×")
        avgs = [Decimal(v) for v in c["年度均价"].values()]
        if len(avgs) >= 2 and avgs[-2] and (avgs[-1] - avgs[-2]) / avgs[-2] >= Decimal("0.10"):
            sig.append(f"同比涨{(avgs[-1] / avgs[-2] - 1) * 100:.1f}%")
        if total >= AMOUNT_BIG and c["供应商数"] == 1:
            sig.append("单一来源")

        if sig:
            hits.append((total, c["spu_id"], c["物料名称"], " / ".join(sig), c["数据行号"][:3]))

    hits.sort(key=lambda x: x[0], reverse=True)
    print(f"候选 {len(hits)} 个（取 Top {args.top}）\n")
    print("| SPU | 物料 | 累计金额 | 信号 | 行号指针 |")
    print("|---|---|---|---|---|")
    for total, spu, name, sig, rows in hits[: args.top]:
        print(f"| {spu} | {name} | ¥{total:,.2f} | {sig} | {rows} |")
    print("\n→ 交给 LLM 解读：为什么涨、是否单一来源、该不该谈——数据已锚定卡片。")


if __name__ == "__main__":
    main()
```

### 4. spu_cards_autoupdate.py：幂等自动刷新

```python
#!/usr/bin/env python3
"""
spu_cards_autoupdate.py — 幂等自动刷新（v1.0）

记录源文件 SHA-256：变了才重生成，没变就跳过。配合 crontab / 自动化平台
每天跑都行，零副作用（idempotent）。

用法（crontab 每日）：
  30 2 * * * cd ~/kb2-demo && python3 spu_cards_autoupdate.py \
      --source data/采购明细.xlsx --out spu_reference \
      --expected-rows 78647 --expected-total 214956793.43
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

from generate_spu_cards import sha256_file


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--expected-rows", type=int, required=True)
    ap.add_argument("--expected-total", type=str, required=True)
    args = ap.parse_args()

    src, out = Path(args.source), Path(args.out)
    sha_file = out / "_source_sha.json"
    current_sha = sha256_file(src)

    if sha_file.exists():
        old = json.loads(sha_file.read_text(encoding="utf-8"))
        if old.get("sha256") == current_sha:
            print(f"[skip] 源文件未变更（{current_sha[:12]}…），卡片保持现状")
            return

    print(f"[rebuild] 源文件已变更（{current_sha[:12]}…），重新生成卡片…")
    subprocess.run(
        [sys.executable, "generate_spu_cards.py",
         "--source", str(src), "--out", str(out),
         "--expected-rows", str(args.expected_rows),
         "--expected-total", args.expected_total],
        check=True,
    )
    print("[done] 幂等刷新完成")


if __name__ == "__main__":
    main()
```

### 5. verify_cards_conservation.py：全量对数验证

```python
#!/usr/bin/env python3
"""
verify_cards_conservation.py — 全量对数验证（v1.0）

卡片累计金额合计 vs 权威源总额 → 差额必须 0.00。
「先验证再生产」的最后一道闸：任何一张卡算错，这里都会现形。

用法：
  python3 verify_cards_conservation.py --cards spu_reference --expected-total 214956793.43
"""
import argparse
import json
import sys
from decimal import Decimal
from pathlib import Path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cards", required=True)
    ap.add_argument("--expected-total", type=str, required=True)
    args = ap.parse_args()

    total = sum(
        (Decimal(json.loads(p.read_text(encoding="utf-8"))["累计金额"])
         for p in (Path(args.cards) / "cards").glob("SPU-*.json")),
        Decimal("0"),
    )
    expect = Decimal(args.expected_total)
    diff = total - expect
    status = "✓ 差额 0.00" if diff == 0 else f"✗ 差额 {diff}"
    print(f"卡片合计 ¥{total:,.2f} vs 权威总额 ¥{expect:,.2f} → {status}")
    if diff != 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
```

### 验收清单（10 项，逐项 PASS/FAIL）

- [ ] **P0 双锚点**：generate 输出 `[P0] ✓ 双锚点通过`，无「带病生成」
- [ ] **卡片生成**：`_manifest.json` 的 card_count 与 `cards/` 实际文件数一致
- [ ] **对数验证**：verify_cards_conservation 输出「差额 0.00」，exit 0
- [ ] **行号回溯**：loader 下钻 ≥5 张卡，行数/金额与卡片累计金额一致
- [ ] **粗筛有效**：候选清单无「杂码桶」类结构性噪声（单价跨 0.01~628 元那种）
- [ ] **幂等生效**：源文件未变时第二次运行 autoupdate 输出 `[skip]`
- [ ] **触发刷新**：修改源文件 1 个数字后运行 autoupdate → 输出 `[rebuild]` 且对数仍 0.00
- [ ] **脱敏正确**：卡片里无供应商真名，全部 SUP-xxx；真名仅存在于 `_supplier_mask.json`
- [ ] **不进 RAG**：确认 RAG 排除清单含 `spu_reference/`（或等效卡片目录）
- [ ] **反孤岛**：新产出报告自带「关联导航」出链段，死链扫描 0 新增

---

*本文数字均来自 2026-08-31 实测（记分卡 + 自动化清单交叉核验）。搭建包代码为通用演示版，不含任何企业业务数据；接入真实数据前请先按正文的脱敏与 P0 规则自查。*
