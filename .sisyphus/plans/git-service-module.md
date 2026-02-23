# GitService 动态模块化实现计划

## TL;DR

> **快速摘要**：为 OpenCode IDE 实现可插拔的 GitService 模块 + FileWatcher 独立监控模块，支持 AI 通过 MCP 调用 Git 操作、实时监控文件变更（外部软件修改）、动态启停
> 
> **交付物**：
> - git-mcp-server：MCP Server（STDIO 子进程），提供 git status/diff/fetch/pull/branch 等工具
> - GitService 模块：simple-git + chokidar 封装的 Git 操作服务
> - **FileWatcherService 独立模块**：监控已打开文件被外部软件修改，支持自动重载+通知
> - 动态启停 UI：Git 模块和 FileWatcher 模块的启用/停用/卸载面板
> - 实时监听：本地文件监听 + 远端定时轮询
> 
> **预估工作量**：中等偏大
> **并行执行**：YES - 多阶段
> **关键路径**：T1(TDD 基础设施) → T2-T4(GitService核心) → T7(MCP包装) → T12(集成UI)

---

## Context

### 用户原始需求
可插拔后端的 AI IDE 项目，想实现：
1. 自动拉取 git 状态、管理 git 仓库的功能，并定期检测代码更新、拉取特定文件
2. **编辑器查询其他软件对文件的更改并实时更新**（新增）

### 新增需求（文件监控）
- **监控对象**：仅已打开的文件
- **触发条件**：外部软件（非本编辑器）修改了文件
- **处理方式**：自动重载 + 用户通知（两者都要）
- **模块关系**：FileWatcherService 作为**独立模块**，Git 可选用它（不是必须的）

### 访谈总结

**关键决策**：
- Git 操作范围：完整功能（分阶段实现，MVP 先做 status/diff/fetch/pull）
- AI 调用方式：**MCP Server（STDIO 子进程）** - 最方便安装/卸载和最省性能
- 可插拔方式：**动态模块化** - 用户可启用/停用/卸载，启用时保存状态，下次默认启动
- 监听机制：**全部监听** - 本地变更（chokidar）+ 远端轮询（定时 fetch + status）
- 仓库模型：可配置"始终监听"，切换项目时监听当前项目
- 特殊状态：需支持 worktree / submodule / detached HEAD
- 写操作确认：可配置（弹窗/快捷键/只读）
- 轮询间隔：用户可调节

**技术选型**：
- MCP 部署形态：STDIO 子进程
- Git 操作库：simple-git
- 文件监听：chokidar
- MCP SDK：@modelcontextprotocol/sdk
- 测试策略：TDD

### Metis 审查

**已识别的缺口**（已解决）：
- MVP 范围明确：先做 status/diff/fetch/pull/branch
- 仓库模型明确：可配置"始终监听"
- 特殊状态明确：需支持 worktree/submodule/detached HEAD
- 测试策略确认：TDD

---

## Work Objectives

### 核心目标
实现一个可插拔的 GitService 模块，AI 可通过 MCP 调用完整 Git 操作，支持实时状态监听

### 具体交付物
1. **git-mcp-server**：MCP Server，提供以下工具：
   - git_status, git_diff, git_diff_staged, git_diff_unstaged
   - git_fetch, git_pull, git_push
   - git_branch_list, git_branch_create, git_branch_delete, git_checkout
   - git_log, git_show
   - git_add, git_commit
   - git_stash, git_stash_pop
   - git_remote_list

2. **GitService 核心模块**：
   - simple-git 封装
   - chokidar 文件监听
   - 定时远端轮询
   - 状态缓存与增量刷新
   - 可选：订阅 FileWatcher 事件触发刷新

3. **FileWatcherService 独立模块**（新增）：
   - chokidar 文件系统监控
   - 注册/注销已打开文件列表
   - 检测外部软件修改（非本编辑器）
   - 自动重载触发事件
   - 用户通知机制
   - Git 可选用此模块（解耦）

