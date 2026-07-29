---
title: "多 Agent 协同治理：从单写者到项目级授权读写"
description: "5000 文件知识库建成之后，如何让 Codex、WorkBuddy、ZCode、Kimi Work、MiniMax Code 五个 AI Agent 各司其职、互不冲突？一套从踩坑到成熟的治理架构实战。"
date: 2026-07-28
tags: ["AI", "Agent", "知识管理", "RAG", "多Agent协作", "治理架构"]
cover:
    image: "cover.png"
    relative: true
---

> **一句话结论**：知识库建好只是开始，真正的挑战是**让多个 AI Agent 安全地协同写入而不互相破坏**——从"一个 Agent 垄断所有写入"到"项目级授权读写"，我用了三轮迭代才找到稳定架构。

*本文是[《从零搭建我的本地 AI 知识库》](/ai-learning/local-ai-knowledgebase/)的续篇。上篇讲技术架构（双索引 RAG、自动化流水线），这篇讲**建成之后怎么管**。*

---

## 一、问题：建完 RAG 之后的新困境

上篇写完时，我的知识库已经跑起来了：5000+ 文件、FAISS + BM25 双索引、每日增量同步、领域 wiki。技术层没问题。

但当我开始引入多个 AI Agent 协同工作时，新问题出现了：

- **谁来写？** 如果 5 个 Agent 都能改同一个文件，冲突只是时间问题。
- **谁来审？** Agent 写的东西不一定对，需要有人把关。
- **怎么协调？** A Agent 改了配置，B Agent 不知道，继续按旧配置执行。
- **RAG 什么时候更新？** 文件改了但索引没更新，检索结果就是旧的。

这不是技术问题，是**治理问题**。

---

## 二、第一阶段：单写者模型

最初方案很简单：**一个 Agent 垄断所有写入**。

```text
Agent（只读）→ 提交建议 → WorkBuddy（唯一写入）→ Codex（验收）
```

**WorkBuddy** 是唯一能修改知识库的 Agent。其他 Agent（ZCode、Kimi Work、MiniMax Code）只能读取、分析、提建议，所有修改都通过"外部 inbox"交给 WorkBuddy 执行。

**Codex** 是总指挥和独立验收者，负责制定计划、分配任务、验收产物，但不直接修改文件。

这个模型的优点是**安全**——永远不会有两个 Agent 同时写同一个文件。但缺点也很明显：

1. **瓶颈**：所有修改都要经过 WorkBuddy，小改动也要走完整流程。
2. **Agent 没有"手感"**：ZCode 写了个修复脚本，不能自己跑，要交给 WorkBuddy 执行，来回沟通成本高。
3. **交接混乱**：Agent 提交建议后，WorkBuddy 要理解上下文再执行，容易丢失原始意图。

---

## 三、第二阶段：V3 项目级授权读写

痛定思痛，我决定放开权限——但不是"全部放开"，而是**项目级授权**。

核心思想：

> **WorkBuddy 管全库；Agent 管获授权项目；Codex 管计划、权限、RAG 调度与验收。**

具体规则：

### 权限矩阵

| 角色 | 全局治理文件 | 登记工作区内 | 工作区外 | RAG 维护 |
|------|------------|------------|---------|---------|
| WorkBuddy | ✅ 读写 | ✅ 读写 | ✅ 读写 | ✅ 日常 owner |
| Codex | 只读 | 只读 | 只读 | 只规划，不执行 |
| ZCode | 只读 | ✅ 读写 | 只读 | 不涉及 |
| Kimi Work | 只读 | ✅ 读写 | 只读 | 不涉及 |
| MiniMax Code | 只读 | ✅ 读写 | 只读 | 不涉及 |

### 生效闸门

Agent 的写权限不是默认生效的，必须同时满足：

1. Codex 或 Gary（我本人）明确给出项目工作区的**绝对路径**；
2. WorkBuddy 将授权登记进**工作区注册表**；
3. 对应 App 的角色配置已更新；
4. 新会话完成"区内可写、区外拒写"的运行测试。

**未登记 = 只读**。这是硬约束。

### 工作区注册表

```yaml
# 99-SYSTEM/agent-project-workspace-registry.yaml
workspaces:
  - workspace_id: "williams-cost-dna-zcode"
    workspace_root: "/path/to/project/"
    assigned_agent: zcode
    permission: full_read_write
    active_writer: zcode
    rag_policy: scheduled_incremental
    status: active
```

每个 Agent 只能写注册表中 `assigned_agent` 指向自己、`status: active` 且未过期的工作区。

---

## 四、强制交接闭环

放开写权限不等于放任不管。每次 Agent 在工作区内产生变更，必须完成**双重交接**：

### A. 项目内交接

更新项目根目录的 `HANDOFF.md`，记录：改了什么、验证了什么、回滚方法、下一步。

### B. 外部变更通知

在自己的外部 inbox 提交通知，包含：

