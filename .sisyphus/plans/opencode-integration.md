# OpenCode SDK 集成计划

## TL;DR

> **Quick Summary**: 将 Electron IDE 与 OpenCode 集成，使用 @opencode-ai/sdk 作为 AI 后端客户端，保留本地模型用于项目索引和上下文总结。支持多项目切换、自动发现 OpenCode Server、状态栏连接指示器。
> 
> **Deliverables**:
> - OpenCode SDK 集成层
> - 多项目目录管理
> - 本地模型索引系统
> - 连接状态指示器
> - 权限配置 UI
> - 流式响应 UI

> **Estimated Effort**: Medium（2-3周）
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: SDK 集成 → 会话系统 → 索引系统 → UI 集成

---

## Context

### Original Request
用户希望将 Electron IDE 项目与 OpenCode 集成，或以 OpenCode 作为后端对接。经过评估，选择仅使用 `@opencode-ai/sdk` 作为客户端，用户自行安装运行 OpenCode。

### Interview Summary

**Key Discussions**:
- **集成方式**: 仅使用 @opencode-ai/sdk，用户自行安装运行 OpenCode
- **AI 提供商**: 多提供商支持，本地模型用于索引
- **权限处理**: 用户可配置权限级别（自动批准/确认/分级）
- **本地模型**: 作为上下文总结/目录索引方案
- **配置方式**: 自动发现 OpenCode Server + 默认值
- **连接状态**: 状态栏指示器
- **索引触发**: 文件管理器"同步索引"按钮 + 文件更新时增量更新
- **项目模式**: 多项目切换，每项目独立会话和索引

**Technical Decisions**:
- 使用 `@opencode-ai/sdk` (v0.15.18) 作为 API 客户端
- SSE (Server-Sent Events) 处理实时事件流
- Zustand 扩展管理连接状态和项目状态
- 本地模型通过 Ollama 运行，用于索引生成
- 增量索引系统，文件变更时自动更新

### OpenCode API 端点

| 端点 | 用途 |
|------|------|
| `POST /session` | 创建会话 |
| `POST /session/{id}/prompt` | 发送提示 |
| `GET /global/event` | SSE 事件流 |
| `GET /question` | 获取待处理问题 |
| `POST /question/{id}/reply` | 回答问题 |
| `GET /config` | 获取配置 |

---

## Work Objectives

### Core Objective
实现一个完整的 OpenCode 客户端集成，支持：
1. 自动发现和连接本地 OpenCode Server
2. 多项目目录管理和切换
3. 实时会话和流式响应
4. 本地模型驱动的项目索引
5. 可配置的工具执行权限

### Concrete Deliverables
- `src/lib/opencode/` - SDK 集成层
- `src/store/connection-store.ts` - 连接状态管理
- `src/store/project-store.ts` - 项目状态管理
- `src/components/statusbar/ConnectionIndicator.tsx` - 连接指示器
- `src/components/explorer/IndexButton.tsx` - 同步索引按钮
- `src/components/settings/PermissionConfig.tsx` - 权限配置
- `src/main/indexer/` - 本地模型索引系统

### Definition of Done
- [ ] 可自动发现并连接本地 OpenCode Server
- [ ] 状态栏显示连接状态
- [ ] 多项目切换正常工作
- [ ] 聊天功能使用真实 AI（非占位）
- [ ] 流式响应正常显示
- [ ] 索引按钮可触发本地模型索引
- [ ] 权限配置可保存和加载

### Must Have
- OpenCode SDK 集成
- 自动发现连接
- 多项目支持
- 流式响应
- 本地模型索引

### Must NOT Have (Guardrails)
- 不要在 Electron 内启动 OpenCode 进程（用户自行运行）
- 不要硬编码 OpenCode Server 地址（使用自动发现）
- 不要在渲染进程直接调用本地模型（通过主进程 IPC）
- 不要阻塞 UI 线程（索引操作异步进行）

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: 需要检查
- **Automated tests**: 单元测试
- **Framework**: bun test
- **TDD**: 核心逻辑使用 TDD（SDK 集成、状态管理）