4. **动态启停 UI**：
   - Git 模块启用/停用开关
   - FileWatcher 模块启用/停用开关
   - 轮询间隔配置
   - 写操作确认模式配置
   - 状态持久化

5. **与现有系统集成**：
   - 项目切换时自动切换监听仓库
   - StatusBar 显示 git 状态
   - GitPanel 连接后端服务
   - 编辑器文件变更与 FileWatcher 联动

### Definition of Done
- [ ] AI 可以通过 MCP 调用 git status 获取仓库状态
- [ ] AI 可以通过 MCP 调用 git diff 查看文件变更
- [ ] AI 可以通过 MCP 调用 git fetch/pull 拉取远端更新
- [ ] 本地文件变更在 1 秒内触发状态刷新
- [ ] 远端变更按配置的间隔轮询检测
- [ ] 用户可以启用/停用 Git 模块
- [ ] 用户可以启用/停用 FileWatcher 模块
- [ ] 停用后不产生后台监听/轮询
- [ ] 支持 worktree / submodule / detached HEAD 状态显示
- [ ] 外部软件修改已打开文件后触发通知（新增）
- [ ] 外部软件修改已打开文件后可自动重载（新增）

### Must Have
- MCP Server 提供 git status/diff/fetch/pull/branch/log 工具
- 本地文件监听（chokidar）
- 远端定时轮询（可配置间隔）
- **FileWatcherService 独立模块**（新增）
  - 监控已打开文件的外部修改
  - 区分本编辑器修改 vs 外部修改
  - 自动重载回调机制
  - 用户通知机制
- 动态启停 UI（Git + FileWatcher）
- 状态持久化

### Must NOT Have
- 不实现 Git 托管平台（Gitea/GitLab 等）
- 不实现独立权限管理（复用现有凭据）
- MVP 阶段不实现 merge/rebase 冲突解决 UI

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: TDD
- **Framework**: vitest (Node.js)
- 每个任务遵循 RED (failing test) → GREEN (minimal impl) → REFACTOR

### QA Policy
每个任务包含 Agent-Executed QA Scenarios：
- Frontend/UI: Playwright - 验证 UI 交互
- Backend: Bash (curl/直接执行) - 验证 MCP 工具调用
- Integration: 端到端验证 AI 调用链路

---

## Execution Strategy

### 执行 Waves

```
Wave 1 (基础 + 核心):
├── T1: TDD 基础设施 - 测试框架 + git-mcp-server 脚手架 [TDD 模式]
├── T2: GitService 核心 - simple-git 封装 [quick]
├── T3: 本地监听 - chokidar 集成 [quick]
├── T4: 远端轮询 - 定时 fetch + status [quick]
├── T5: MCP 工具 - git_status/diff 实现 [deep]
├── T6: **FileWatcherService 独立模块 - 核心实现** [deep]
└── T7: **FileWatcherService - 编辑器集成** [quick]

Wave 2 (MCP 工具):
├── T8: MCP 工具 - git_fetch/pull/branch [deep]
├── T9: MCP 工具 - git_log/show/add/commit [deep]
├── T10: 特殊状态支持 - worktree/submodule/detached HEAD [deep]
└── T11: 错误处理 + 安全校验 [quick]

Wave 3 (UI 集成):
├── T12: 动态启停 UI - Git 模块启用/停用面板 [visual-engineering]
├── T13: 动态启停 UI - FileWatcher 模块启用/停用面板 [visual-engineering]
├── T14: 配置面板 - 轮询间隔/写操作确认 [visual-engineering]
├── T15: 与现有系统集成 - 项目切换/StatusBar [quick]
└── T16: 状态持久化 [quick]

Wave 4 (验证):
├── T17: 集成测试 - MCP ↔ GitService ↔ FileWatcher ↔ UI [deep]
├── T18: 端到端测试 - AI 完整调用链路 [deep]
└── T19: 清理 + 文档 [quick]
```