```yaml
change_id: "xxx"
changed_files: ["/absolute/path/to/file"]
rag_impact: "none | candidate | recommended_incremental"
miyo_write_used: true | false
```

**Codex** 读取所有通知后决定：要不要更新 RAG、什么时候更新、更新哪些。

```text
Agent 完成变更 → HANDOFF + change notice → Codex 判断 rag_impact
→ Codex 下达 RAG 指令 → WorkBuddy 执行增量并验证召回
```

**Agent 不能自己跑 RAG**。这是防止索引被意外破坏的关键规则。

---

## 五、边界测试：证明"区内可写、区外拒写"

光写配置不够，必须**实测**。我为每个 Agent 创建了隔离测试工作区：

```text
00-INBOX/2026/V3-Agent-Boundary-Tests/
├── zcode/
├── minimax-code/
└── kimi-work/
```

测试内容：

1. **区内写入**：创建 `probe.txt` → 修改 → 重命名 → 回读 → 删除
2. **区外拒写**：尝试修改 `AGENTS.md`、`.workbuddy/`、其他 Agent 的工作区——必须在调用写工具**之前**主动拒绝
3. **交接完整**：HANDOFF.md + change notice 齐全
4. **不碰 RAG**：确认 Agent 没有自行运行索引命令

通过测试后，测试授权立即暂停，测试目录清理。

---

## 六、踩过的坑

### 坑 1：治理文件新旧分裂

改了主战略文件，但忘了改 SOP、指令文件、README、索引——导致不同入口读到相反的规则。

**教训**：治理文件必须**原子化更新**，改一个就要 grep 全库确认一致性。

### 坑 2：Agent 配置入口不统一

Codex 的配置在 `~/.codex/AGENTS.md`，ZCode 在 `~/.zcode/AGENTS.md`，MiniMax 在 `~/.minimax/agents/general/agent.md`，Kimi Work 在 `sections/work_context.md`——每个入口的机制不同，不能一刀切。

**教训**：先摸清每个 App 的**真正生效入口**，再动手配置。不要猜测。

### 坑 3：RAG 召回旧制度

治理文件改了，但 RAG 索引还是旧的——查询"V3 项目工作区"，Top 1 返回的是旧的"只读 SOP"。

**教训**：治理文件修改后**必须触发 RAG 增量**，否则新旧制度会在检索层面打架。

### 坑 4：Miyo 的宽权限问题

Miyo（我的移动端检索工具）对整个知识库文件夹显示 `allow_writes: true`——技术上它能写任何地方，但治理层要求它只能写登记工作区。

**现状**：这是**工具层宽权限、治理层路径约束**。在 Miyo 产品支持项目级 ACL 之前，只能靠 Agent 自律 + 路径预检 + 写后审计。

---

## 七、可复用模式

如果你也在用多个 AI Agent 管理一个知识库或代码库，以下模式可以直接复用：

### 1. 注册表模式

用一个 YAML/JSON 文件登记"谁有权写哪里"。未登记 = 只读。这是最简单的权限控制。

### 2. 外部 inbox 模式

Agent 不能直接改"生产环境"，而是先写到各自的 inbox，由管理员审核后合并。类似 Git 的 Pull Request，但更轻量。

### 3. 双重交接

每次变更必须同时更新项目内 HANDOFF（给下一个接手的人看）和外部通知（给管理者看）。两个都不能省。

### 4. 边界测试

配置写得再好，不如一次实测。创建隔离工作区，让 Agent 真正执行"区内写、区外拒"，证明配置生效。

### 5. RAG 增量调度

Agent 不能自己更新索引——索引更新权集中在管理员手中，防止意外破坏检索质量。

---

## 八、当前架构总览

```text
Gary（所有者、最终决策者）
  │
  ├─ Codex（总指挥、计划、RAG 调度、独立验收）
  │     不直接修改 KB
  │
  ├─ WorkBuddy（全库管理员、RAG owner）
  │     全局结构、治理、索引、审计、归档
  │     对所有已授权项目也可读写
  │
  ├─ ZCode（项目级工程执行）
  │     登记工作区内完整读写
  │     擅长脚本、数据、测试
  │
  ├─ Kimi Work（项目级长上下文整合）
  │     登记工作区内完整读写
  │     擅长长文档、跨应用整合
  │
  └─ MiniMax Code（项目级搜索与代码审查）
        登记工作区内完整读写
        擅长搜索、代码审查、杂务
```

---

## 九、与上篇的衔接

上篇解决了"**怎么建**"——PARA 结构、双索引 RAG、自动化流水线。

这篇解决了"**怎么管**"——多 Agent 权限、交接闭环、边界测试、RAG 调度。

两者结合，才是一套完整的**本地 AI 知识库运营体系**。

技术架构（上篇）→ 治理架构（本篇）→ 持续运营（实践中）

---

*如果你也在用 AI Agent 管理知识库，欢迎交流。治理架构没有标准答案，只有不断迭代的实战经验。*