### QA Policy
每个任务包含 Agent-Executed QA Scenarios。

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (基础设施 - 6 并行):
├── Task 1: 安装 SDK + 类型定义 [quick]
├── Task 2: 连接状态 Store [quick]
├── Task 3: OpenCode 客户端封装 [quick]
├── Task 4: 自动发现逻辑 [quick]
├── Task 5: 项目状态 Store [quick]
└── Task 6: IPC 通道扩展 [quick]

Wave 2 (核心功能 - 4 并行):
├── Task 7: 会话管理服务 [deep]
├── Task 8: 流式响应处理 [deep]
├── Task 9: 权限请求处理 [unspecified-high]
└── Task 10: 本地模型客户端 [unspecified-high]

Wave 3 (索引系统 - 顺序):
├── Task 11: 索引管理器 [deep]
├── Task 12: 增量索引更新 [deep]
└── Task 13: 索引持久化 [quick]

Wave 4 (UI 集成 - 5 并行):
├── Task 14: 状态栏连接指示器 [visual-engineering]
├── Task 15: Chat 面板重构 [visual-engineering]
├── Task 16: 文件管理器索引按钮 [visual-engineering]
├── Task 17: 权限配置面板 [visual-engineering]
└── Task 18: 项目选择器 [visual-engineering]

Wave FINAL (验证 - 4 并行):
├── Task F1: 功能完整性检查 [oracle]
├── Task F2: 代码质量审查 [unspecified-high]
├── Task F3: 实际场景测试 [unspecified-high]
└── Task F4: 范围一致性检查 [deep]
```

---

## TODOs

### Wave 1: 基础设施

- [ ] 1. 安装 SDK + 类型定义

  **What to do**:
  - 安装 `@opencode-ai/sdk` npm 包
  - 创建 `src/lib/opencode/types.ts` 定义扩展类型
  - 定义连接状态枚举、项目配置接口、权限配置接口

  **Must NOT do**:
  - 不要安装 `@opencode-ai/plugin`（仅使用 SDK）
  - 不要创建重复的类型定义（复用 SDK 类型）

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: 无特殊要求

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-6)
  - **Blocks**: Task 3, 7

  **References**:
  - `src/store/index.ts` - 现有状态管理结构
  - `src/types/index.ts` - 现有类型定义模式

  **Acceptance Criteria**:
  - [ ] `@opencode-ai/sdk` 安装成功
  - [ ] 类型定义文件创建完成
  - [ ] TypeScript 编译通过

  **QA Scenarios**:
  ```
  Scenario: SDK 导入验证
    Tool: Bash
    Steps:
      1. cd opencode-ide
      2. node -e "require('@opencode-ai/sdk')"
    Expected Result: 无错误输出
    Evidence: .sisyphus/evidence/task-01-sdk-import.log
  ```

  **Commit**: YES
  - Message: `feat(sdk): add @opencode-ai/sdk and type definitions`
  - Files: `package.json`, `src/lib/opencode/types.ts`

---

- [ ] 2. 连接状态 Store

  **What to do**:
  - 创建 `src/store/connection-store.ts`
  - 实现连接状态管理：status, serverUrl, lastError
  - 实现重连逻辑
  - 集成到主 Store

  **Must NOT do**:
  - 不要在 Store 中直接发起网络请求（使用 service 层）

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: 无特殊要求

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 14

  **References**:
  - `src/store/index.ts:21-50` - 现有 Store 结构
  - `src/types/index.ts` - 现有类型模式

  **Acceptance Criteria**:
  - [ ] ConnectionStore 创建完成
  - [ ] 状态类型完整（status, serverUrl, lastError, reconnectAttempts）
  - [ ] 有 connect/disconnect/reconnect actions
  - [ ] 单元测试通过

  **QA Scenarios**:
  ```
  Scenario: Store 状态更新
    Tool: Bash
    Steps:
      1. bun test src/store/connection-store.test.ts
    Expected Result: 所有测试通过
    Evidence: .sisyphus/evidence/task-02-store-test.log
  ```

  **Commit**: YES
  - Message: `feat(store): add connection state management`
  - Files: `src/store/connection-store.ts`, `src/store/index.ts`

---

- [ ] 3. OpenCode 客户端封装

  **What to do**:
  - 创建 `src/lib/opencode/client.ts`
  - 封装 SDK 的 Session、Question、Config 等 API
  - 添加错误处理和重试逻辑
  - 实现 SSE 事件订阅封装

  **Must NOT do**:
  - 不要硬编码服务器地址
  - 不要忽略网络错误

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: 无特殊要求

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 7, 8

  **References**:
  - SDK 文档: `https://deepwiki.com/sst/opencode/7.1-javascripttypescript-sdk`
  - API 端点: `/session`, `/question`, `/config`, `/global/event`

  **Acceptance Criteria**:
  - [ ] OpenCodeClient 类创建完成
  - [ ] 封装 Session API（create, prompt, abort）
  - [ ] 封装 Question API（list, reply, reject）
  - [ ] SSE 事件订阅封装
  - [ ] 单元测试通过

  **QA Scenarios**:
  ```
  Scenario: 客户端实例化
    Tool: Bash
    Steps:
      1. bun test src/lib/opencode/client.test.ts
    Expected Result: 所有测试通过
    Evidence: .sisyphus/evidence/task-03-client-test.log
  ```

  **Commit**: YES
  - Message: `feat(sdk): implement OpenCode client wrapper`
  - Files: `src/lib/opencode/client.ts`