---

## TODOs

- [ ] 1. **T1 修改为: TDD 基础设施 + git-mcp-server 脚手架**

  **What to do**:
  - 安装依赖：simple-git, chokidar, @modelcontextprotocol/sdk
  - 复制 excel-mcp-server 模式创建 git-mcp-server 目录
  - 复用现有 store 中的 Git 类型定义（opencode-ide/src/store/index.ts）
  - 编写 git_status 工具的测试用例 (RED)
  - 实现 git_status 工具 (GREEN)

  **Must NOT do**:
  - 不要实现完整的 git 操作，先专注测试基础设施

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 需要 TDD 基础设施搭建，涉及测试和 MCP SDK
  - **Skills**: [], 依赖系统默认技能

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1
  - **Blocks**: T2, T5
  - **Blocked By**: None

  **References**:
  - `opencode-ide/excel-mcp-server/server.js` - MCP Server 实现参考
  - `opencode-ide/browser-mcp-server/server.js` - MCP Server 实现参考
  - `@modelcontextprotocol/sdk` - 官方 MCP SDK

  **Acceptance Criteria**:
  - [ ] simple-git, chokidar, @modelcontextprotocol/sdk 安装完成
  - [ ] git-mcp-server 目录结构创建完成
  - [ ] MCP Server 骨架可启动（复用 excel-mcp-server 模式）
  - [ ] 复用现有 store 中的 Git 类型定义
  - [ ] `npx vitest run` → PASS (git_status 测试用例)

  **QA Scenarios**:
  - Scenario: MCP Server 可正常启动并响应 initialize 请求
    Tool: Bash
    Preconditions: npm install 完成
    Steps:
      1. cd git-mcp-server && npm install
      2. echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"1.0","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | node server.js
      3. 验证返回包含 protocolVersion
    Expected Result: 返回有效的 JSON-RPC 响应
    Evidence: .sisyphus/evidence/task-1-mcp-init.json

- [ ] 1.5. **T1.5 新增: 连接 git-mcp-server 与现有 GitStore**

  **What to do**:
  - 连接 git-mcp-server 与现有 GitStore（store/index.ts）
  - 将 MCP 返回的状态同步到 store/index.ts 中的 gitRepository/gitWorkingTree
  - 复用 GitPanel.tsx 显示后端数据（无需新建 UI）
  - 实现主进程与 MCP Server 的 IPC 通信

  **Must NOT do**:
  - 不要新建 Git UI 组件，复用现有 GitPanel.tsx

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 需要理解现有 store 结构和 IPC 通信
  - **Skills**: [], 依赖系统默认技能

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1)
  - **Blocks**: T5, T12
  - **Blocked By**: None

  **References**:
  - `opencode-ide/src/store/index.ts` - 现有 Git 状态结构
  - `opencode-ide/src/components/git/index.tsx` - 现有 GitPanel UI
  - `opencode-ide/src/components/ai/ServerManagerPanel.tsx` - 服务管理面板参考

  **Acceptance Criteria**:
  - [ ] MCP 返回的 git 状态可同步到 store
  - [ ] GitPanel 可显示 MCP 后端数据
  - [ ] 状态更新触发 UI 刷新

  **QA Scenarios**:
  - Scenario: MCP git_status 返回结果写入 store
    Tool: Bash
    Preconditions: git-mcp-server 运行中
    Steps:
      1. 调用 MCP git_status 工具
      2. 验证 store 中 gitWorkingTree 状态更新
    Expected Result: store 状态与 MCP 返回一致
    Evidence: .sisyphus/evidence/task-1.5-store-sync.json

