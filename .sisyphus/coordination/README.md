# 跨IDE AI协作系统设计

> 版本：v1.0
> 日期：2026-02-22
> 目的：实现不同IDE中AI代理之间的进度协调和协作

---

## 1. 系统架构

### 1.1 核心概念

```
┌─────────────────────┐         ┌─────────────────────┐
│   IDE A (OpenCode)  │         │   IDE B (Cursor/等)  │
│   ┌───────────────┐ │         │ ┌───────────────┐   │
│   │  AI Agent A   │ │         │ │  AI Agent B   │   │
│   └───────┬───────┘ │         │ └───────┬───────┘   │
│           │         │         │         │           │
│           ▼         │         │         ▼           │
│   ┌─────────────────────────────────────────────┐   │
│   │     .sisyphus/coordination/                 │   │
│   │     (共享文件区 - 通过Git同步)              │   │
│   └─────────────────────────────────────────────┘   │
└─────────────────────┘         └─────────────────────┘
```

### 1.2 目录结构

```
.sisyphus/coordination/
├── README.md                 # 本文件 - 协作指南
├── PROGRESS.md               # 当前进度状态
├── AGENTS.md                 # 活跃AI代理注册表
├── TASKS.md                  # 任务状态追踪
├── COMMITS.md                # AI代理间通信记录
├── CONFLICTS.md              # 冲突检测和解决
├── SYNC-LOG.md               # 同步日志
└── tasks/                    # 各任务详细状态
    ├── phase1-wave1.md
    ├── phase1-wave2.md
    └── ...
```

---

## 2. 协作协议

### 2.1 初始化协作（双方必须执行）

**AI代理A（本IDE）**:
```markdown
<!-- 在 AGENTS.md 中注册 -->
- **Agent ID**: `agent-opencode-{timestamp}`
- **IDE**: OpenCode IDE
- **Session Start**: 2026-02-22T10:00:00Z
- **Working On**: Phase 1, Wave 1
- **Status**: Active
```

**AI代理B（另一个IDE）**:
```markdown
<!-- 在同一文件 AGENTS.md 中注册 -->
- **Agent ID**: `agent-cursor-{timestamp}`
- **IDE**: Cursor
- **Session Start**: 2026-02-22T10:05:00Z
- **Working On**: Phase 2, Wave 1
- **Status**: Active
```

### 2.2 进度更新协议

每次完成或开始任务时，AI代理必须：

1. **读取** `PROGRESS.md` 获取最新状态
2. **更新** 对应任务状态
3. **写入** 更新后的 `PROGRESS.md`
4. **记录** 通信到 `COMMITS.md`

### 2.3 冲突检测

**检测机制**：
- 如果两个代理同时修改同一任务，检测时间戳冲突
- 如果检测到冲突，写入 `CONFLICTS.md` 并通知双方

---

## 3. 文件格式规范

### 3.1 PROGRESS.md 格式

```markdown
# 进度追踪

> 最后更新: 2026-02-22T10:30:00Z
> 更新者: agent-opencode-001

## 统计

| 指标 | 值 |
|------|-----|
| 总任务数 | 52 |
| 已完成 | 5 |
| 进行中 | 2 |
| 阻塞中 | 0 |
| 完成率 | 10% |

## 当前阶段

- **Phase**: 1
- **Wave**: 2
- **活跃任务**: 1.6 Copilot认证流程

## 任务状态

### Phase 1: AI后端

#### Wave 1: 基础设施
| 任务 | 状态 | 负责代理 | 更新时间 |
|------|------|----------|----------|
| 1.1 AI Backend 抽象层 | ✅ 完成 | agent-opencode-001 | 2026-02-22T09:00:00Z |
| 1.2 AI 状态管理 Store | ✅ 完成 | agent-opencode-001 | 2026-02-22T09:30:00Z |
| 1.3 类型定义 | ✅ 完成 | agent-opencode-001 | 2026-02-22T09:45:00Z |
| 1.4 Copilot SDK 客户端 | ✅ 完成 | agent-opencode-001 | 2026-02-22T10:00:00Z |
| 1.5 IPC 通道扩展 | 🔄 进行中 | agent-opencode-001 | 2026-02-22T10:15:00Z |

#### Wave 2: Copilot 集成
| 任务 | 状态 | 负责代理 | 更新时间 |
|------|------|----------|----------|
| 2.1 Copilot 认证流程 | ⏳ 待开始 | - | - |
| ... | ... | ... | ... |
```

### 3.2 COMMITS.md 格式

```markdown
# AI代理通信记录

## 2026-02-22

### 10:00:00 - agent-opencode-001
- **动作**: 开始工作
- **任务**: Phase 1, Wave 1
- **消息**: 开始执行AI后端基础设施任务

### 10:30:00 - agent-cursor-001
- **动作**: 注册加入
- **任务**: Phase 2, Wave 1
- **消息**: 我将并行处理编辑器基础设施任务

### 11:00:00 - agent-opencode-001
- **动作**: 任务完成
- **任务**: 1.1 AI Backend 抽象层
- **消息**: 类型定义和接口已完成，请Phase 2的代理在需要时参考 `src/lib/ai-backend/types.ts`

### 11:05:00 - agent-cursor-001
- **动作**: 确认收到
- **消息**: 收到，我会在集成时参考这些类型

### 12:00:00 - agent-opencode-001
- **动作**: 请求协调
- **任务**: 3.1 ChatInputPanel公共组件拆分
- **消息**: 我即将创建 FileDropZone 组件，Phase 2的代理需要在 Wave 4 复用它
- **响应要求**: 请确认你们的编辑器拖拽需求
```