---

- [ ] 4. 自动发现逻辑

  **What to do**:
  - 创建 `src/lib/opencode/discovery.ts`
  - 实现本地 OpenCode Server 发现
  - 尝试默认端口（根据 OpenCode 文档确定）
  - 实现健康检查

  **Must NOT do**:
  - 不要阻塞主线程（使用异步）
  - 不要假设 OpenCode 一定在运行

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: 无特殊要求

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 14

  **References**:
  - OpenCode 默认端口需查文档确认

  **Acceptance Criteria**:
  - [ ] discoverOpenCodeServer() 函数实现
  - [ ] 支持多端口尝试
  - [ ] 健康检查正常工作
  - [ ] 返回发现结果或 null

  **QA Scenarios**:
  ```
  Scenario: 发现逻辑测试（无 OpenCode 运行）
    Tool: Bash
    Steps:
      1. bun test src/lib/opencode/discovery.test.ts
    Expected Result: 返回 null，无错误
    Evidence: .sisyphus/evidence/task-04-discovery-test.log
  ```

  **Commit**: YES
  - Message: `feat(sdk): implement OpenCode server discovery`
  - Files: `src/lib/opencode/discovery.ts`

---

- [ ] 5. 项目状态 Store

  **What to do**:
  - 创建 `src/store/project-store.ts`
  - 实现多项目目录管理
  - 每项目独立会话 ID 和索引状态
  - 项目切换逻辑

  **Must NOT do**:
  - 不要在 Store 中存储大量文件内容（仅存元数据）

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: 无特殊要求

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 11, 18

  **References**:
  - `src/store/index.ts` - 现有 Store 结构
  - `src/types/index.ts:FileItem` - 文件类型

  **Acceptance Criteria**:
  - [ ] ProjectStore 创建完成
  - [ ] 支持添加/移除/切换项目
  - [ ] 每项目有独立状态
  - [ ] 单元测试通过

  **QA Scenarios**:
  ```
  Scenario: 多项目切换
    Tool: Bash
    Steps:
      1. bun test src/store/project-store.test.ts
    Expected Result: 所有测试通过
    Evidence: .sisyphus/evidence/task-05-project-test.log
  ```

  **Commit**: YES
  - Message: `feat(store): add multi-project state management`
  - Files: `src/store/project-store.ts`, `src/store/index.ts`

---