- [ ] 2. **GitService 核心 - simple-git 封装**

  **What to do**:
  - 安装 simple-git 依赖
  - 创建 GitService 类，封装 git status/diff/fetch/pull
  - 编写 GitService 单元测试
  - 实现仓库路径配置和多仓库支持

  **Must NOT do**:
  - 不要直接操作文件系统，只通过 simple-git

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 核心业务逻辑封装
  - **Skills**: [], 依赖系统默认技能

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T3, T4)
  - **Blocks**: T5, T6
  - **Blocked By**: T1

  **References**:
  - simple-git 文档: https://github.com/steveukx/git-js
  - `opencode-ide/electron/main.js` - 项目路径管理参考

  **Acceptance Criteria**:
  - [ ] simple-git 安装完成
  - [ ] GitService 类可实例化
  - [ ] `git status` 命令可执行并返回结果

  **QA Scenarios**:
  - Scenario: GitService 可获取当前仓库状态
    Tool: Bash
    Preconditions: 当前项目是 git 仓库
    Steps:
      1. node -e "const {GitService} = require('./git-service'); const gs = new GitService('.'); gs.status().then(console.log)"
    Expected Result: 返回包含 modified/staged/untracked 的状态对象
    Evidence: .sisyphus/evidence/task-2-git-status.json

- [ ] 3. **本地监听 - chokidar 集成**

  **What to do**:
  - 安装 chokidar 依赖
  - 创建 FileWatcher 类监听工作区文件变化（.git 目录 + 已跟踪文件）
  - 配合 ignore 规则和节流，避免监听整个项目导致性能问题
  - 集成到 GitService
  - 实现本地变更自动刷新

  **Must NOT do**:
  - 不要直接监听 node_modules 等大目录，使用 ignorePatterns 过滤

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 相对独立的监听功能
  - **Skills**: [], 依赖系统默认技能

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2, T4)
  - **Blocks**: T13
  - **Blocked By**: T1

  **References**:
  - chokidar 文档: https://github.com/paulmillr/chokidar

  **Acceptance Criteria**:
  - [ ] chokidar 安装完成
  - [ ] 文件变更触发回调

  **QA Scenarios**:
  - Scenario: 创建新文件后触发监听回调
    Tool: Bash
    Preconditions: chokidar 监听器已启动
    Steps:
      1. 启动监听器
      2. touch test-watch-file.txt
      3. 验证监听器收到事件
    Expected Result: 监听器回调被触发
    Evidence: .sisyphus/evidence/task-3-watch-event.json

- [ ] 4. **远端轮询 - 定时 fetch + status**

  **What to do**:
  - 实现定时轮询机制
  - git fetch --dry-run 检测远端是否有更新
  - 可配置轮询间隔
  - 实现"始终监听"模式

  **Must NOT do**:
  - 不要在后台频繁执行完整的 git fetch

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 定时任务逻辑
  - **Skills**: [], 依赖系统默认技能

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2, T3)
  - **Blocks**: T13
  - **Blocked By**: T1

  **Acceptance Criteria**:
  - [ ] 定时器可启动/停止
  - [ ] 轮询间隔可配置

  **QA Scenarios**:
  - Scenario: 轮询定时器按间隔执行
    Tool: Bash
    Preconditions: 轮询配置为 1 秒
    Steps:
      1. 启动轮询
      2. 等待 3 秒
      3. 验证 fetch 执行了 3 次
    Expected Result: fetch 执行 3 次
    Evidence: .sisyphus/evidence/task-4-polling.json

- [ ] 5. **MCP 工具 - git_status/diff 实现**

  **What to do**:
  - 在 MCP Server 中注册 git_status 工具
  - 实现 git_diff_staged, git_diff_unstaged 工具
  - 编写 TDD 测试

  **Must NOT do**:
  - 不要实现所有 MCP 工具，先完成 status/diff

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: MCP 工具核心实现
  - **Skills**: [], 依赖系统默认技能

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (T1 完成后)
  - **Blocks**: T6, T7
  - **Blocked By**: T1, T2

  **References**:
  - modelcontextprotocol/servers Git - 官方 MCP Git 实现参考
  - `opencode-ide/excel-mcp-server/server.js` - 工具注册模式

  **Acceptance Criteria**:
  - [ ] git_status 工具可调用
  - [ ] git_diff 工具可调用

  **QA Scenarios**:
  - Scenario: 通过 MCP 调用 git_status
    Tool: Bash
    Preconditions: MCP Server 运行中
    Steps:
      1. echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"git_status","arguments":{"repo_path":"."}}}' | node server.js
    Expected Result: 返回仓库状态
    Evidence: .sisyphus/evidence/task-5-mcp-status.json