### 3.3 CONFLICTS.md 格式

```markdown
# 冲突记录

## 冲突 #1

- **检测时间**: 2026-02-22T14:00:00Z
- **冲突类型**: 任务重叠
- **涉及代理**: agent-opencode-001, agent-cursor-001
- **冲突任务**: FileDropZone.tsx 修改
- **状态**: ⚠️ 待解决

### 详情
两个代理同时修改了 `src/components/chat/input/FileDropZone.tsx`

### 解决方案
- agent-opencode-001 负责基础组件
- agent-cursor-001 负责编辑器集成扩展
- 需要协调合并

### 已执行
- [ ] 双方确认分工
- [ ] 合并代码
- [ ] 更新 PROGRESS.md
```

---

## 4. AI代理行为指南

### 4.1 开始工作时

```markdown
<!-- 步骤1: 读取当前状态 -->
1. 读取 .sisyphus/coordination/PROGRESS.md
2. 读取 .sisyphus/coordination/AGENTS.md
3. 读取 .sisyphus/coordination/COMMITS.md（最后5条）

<!-- 步骤2: 注册自己 -->
4. 在 AGENTS.md 中添加/更新自己的条目

<!-- 步骤3: 声明任务 -->
5. 在 PROGRESS.md 中标记要处理的任务为 "🔄 进行中"
6. 在 COMMITS.md 中记录开始消息
```

### 4.2 完成任务时

```markdown
<!-- 步骤1: 更新状态 -->
1. 在 PROGRESS.md 中标记任务为 "✅ 完成"
2. 更新统计信息

<!-- 步骤2: 通知其他代理 -->
3. 在 COMMITS.md 中记录完成消息
4. 如果是其他代理依赖的任务，明确说明

<!-- 步骤3: 检查阻塞 -->
5. 检查是否有其他任务被此任务阻塞
6. 如果有，更新它们的依赖状态
```

### 4.3 定期同步时

```markdown
<!-- 每30分钟或每个任务完成后 -->
1. 重新读取 PROGRESS.md
2. 检查是否有新消息（COMMITS.md）
3. 检查是否有冲突（CONFLICTS.md）
4. 如果有针对自己的消息，回复确认
```

### 4.4 遇到依赖阻塞时

```markdown
1. 在 COMMITS.md 中发布阻塞消息：
   - **动作**: 请求依赖
   - **阻塞任务**: [你的任务]
   - **依赖任务**: [需要的任务]
   - **请求**: 请 [agent-id] 确认依赖任务状态

2. 等待对方回复
3. 如果超过30分钟无回复，可以：
   - 自己完成依赖任务（如果是小任务）
   - 在 CONFLICTS.md 中记录问题
```

---

## 5. Git同步策略

### 5.1 提交规则

```bash
# 协调文件的提交消息格式
git add .sisyphus/coordination/
git commit -m "coord: [agent-id] update [task-id] status to [status]"

# 示例
git commit -m "coord: agent-opencode-001 update task-1.1 status to completed"
```

### 5.2 同步频率

- **任务开始/完成时**: 立即提交并推送
- **进行中**: 每30分钟提交一次进度
- **冲突发生时**: 立即提交并推送，通知对方

### 5.3 冲突解决

```bash
# 如果Git检测到协调文件冲突
# 1. 手动合并，保留两个代理的更改
# 2. 更新时间戳为合并时间
# 3. 在CONFLICTS.md中记录解决过程
```

---

## 6. 示例协作场景

### 场景1: 并行开发不同Phase

```
时间 | Agent A (OpenCode)        | Agent B (Cursor)
-----|---------------------------|---------------------------
10:00| 注册，开始Phase 1         |
10:05|                           | 注册，开始Phase 2
11:00| 完成任务1.1，通知         |
11:05|                           | 确认收到
12:00| 开始任务1.5               |
12:30|                           | 完成任务4.1，通知
12:35| 确认收到                  |
```

### 场景2: 依赖协调

```
时间 | Agent A (OpenCode)        | Agent B (Cursor)
-----|---------------------------|---------------------------
10:00| 开始创建FileDropZone      |
10:30|                           | 需要使用FileDropZone
10:31|                           | 询问进度
10:35| 回复：10分钟后完成        |
10:45| 完成FileDropZone，通知    |
10:46|                           | 开始使用FileDropZone
```

---

## 7. 故障恢复

### 7.1 如果协调文件损坏

```markdown
1. 从Git历史恢复最后一个有效版本
2. 两个代理重新同步状态
3. 重新构建PROGRESS.md
```

### 7.2 如果代理失联

```markdown
1. 在COMMITS.md中标记代理为"失联"
2. 等待1小时
3. 如果仍无响应，接手其任务
4. 在AGENTS.md中标记为"Inactive"
```

---

## 8. 快速参考

### 状态图标

| 图标 | 含义 |
|------|------|
| ⏳ | 待开始 |
| 🔄 | 进行中 |
| ✅ | 完成 |
| ❌ | 失败 |
| ⚠️ | 阻塞/冲突 |
| 🔒 | 锁定（其他代理正在处理） |

### 命令速查

| 动作 | 文件 | 格式 |
|------|------|------|
| 注册 | AGENTS.md | `- **Agent ID**: ...` |
| 开始任务 | PROGRESS.md | `🔄 进行中` |
| 完成任务 | PROGRESS.md | `✅ 完成` |
| 通知消息 | COMMITS.md | `### HH:MM:SS - [agent-id]` |
| 报告冲突 | CONFLICTS.md | `## 冲突 #N` |

---

**文档完**

*最后更新：2026-02-22*
*版本：v1.0*