- [ ] 6. IPC 通道扩展

  **What to do**:
  - 扩展 `electron/preload.js` 添加索引相关 IPC
  - 添加 IPC 通道：`indexer:start`, `indexer:status`, `indexer:result`
  - 扩展 `electron/main.js` 添加处理器

  **Must NOT do**:
  - 不要暴露敏感 API 给渲染进程
  - 不要在 preload 中执行耗时操作

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: 无特殊要求

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 10, 11

  **References**:
  - `electron/main.js:407-510` - 现有 IPC 处理器
  - `electron/preload.js` - 现有 preload 脚本

  **Acceptance Criteria**:
  - [ ] 新增 indexer 相关 IPC 通道
  - [ ] preload.js 暴露新 API
  - [ ] 类型定义更新

  **QA Scenarios**:
  ```
  Scenario: IPC 通道验证
    Tool: Bash
    Steps:
      1. grep "indexer" electron/preload.js
    Expected Result: 找到 indexer 相关定义
    Evidence: .sisyphus/evidence/task-06-ipc.log
  ```

  **Commit**: YES
  - Message: `feat(ipc): add indexer IPC channels`
  - Files: `electron/main.js`, `electron/preload.js`

---

### Wave 2: 核心功能

- [ ] 7. 会话管理服务

  **What to do**:
  - 创建 `src/lib/opencode/session-service.ts`
  - 实现会话创建、恢复、切换
  - 与 OpenCode SDK 集成
  - 会话历史管理

  **Must NOT do**:
  - 不要在渲染进程存储敏感数据

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: 无特殊要求

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 8-10)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 15

  **References**:
  - SDK Session API: `POST /session`, `POST /session/{id}/prompt`
  - `src/store/index.ts:messages` - 现有消息存储

  **Acceptance Criteria**:
  - [ ] SessionService 类创建
  - [ ] createSession() 正常工作
  - [ ] sendPrompt() 调用 SDK
  - [ ] 会话状态同步到 Store
  - [ ] 单元测试通过

  **QA Scenarios**:
  ```
  Scenario: 会话创建（需要 OpenCode 运行）
    Tool: Bash
    Preconditions: OpenCode Server 运行中
    Steps:
      1. bun test src/lib/opencode/session-service.test.ts --integration
    Expected Result: 会话创建成功
    Evidence: .sisyphus/evidence/task-07-session-test.log
  ```

  **Commit**: YES
  - Message: `feat(core): implement session management service`
  - Files: `src/lib/opencode/session-service.ts`

---

- [ ] 8. 流式响应处理

  **What to do**:
  - 创建 `src/lib/opencode/stream-handler.ts`
  - 处理 SSE 事件流
  - 实现增量更新 UI
  - 处理流中断和错误

  **Must NOT do**:
  - 不要在主线程阻塞处理流数据
  - 不要忽略流错误

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: 无特殊要求

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 15

  **References**:
  - SDK Event API: `GET /global/event`
  - 事件类型: EventMessageUpdated, EventQuestionAsked 等

  **Acceptance Criteria**:
  - [ ] StreamHandler 类创建
  - [ ] SSE 连接管理
  - [ ] 事件分发到 Store
  - [ ] 错误处理和重连
  - [ ] 单元测试通过

  **QA Scenarios**:
  ```
  Scenario: 流式响应模拟
    Tool: Bash
    Steps:
      1. bun test src/lib/opencode/stream-handler.test.ts
    Expected Result: 事件正确分发
    Evidence: .sisyphus/evidence/task-08-stream-test.log
  ```

  **Commit**: YES
  - Message: `feat(core): implement SSE stream handler`
  - Files: `src/lib/opencode/stream-handler.ts`

---

- [ ] 9. 权限请求处理

  **What to do**:
  - 创建 `src/lib/opencode/permission-service.ts`
  - 处理 OpenCode 工具执行权限请求
  - 根据用户配置自动响应或提示
  - 权限配置持久化

  **Must NOT do**:
  - 不要默认批准所有权限（安全风险）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: 无特殊要求

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 17

  **References**:
  - SDK Question API: `GET /question`, `POST /question/{id}/reply`
  - 权限级别: auto-approve, confirm, per-tool

  **Acceptance Criteria**:
  - [ ] PermissionService 类创建
  - [ ] 权限请求监听
  - [ ] 根据配置自动响应
  - [ ] 待确认权限队列
  - [ ] 单元测试通过

  **QA Scenarios**:
  ```
  Scenario: 权限自动批准
    Tool: Bash
    Steps:
      1. bun test src/lib/opencode/permission-service.test.ts
    Expected Result: 配置为 auto-approve 时自动批准
    Evidence: .sisyphus/evidence/task-09-permission-test.log
  ```

  **Commit**: YES
  - Message: `feat(core): implement permission handling service`
  - Files: `src/lib/opencode/permission-service.ts`