- [ ] 6. **FileWatcherService 独立模块 - 核心实现**

  **What to do**:
  - 创建 FileWatcherService 类，独立于 GitService
  - chokidar 监听已注册文件的变更
  - 实现外部修改检测逻辑（区分本编辑器修改 vs 外部修改）
  - 实现文件变更事件发射（change/add/unlink）
  - 实现自动重载回调机制
  - 实现用户通知机制
  - 注册/注销文件 API

  **Must NOT do**:
  - 不要监听整个项目，只监听已注册的文件
  - 不要自动重载所有变更，由上层决定如何处理

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 核心业务逻辑，涉及文件监控和事件处理
  - **Skills**: [], 依赖系统默认技能

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2, T3, T4, T5)
  - **Blocks**: T7, T13
  - **Blocked By**: T1

  **References**:
  - chokidar 文档: https://github.com/paulmillr/chokidar
  - `opencode-ide/src/components/editor/` - 编辑器文件状态管理

  **Acceptance Criteria**:
  - [ ] FileWatcherService 类可实例化
  - [ ] 注册文件后，外部修改可检测
  - [ ] 区分本编辑器修改和外部修改
  - [ ] 自动重载回调可触发
  - [ ] 用户通知可触发

  **QA Scenarios**:
  - Scenario: 外部软件修改已注册文件后触发通知
    Tool: Bash
    Preconditions: FileWatcherService 已启动，文件已注册
    Steps:
      1. 注册文件 test.txt
      2. 用外部编辑器修改 test.txt（不是本编辑器）
      3. 验证触发外部修改事件
    Expected Result: 收到外部修改通知
    Evidence: .sisyphus/evidence/task-6-external-change.json

  - Scenario: 本编辑器修改文件不触发外部修改事件
    Tool: Bash
    Preconditions: FileWatcherService 已启动，文件已注册
    Steps:
      1. 注册文件 test.txt
      2. 通过本编辑器 API 修改 test.txt
      3. 验证不触发外部修改事件
    Expected Result: 不触发外部修改通知
    Evidence: .sisyphus/evidence/task-6-internal-change.json

- [ ] 7. **FileWatcherService - 编辑器集成**

  **What to do**:
  - **集成点：store/index.ts 中的 openFile/closeFile action**
  - 在 openFile 中调用 FileWatcher.register(path) 注册监听
  - 在 closeFile 中调用 FileWatcher.unregister(path) 注销监听
  - 与编辑器打开文件状态联动
  - 文件打开时自动注册监听
  - 文件关闭时自动注销监听
  - 实现自动重载功能（加载新内容）
  - 实现通知 UI（Toast/Modal）
  - 可选：GitService 订阅 FileWatcher 事件

  **Must NOT do**:
  - 不要影响编辑器的正常打开/关闭流程

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 集成任务，相对独立
  - **Skills**: [], 依赖系统默认技能

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2, T3, T4, T5, T6)
  - **Blocks**: T13, T17
  - **Blocked By**: T1, T6

  **References**:
  - `opencode-ide/src/store/index.ts` (openFile action, line ~408-433) - 集成点
  - `opencode-ide/src/components/editor/` - 编辑器组件

  **Acceptance Criteria**:
  - [ ] openFile 调用时自动注册监听
  - [ ] closeFile 调用时自动注销监听
  - [ ] 外部修改后可自动重载
  - [ ] 外部修改后可显示通知

  **QA Scenarios**:
  - Scenario: 打开文件后自动注册监听
    Tool: Playwright
    Preconditions: FileWatcher 模块已启用
    Steps:
      1. 打开文件 test.txt
      2. 验证文件已在 FileWatcher 中注册
    Expected Result: 文件被监听
    Evidence: .sisyphus/evidence/task-7-file-open.json