---

- [ ] 10. 本地模型客户端

  **What to do**:
  - 创建 `src/main/model/client.ts`（主进程）
  - 实现 Ollama API 客户端
  - 支持流式输出
  - 健康检查和错误处理

  **Must NOT do**:
  - 不要在渲染进程直接调用模型（安全）
  - 不要硬编码模型名称

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: 无特殊要求

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 11

  **References**:
  - `本地模型集成方案/本地模型集成方案.md` - 本地模型规划
  - Ollama API: `POST /api/generate`

  **Acceptance Criteria**:
  - [ ] OllamaClient 类创建
  - [ ] 支持流式生成
  - [ ] 健康检查实现
  - [ ] 错误处理完善
  - [ ] 单元测试通过

  **QA Scenarios**:
  ```
  Scenario: Ollama 客户端测试
    Tool: Bash
    Steps:
      1. bun test src/main/model/client.test.ts
    Expected Result: 客户端正常工作
    Evidence: .sisyphus/evidence/task-10-ollama-test.log
  ```

  **Commit**: YES
  - Message: `feat(model): implement Ollama client for local models`
  - Files: `src/main/model/client.ts`

---

### Wave 3: 索引系统

- [ ] 11. 索引管理器

  **What to do**:
  - 创建 `src/main/indexer/manager.ts`
  - 实现项目索引生成流程
  - 调用本地模型生成索引
  - 索引结构定义

  **Must NOT do**:
  - 不要阻塞主进程（使用 worker 或异步）
  - 不要索引超大文件（跳过或分块）

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: 无特殊要求

  **Parallelization**:
  - **Can Run In Parallel**: NO (依赖 Task 10)
  - **Blocks**: Task 12, 16

  **References**:
  - `本地模型集成方案/本地模型集成方案.md:161-188` - 索引数据结构
  - 模型: Llama 3.2 3B（索引生成）

  **Acceptance Criteria**:
  - [ ] IndexManager 类创建
  - [ ] 全量索引生成
  - [ ] 索引结构标准化
  - [ ] 进度回调支持
  - [ ] 单元测试通过

  **QA Scenarios**:
  ```
  Scenario: 索引生成
    Tool: Bash
    Preconditions: Ollama 运行中，llama3.2:3b 模型可用
    Steps:
      1. bun test src/main/indexer/manager.test.ts --integration
    Expected Result: 索引生成成功
    Evidence: .sisyphus/evidence/task-11-index-test.log
  ```

  **Commit**: YES
  - Message: `feat(indexer): implement project indexer manager`
  - Files: `src/main/indexer/manager.ts`

---

- [ ] 12. 增量索引更新

  **What to do**:
  - 创建 `src/main/indexer/incremental.ts`
  - 实现文件变更检测
  - 增量更新索引条目
  - 文件删除时移除索引

  **Must NOT do**:
  - 不要每次变更都重建整个索引
  - 不要忽略文件删除

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: 无特殊要求

  **Parallelization**:
  - **Can Run In Parallel**: NO (依赖 Task 11)
  - **Blocks**: Task 16

  **References**:
  - `本地模型集成方案/本地模型集成方案.md:188-199` - 增量更新策略

  **Acceptance Criteria**:
  - [ ] IncrementalIndexer 类创建
  - [ ] 文件变更监听
  - [ ] 增量更新逻辑
  - [ ] 删除处理
  - [ ] 单元测试通过

  **QA Scenarios**:
  ```
  Scenario: 增量更新测试
    Tool: Bash
    Steps:
      1. bun test src/main/indexer/incremental.test.ts
    Expected Result: 增量更新正常
    Evidence: .sisyphus/evidence/task-12-incremental-test.log
  ```

  **Commit**: YES
  - Message: `feat(indexer): implement incremental index updates`
  - Files: `src/main/indexer/incremental.ts`

---

- [ ] 13. 索引持久化

  **What to do**:
  - 创建 `src/main/indexer/storage.ts`
  - 索引数据存储到磁盘
  - 索引加载和缓存
  - 过期策略

  **Must NOT do**:
  - 不要存储在用户项目目录外（遵循项目隔离）
  - 不要无限制缓存

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: 无特殊要求

  **Parallelization**:
  - **Can Run In Parallel**: NO (依赖 Task 12)
  - **Blocks**: Task 16

  **References**:
  - 存储位置: `.opencode/index/` 或项目配置目录

  **Acceptance Criteria**:
  - [ ] IndexStorage 类创建
  - [ ] 保存/加载索引
  - [ ] 缓存机制
  - [ ] 过期清理
  - [ ] 单元测试通过

  **QA Scenarios**:
  ```
  Scenario: 索引持久化
    Tool: Bash
    Steps:
      1. bun test src/main/indexer/storage.test.ts
    Expected Result: 保存和加载正常
    Evidence: .sisyphus/evidence/task-13-storage-test.log
  ```

  **Commit**: YES
  - Message: `feat(indexer): implement index persistence`
  - Files: `src/main/indexer/storage.ts`

---

### Wave 4: UI 集成

- [ ] 14. 状态栏连接指示器

  **What to do**:
  - 创建 `src/components/statusbar/ConnectionIndicator.tsx`
  - 显示连接状态图标和文字
  - 断开时显示重连按钮
  - 点击显示连接详情

  **Must NOT do**:
  - 不要阻塞 UI 渲染
  - 不要频繁更新状态（节流）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 15-18)
  - **Blocks**: Task F3

  **References**:
  - `src/components/layout/index.tsx` - 现有布局组件
  - 设计风格: GitHub Dark 主题

  **Acceptance Criteria**:
  - [ ] 组件创建完成
  - [ ] 状态显示正确
  - [ ] 重连按钮可用
  - [ ] 样式符合主题

  **QA Scenarios**:
  ```
  Scenario: 连接指示器显示
    Tool: Playwright
    Preconditions: 应用启动
    Steps:
      1. 启动应用
      2. 检查状态栏右侧
      3. 验证连接状态显示
    Expected Result: 显示连接状态（connected/disconnected）
    Evidence: .sisyphus/evidence/task-14-indicator.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add connection indicator to status bar`
  - Files: `src/components/statusbar/ConnectionIndicator.tsx`

---

- [ ] 15. Chat 面板重构

  **What to do**:
  - 重构 `src/components/chat/index.tsx`
  - 集成真实 AI 响应
  - 流式响应显示
  - 错误状态处理

  **Must NOT do**:
  - 不要保留占位响应代码
  - 不要阻塞 UI 等待响应

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Task F3

  **References**:
  - `src/components/chat/index.tsx:59-90` - 现有 handleSubmit
  - `src/lib/opencode/session-service.ts` - 会话服务

  **Acceptance Criteria**:
  - [ ] 真实 AI 响应集成
  - [ ] 流式响应显示
  - [ ] 错误处理
  - [ ] 加载状态
  - [ ] 代码高亮（如支持）

  **QA Scenarios**:
  ```
  Scenario: 发送消息获取响应
    Tool: Playwright
    Preconditions: OpenCode Server 运行中
    Steps:
      1. 启动应用
      2. 在聊天输入框输入 "Hello"
      3. 点击发送
      4. 等待响应
    Expected Result: 显示 AI 响应
    Evidence: .sisyphus/evidence/task-15-chat-response.png
  ```

  **Commit**: YES
  - Message: `feat(ui): integrate real AI responses in chat panel`
  - Files: `src/components/chat/index.tsx`

---