- [ ] 8. **MCP 工具 - git_fetch/pull/branch**

  **What to do**:
  - 实现 git_fetch, git_pull 工具
  - 实现 git_branch_list, git_checkout 工具

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [], 依赖系统默认技能

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T17
  - **Blocked By**: T1, T2, T5

  **Acceptance Criteria**:
  - [ ] git_fetch 工具可调用
  - [ ] git_pull 工具可调用
  - [ ] git_branch_list 工具可调用

- [ ] 9. **MCP 工具 - git_log/show/add/commit**

  **What to do**:
  - 实现 git_log, git_show 工具
  - 实现 git_add, git_commit 工具

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [], 依赖系统默认技能

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T14
  - **Blocked By**: T1, T2, T5

  **Acceptance Criteria**:
  - [ ] git_log 工具可调用
  - [ ] git_add/commit 工具可调用

- [ ] 8. **特殊状态支持 - worktree/submodule/detached HEAD**

  **What to do**:
  - 检测 worktree 状态
  - 检测 submodule 状态
  - 检测 detached HEAD 状态
  - 在 git_status 结果中返回这些信息

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [], 依赖系统默认技能

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T14
  - **Blocked By**: T1, T2, T5

  **Acceptance Criteria**:
  - [ ] worktree 状态可检测
  - [ ] submodule 状态可检测
  - [ ] detached HEAD 状态可检测

- [ ] 9. **错误处理 + 安全校验**

  **What to do**:
  - 统一错误码定义
  - 参数校验
  - 路径约束（只能操作当前仓库）
  - 写操作风险分级

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [], 依赖系统默认技能

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T14
  - **Blocked By**: T1

  **Acceptance Criteria**:
  - [ ] 错误统一返回格式
  - [ ] 路径越界被拒绝

- [ ] 10. **动态启停 UI - 启用/停用面板**

  **What to do**:
  - 创建 Git 模块启用/停用开关
  - 集成到现有设置面板 (ServerManagerPanel)
  - 保存启用状态到本地存储

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [], 依赖系统默认技能

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T11, T12, T13)
  - **Blocks**: T14
  - **Blocked By**: T1, T5

  **References**:
  - `opencode-ide/src/components/ai/ServerManagerPanel.tsx` - 现有设置面板参考
  - `opencode-ide/src/store/index.ts` - 现有状态管理

  **Acceptance Criteria**:
  - [ ] 启用开关可点击
  - [ ] 停用后不产生后台监听

- [ ] 11. **配置面板 - 轮询间隔/写操作确认**

  **What to do**:
  - 轮询间隔配置 UI (滑块/输入框)
  - 写操作确认模式配置 (弹窗/快捷键/只读)
  - 保存配置到本地存储

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [], 依赖系统默认技能

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T10, T12, T13)
  - **Blocks**: T14
  - **Blocked By**: T1

  **Acceptance Criteria**:
  - [ ] 轮询间隔可配置
  - [ ] 写操作确认模式可配置

- [ ] 12. **与现有系统集成 - 项目切换/StatusBar**

  **What to do**:
  - 项目切换时自动切换监听仓库
  - StatusBar 显示 git 状态
  - 与现有 GitPanel 连接

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [], 依赖系统默认技能

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T10, T11, T13)
  - **Blocks**: T14
  - **Blocked By**: T1, T2, T3

  **References**:
  - `opencode-ide/src/components/layout/index.tsx` - StatusBar 参考
  - `opencode-ide/src/components/git/index.tsx` - GitPanel 参考

  **Acceptance Criteria**:
  - [ ] 项目切换后 git 状态更新
  - [ ] StatusBar 显示分支信息