- [ ] 16. 文件管理器索引按钮

  **What to do**:
  - 创建 `src/components/explorer/IndexButton.tsx`
  - 添加"同步索引"按钮
  - 显示索引进度
  - 索引完成通知

  **Must NOT do**:
  - 不要在索引进行中禁用整个 UI

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Task F3

  **References**:
  - `src/components/explorer/index.tsx` - 现有文件管理器
  - IPC: `indexer:start`, `indexer:status`

  **Acceptance Criteria**:
  - [ ] 按钮组件创建
  - [ ] 进度显示
  - [ ] 完成通知
  - [ ] 样式一致

  **QA Scenarios**:
  ```
  Scenario: 触发索引
    Tool: Playwright
    Preconditions: Ollama 运行中
    Steps:
      1. 启动应用
      2. 在文件管理器找到索引按钮
      3. 点击按钮
      4. 等待索引完成
    Expected Result: 显示索引进度和完成状态
    Evidence: .sisyphus/evidence/task-16-index-button.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add index sync button to file explorer`
  - Files: `src/components/explorer/IndexButton.tsx`

---

- [ ] 17. 权限配置面板

  **What to do**:
  - 创建 `src/components/settings/PermissionConfig.tsx`
  - 权限级别选择（自动批准/确认/分级）
  - 工具级别权限配置
  - 配置持久化

  **Must NOT do**:
  - 不要默认选择"自动批准"

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Task F3

  **References**:
  - 权限级别: auto-approve, confirm, tiered
  - 存储: electron-store

  **Acceptance Criteria**:
  - [ ] 配置面板创建
  - [ ] 权限级别选择器
  - [ ] 工具列表配置
  - [ ] 配置保存和加载

  **QA Scenarios**:
  ```
  Scenario: 权限配置保存
    Tool: Playwright
    Steps:
      1. 启动应用
      2. 打开设置
      3. 切换权限级别
      4. 保存设置
      5. 重启应用
      6. 检查设置保持
    Expected Result: 设置保存成功
    Evidence: .sisyphus/evidence/task-17-permission-config.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add permission configuration panel`
  - Files: `src/components/settings/PermissionConfig.tsx`

---

- [ ] 18. 项目选择器

  **What to do**:
  - 创建 `src/components/layout/ProjectSelector.tsx`
  - 项目列表显示
  - 项目切换
  - 添加/移除项目

  **Must NOT do**:
  - 不要在切换时丢失未保存数据

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Task F3

  **References**:
  - `src/store/project-store.ts` - 项目状态
  - 位置: Activity Bar 或 Sidebar 顶部

  **Acceptance Criteria**:
  - [ ] 项目选择器组件
  - [ ] 项目列表显示
  - [ ] 切换功能
  - [ ] 添加项目对话框

  **QA Scenarios**:
  ```
  Scenario: 项目切换
    Tool: Playwright
    Steps:
      1. 启动应用
      2. 点击项目选择器
      3. 选择不同项目
    Expected Result: 项目切换成功，文件树更新
    Evidence: .sisyphus/evidence/task-18-project-selector.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add project selector component`
  - Files: `src/components/layout/ProjectSelector.tsx`

---

## Final Verification Wave (MANDATORY)

- [ ] F1. **Plan Compliance Audit** — `oracle`
  验证所有 Must Have 功能存在，所有 Must NOT Have 不存在

- [ ] F2. **Code Quality Review** — `unspecified-high`
  运行 `tsc --noEmit` + linter + `bun test`。检查 AI slop 模式

- [ ] F3. **Real Manual QA** — `unspecified-high`
  执行所有 QA 场景，验证真实功能

- [ ] F4. **Scope Fidelity Check** — `deep`
  验证实现与计划一致，无范围蔓延

---

## Commit Strategy

- **Wave 1**: `feat(sdk): add opencode-sdk integration and connection management`
- **Wave 2**: `feat(core): implement session and permission handling`
- **Wave 3**: `feat(indexer): add local model indexer system`
- **Wave 4**: `feat(ui): integrate all components with UI`

---

## Success Criteria

### Verification Commands
```bash
# 类型检查
npm run typecheck

# 单元测试
bun test

# 构建
npm run build
```

### Final Checklist
- [ ] OpenCode SDK 集成完成
- [ ] 自动发现连接正常工作
- [ ] 多项目切换功能正常
- [ ] 聊天功能使用真实 AI
- [ ] 流式响应正常显示
- [ ] 本地模型索引功能正常
- [ ] 权限配置 UI 可用