- [ ] 13. **状态持久化**

  **What to do**:
  - 保存 Git 模块启用状态
  - 保存轮询间隔配置
  - 保存写操作确认模式
  - 重新启用时恢复状态

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [], 依赖系统默认技能

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T10, T11, T12)
  - **Blocks**: T14
  - **Blocked By**: T1

  **Acceptance Criteria**:
  - [ ] 重启应用后状态恢复
  - [ ] 启用时恢复监听

- [ ] 14. **集成测试 - MCP ↔ GitService ↔ UI**

  **What to do**:
  - MCP 工具调用链测试
  - UI 交互测试
  - 启停功能测试

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [], 依赖系统默认技能

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4
  - **Blocks**: T15
  - **Blocked By**: T10, T11, T12, T13

  **Acceptance Criteria**:
  - [ ] 完整调用链路测试通过
  - [ ] 启停功能正常

- [ ] 15. **端到端测试 - AI 完整调用链路**

  **What to do**:
  - 模拟 AI 调用 MCP 工具
  - 验证返回结果正确
  - 测试错误处理

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [], 依赖系统默认技能

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4
  - **Blocks**: T16
  - **Blocked By**: T14

  **Acceptance Criteria**:
  - [ ] AI 可通过 MCP 获取 git 状态
  - [ ] AI 可通过 MCP 拉取远端更新

- [ ] 16. **清理 + 文档**

  **What to do**:
  - 代码清理
  - README 文档
  - 与现有项目风格一致

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [], 依赖系统默认技能

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: T15

  **Acceptance Criteria**:
  - [ ] 代码符合项目规范
  - [ ] README 完成

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
  读取计划，验证每个 Must Have 都有对应实现，每个 Must NOT Have 都不存在。

- [ ] F2. **Code Quality Review** — `unspecified-high`
  验证 TypeScript 编译通过，代码风格一致，无安全漏洞。

- [ ] F3. **Real Manual QA** — `unspecified-high`
  从零启动，完整执行每个 QA Scenarios。

- [ ] F4. **Scope Fidelity Check** — `deep`
  验证所有任务都实现了计划中的功能，无范围蔓延。

---

## Commit Strategy

- T1: `test(git): add vitest config and git-mcp-server scaffold`
- T2: `feat(git): implement GitService core with simple-git`
- T3: `feat(git): add local file watching with chokidar`
- T4: `feat(git): add remote polling mechanism`
- T5: `feat(mcp): implement git_status/diff MCP tools`
- T6: `feat(filewatcher): implement FileWatcherService core`
- T7: `feat(filewatcher): integrate with editor open/close files`
- T8-T9: `feat(mcp): implement remaining git MCP tools`
- T10-T11: `feat(git): special states and error handling`
- T12-T13: `feat(ui): add Git and FileWatcher module enable/disable UI`
- T14-T16: `feat(ui): config panel, integration, and persistence`
- T17-T19: `test: integration and e2e tests`

---

## Success Criteria

### Verification Commands
```bash
# 运行测试
npm test

# 启动 MCP Server
cd git-mcp-server && node server.js

# 验证 git status 工具
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"git_status","arguments":{"repo_path":"."}}}' | node server.js
```

### Final Checklist
- [ ] MCP Server 可启动并响应请求
- [ ] git status/diff/fetch/pull/branch 工具可用
- [ ] 本地文件变更自动触发刷新
- [ ] 远端变更按配置间隔检测
- [ ] 用户可启用/停用 Git 模块
- [ ] 用户可启用/停用 FileWatcher 模块
- [ ] 外部软件修改已打开文件后触发通知
- [ ] 外部软件修改已打开文件后可自动重载
- [ ] 配置可保存和恢复
- [ ] 项目切换时状态更新