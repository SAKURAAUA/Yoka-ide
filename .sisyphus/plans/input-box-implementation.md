# 输入框组件增强实现计划

## TL;DR

> **Quick Summary**: 为OpenCode IDE的输入框组件添加@提及、待办清单、智能体结果展示和文件拖拽功能，基于现有ChatInputPanel组件扩展。
>
> **Deliverables**:
> - 增强@提及功能（项目上下文加载）
> - 待办清单UI（可折叠，绑定对话）
> - 智能体执行结果折叠块
> - 文件拖拽上传增强
> - 输入框尺寸调整支持
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Task 3 → Task 5 → Task 6

---

## Context

### Original Request
用户希望为OpenCode IDE实现一个增强版的输入框组件，支持：
1. @提及功能（提及项目并加载上下文）
2. 待办清单（智能体任务队列）
3. 智能体执行结果展示（折叠块）
4. 拖拽上传文件
5. 输入框尺寸调整

### Interview Summary

**Key Discussions**:
- **合并窗口机制**: 多窗口可停靠合并，支持分栏布局，窗口间可拖拽消息
- **对话实例关系**: 对话不绑定窗口，待办清单保存到对话（不跨对话保留）
- **智能体执行结果**: 引用/链接关系，折叠块展示
- **输入框编辑**: 纯文本（不渲染Markdown），@提及加载上下文，拖拽文件作附件
- **待办清单**: 智能体任务队列，输入框上方，可折叠，保存到对话

**Research Findings**:
- **已实现**: 完整窗口管理系统（DockContainerWindow, SplitPane）、基础输入框（ChatInputPanel）、图片粘贴
- **缺失**: 对话实例管理、智能体系统、@提及、待办清单UI、拖拽文件
- **技术栈**: Next.js 16, React 19, Zustand, Tailwind CSS 4, Electron 34

### Metis Review
**Identified Gaps** (addressed):
- 需要对话实例数据模型：已确认保存到对话
- 智能体引用关系：已确认折叠块展示
- @提及作用：已确认加载上下文但不跳转

---

## Work Objectives

### Core Objective
扩展现有ChatInputPanel组件，添加@提及、待办清单、智能体结果展示和文件拖拽功能，提升用户在OpenCode IDE中的交互体验。

### Concrete Deliverables
- 增强的ChatInputPanel组件（支持@提及、文件拖拽）
- TodoListPanel组件（可折叠待办清单）
- AgentResultBlock组件（智能体执行结果折叠块）
- 项目上下文加载逻辑
- 输入框尺寸调整功能

### Definition of Done
- [ ] @提及功能正常工作（输入@弹出项目列表，选择后加载上下文）
- [ ] 待办清单UI显示正确（可折叠，任务项可删除/清空）
- [ ] 智能体结果折叠块正常显示（默认折叠，可展开）
- [ ] 文件拖拽正常工作（文件作附件，文本转Markdown）
- [ ] 输入框宽度可调整

### Must Have
- @提及功能（输入@触发，加载项目上下文）
- 待办清单UI（可折叠，绑定对话）
- 智能体结果折叠块
- 文件拖拽上传

### Must NOT Have (Guardrails)
- ❌ 不添加Markdown实时预览（纯文本输入）
- ❌ 不实现智能体执行引擎（只展示结果）
- ❌ 不跳转窗口（@提及只加载上下文）
- ❌ 不跨对话保留待办清单
- ❌ 不修改后端API（假设后端提供数据）

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (当前无测试框架)
- **Automated tests**: Tests After（先实现，再补充测试）
- **Framework**: 待定（vitest / bun test）
- **策略**: 先实现功能，后续迭代补充测试

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright (playwright skill) — Navigate, interact, assert DOM, screenshot
- **TUI/CLI**: Use interactive_bash (tmux) — Run command, send keystrokes, validate output
- **API/Backend**: Use Bash (curl) — Send requests, assert status + response fields
- **Library/Module**: Use Bash (bun/node REPL) — Import, call functions, compare output

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation + UI components):
├── Task 1: 数据模型定义 [quick]
├── Task 2: TodoListPanel组件 [visual-engineering]
├── Task 3: AgentResultBlock组件 [visual-engineering]
└── Task 4: 文件拖拽增强 [quick]

Wave 2 (After Wave 1 — @提及功能):
├── Task 5: 项目列表弹窗组件 [visual-engineering]
├── Task 6: @提及触发逻辑 [quick]
└── Task 7: 项目上下文加载 [quick]

Wave 3 (After Wave 2 — 集成 + 调整):
├── Task 8: ChatInputPanel集成 [unspecified-high]
├── Task 9: 输入框尺寸调整 [quick]
└── Task 10: 状态管理更新 [quick]

Wave FINAL (After ALL tasks — independent review, 4 parallel):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)

Critical Path: Task 1 → Task 5 → Task 6 → Task 8
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 4 (Waves 1 & 2)
```

### Dependency Matrix

- **1**: — — 2, 3, 8, 1
- **2**: 1 — 8, 1
- **3**: 1 — 8, 1
- **4**: — — 8, 1
- **5**: — — 6, 7, 2
- **6**: 5 — 8, 2
- **7**: 5 — 8, 2
- **8**: 1, 2, 3, 4, 6, 7 — 9, 10, 3
- **9**: 8 — — 1
- **10**: 8 — — 1

### Agent Dispatch Summary

- **Wave 1**: **4** — T1 → `quick`, T2 → `visual-engineering`, T3 → `visual-engineering`, T4 → `quick`
- **Wave 2**: **3** — T5 → `visual-engineering`, T6 → `quick`, T7 → `quick`
- **Wave 3**: **3** — T8 → `unspecified-high`, T9 → `quick`, T10 → `quick`
- **FINAL**: **4** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.

- [ ] 1. 数据模型定义

  **What to do**:
  - 在 `src/types/index.ts` 中添加新的数据模型接口
  - 定义 `TodoItem` 接口（id, description, completed, agentId, createdAt）
  - 定义 `AgentResult` 接口（id, agentId, status, summary, details, timestamp）
  - 定义 `ProjectMention` 接口（id, name, path, context）
  - 扩展 `Conversation` 接口，添加 `todos: TodoItem[]` 字段
  - 扩展 `Message` 接口，添加 `agentResults?: AgentResult[]` 字段

  **Must NOT do**:
  - ❌ 不修改现有的 `WindowType` 或 `WindowInstance` 类型
  - ❌ 不添加后端API调用逻辑
  - ❌ 不创建新的store（只定义类型）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 类型定义是简单的代码编写任务，不需要复杂的逻辑
  - **Skills**: []
    - 无特殊技能需求
  - **Skills Evaluated but Omitted**:
    - `visual-engineering`: 不涉及UI设计

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Tasks 2, 3, 8
  - **Blocked By**: None (can start immediately)

  **References**:
  - `opencode-ide/src/types/index.ts:56-62` - 现有Message接口定义
  - `opencode-ide/src/store/index.ts:43` - 现有messages类型使用

  **Acceptance Criteria**:
  - [ ] TodoItem接口定义完整（包含所有必需字段）
  - [ ] AgentResult接口定义完整
  - [ ] Conversation接口扩展（包含todos字段）
  - [ ] Message接口扩展（包含agentResults字段）
  - [ ] 类型检查通过：`npm run type-check`

  **QA Scenarios**:

  ```
  Scenario: 类型定义验证
    Tool: Bash
    Preconditions: 已添加所有新类型定义
    Steps:
      1. cd opencode-ide
      2. npm run type-check
      3. 检查输出中无类型错误
    Expected Result: TypeScript编译成功，无错误
    Failure Indicators: 类型错误，缺少必需字段
    Evidence: .sisyphus/evidence/task-01-type-check.txt
  ```

  **Commit**: YES
  - Message: `feat(input): add data models for todo and agent result`
  - Files: `opencode-ide/src/types/index.ts`

---

- [ ] 2. TodoListPanel组件

  **What to do**:
  - 创建新文件 `src/components/input/TodoListPanel.tsx`
  - 实现可折叠的待办清单面板组件
  - Props: `todos: TodoItem[]`, `onToggle: (id: string) => void`, `onDelete: (id: string) => void`, `onClearAll: () => void`
  - 渲染待办项列表：左侧复选框，中间任务描述，右侧悬浮显示删除按钮
  - 右下角显示"清空"按钮
  - 支持折叠/展开状态（点击标题栏切换）
  - 使用Tailwind CSS样式，白+粉主题
  - 空状态：显示"暂无待办事项"

  **Must NOT do**:
  - ❌ 不实现智能体执行逻辑（只展示待办）
  - ❌ 不添加跨对话持久化（数据由父组件管理）
  - ❌ 不使用外部UI库（只用Tailwind CSS）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 需要设计UI布局和交互效果
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: 需要设计可折叠面板的视觉效果
  - **Skills Evaluated but Omitted**:
    - `playwright`: UI组件，不是浏览器测试

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Task 8
  - **Blocked By**: Task 1 (需要TodoItem类型)

  **References**:
  - `opencode-ide/src/components/chat/ChatInputPanel.tsx:142-240` - 参考现有输入框样式
  - `opencode-ide/src/components/layout/DockContainerWindow.tsx:958-982` - 参考折叠样式

  **Acceptance Criteria**:
  - [ ] 组件渲染正确（显示待办列表）
  - [ ] 点击复选框触发onToggle回调
  - [ ] 鼠标悬浮显示删除按钮
  - [ ] 点击删除按钮触发onDelete回调
  - [ ] 点击清空按钮触发onClearAll回调
  - [ ] 点击标题栏可折叠/展开
  - [ ] 空状态显示正确

  **QA Scenarios**:

  ```
  Scenario: 待办清单基本交互
    Tool: Playwright (playwright skill)
    Preconditions: 输入框组件已集成TodoListPanel
    Steps:
      1. 启动开发服务器：cd opencode-ide && npm run dev
      2. 打开浏览器访问 http://localhost:3000
      3. 点击ActivityBar中的"聊天输入"按钮，创建输入框窗口
      4. 验证待办清单面板显示在输入框上方
      5. 点击折叠按钮，验证面板折叠
      6. 再次点击，验证面板展开
    Expected Result: 面板可正常折叠/展开，UI显示正确
    Failure Indicators: 面板不显示，折叠按钮无响应
    Evidence: .sisyphus/evidence/task-02-todo-panel.png

  Scenario: 待办项删除和清空
    Tool: Playwright
    Preconditions: 待办清单中有3个待办项
    Steps:
      1. 鼠标悬浮在第一个待办项上
      2. 验证删除按钮（X）显示
      3. 点击删除按钮
      4. 验证该待办项被移除（剩余2个）
      5. 点击右下角"清空"按钮
      6. 验证所有待办项被清空
    Expected Result: 删除和清空功能正常工作
    Failure Indicators: 删除按钮不显示，点击无反应
    Evidence: .sisyphus/evidence/task-02-todo-delete.png
  ```

  **Commit**: YES
  - Message: `feat(input): add TodoListPanel component`
  - Files: `opencode-ide/src/components/input/TodoListPanel.tsx`

---

- [ ] 3. AgentResultBlock组件

  **What to do**:
  - 创建新文件 `src/components/input/AgentResultBlock.tsx`
  - 实现智能体执行结果的折叠块组件
  - Props: `result: AgentResult`, `onExpand?: () => void`
  - 折叠状态：显示摘要 + 状态图标（运行中=旋转动画，已完成=✓，失败=✗）
  - 展开状态：显示详细内容（详情文本、执行日志等）
  - 点击整个块切换折叠/展开状态
  - 使用Tailwind CSS样式，白+粉主题
  - 支持不同的状态颜色（运行中=蓝色，已完成=绿色，失败=红色）

  **Must NOT do**:
  - ❌ 不实现智能体执行逻辑（只展示结果）
  - ❌ 不添加跳转功能（点击只展开/折叠）
  - ❌ 不使用外部UI库

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 需要设计折叠块的视觉效果和动画
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: 需要设计状态指示器和折叠动画
  - **Skills Evaluated but Omitted**:
    - `playwright`: UI组件，不是浏览器测试

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: Task 8
  - **Blocked By**: Task 1 (需要AgentResult类型)

  **References**:
  - `opencode-ide/src/components/chat/index.tsx:314-338` - 参考消息渲染样式
  - `opencode-ide/src/components/layout/DockContainerWindow.tsx:958-982` - 参考折叠样式

  **Acceptance Criteria**:
  - [ ] 组件渲染正确（显示摘要和状态）
  - [ ] 折叠状态显示摘要和状态图标
  - [ ] 展开状态显示详细内容
  - [ ] 点击切换折叠/展开状态
  - [ ] 不同状态显示不同颜色（运行中=蓝，完成=绿，失败=红）
  - [ ] 运行中状态显示旋转动画

  **QA Scenarios**:

  ```
  Scenario: 智能体结果折叠块交互
    Tool: Playwright (playwright skill)
    Preconditions: Chat窗口中显示智能体执行结果
    Steps:
      1. 启动开发服务器：cd opencode-ide && npm run dev
      2. 打开浏览器访问 http://localhost:3000
      3. 点击ActivityBar中的"聊天"按钮，创建Chat窗口
      4. 验证智能体结果折叠块显示在消息流中
      5. 验证默认为折叠状态（显示摘要）
      6. 点击折叠块，验证展开并显示详细内容
      7. 再次点击，验证重新折叠
    Expected Result: 折叠块可正常切换，内容显示正确
    Failure Indicators: 点击无反应，内容不显示
    Evidence: .sisyphus/evidence/task-03-agent-block.png

  Scenario: 智能体结果状态显示
    Tool: Playwright
    Preconditions: 有3个不同状态的智能体结果（运行中、已完成、失败）
    Steps:
      1. 验证运行中状态：蓝色，显示旋转动画
      2. 验证已完成状态：绿色，显示✓图标
      3. 验证失败状态：红色，显示✗图标
    Expected Result: 不同状态显示正确的颜色和图标
    Failure Indicators: 状态颜色错误，图标不显示
    Evidence: .sisyphus/evidence/task-03-agent-status.png
  ```

  **Commit**: YES
  - Message: `feat(input): add AgentResultBlock component`
  - Files: `opencode-ide/src/components/input/AgentResultBlock.tsx`

---

- [ ] 4. 文件拖拽增强

  **What to do**:
  - 修改 `src/components/chat/ChatInputPanel.tsx`
  - 添加拖拽区域（整个输入框支持拖拽）
  - 处理 `dragover` 和 `drop` 事件
  - 区分文件拖拽和文本拖拽：
    - 文件拖拽 → 作为附件（调用现有的 `addImageAttachment` 或新的 `addFileAttachment`）
    - 文本拖拽 → 转换为Markdown格式并插入到输入框
  - 添加拖拽视觉反馈（拖拽时边框高亮）
  - 扩展附件类型（不只是图片，支持所有文件类型）

  **Must NOT do**:
  - ❌ 不修改现有的图片粘贴功能
  - ❌ 不添加文件上传到服务器的逻辑
  - ❌ 不限制文件类型（支持所有文件）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 拖拽事件处理是简单的DOM操作
  - **Skills**: []
    - 无特殊技能需求
  - **Skills Evaluated but Omitted**:
    - `visual-engineering`: 视觉反馈简单，不需要复杂设计

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: Task 8
  - **Blocked By**: None (can start immediately)

  **References**:
  - `opencode-ide/src/components/chat/ChatInputPanel.tsx:98-120` - 现有粘贴处理逻辑
  - `opencode-ide/src/types/index.ts:64-70` - ImageAttachment类型

  **Acceptance Criteria**:
  - [ ] 拖拽文件到输入框正常工作
  - [ ] 文件作为附件显示（文件名+图标）
  - [ ] 拖拽文本转换为Markdown格式
  - [ ] 拖拽时显示视觉反馈（边框高亮）
  - [ ] 支持所有文件类型（不限制）

  **QA Scenarios**:

  ```
  Scenario: 文件拖拽上传
    Tool: Playwright (playwright skill)
    Preconditions: 输入框窗口已打开
    Steps:
      1. 启动开发服务器
      2. 打开浏览器
      3. 创建输入框窗口
      4. 从文件管理器拖拽一个文本文件（test.txt）到输入框
      5. 验证文件作为附件显示（显示文件名和图标）
      6. 验证输入框边框在拖拽时高亮
    Expected Result: 文件拖拽正常工作，附件显示正确
    Failure Indicators: 拖拽无反应，附件不显示
    Evidence: .sisyphus/evidence/task-04-file-drag.png

  Scenario: 文本拖拽转换
    Tool: Playwright
    Preconditions: 输入框窗口已打开
    Steps:
      1. 在另一个应用中选中文本
      2. 拖拽文本到输入框
      3. 验证文本被插入到输入框中
      4. 验证文本格式保留（换行等）
    Expected Result: 文本拖拽正常工作，格式保留
    Failure Indicators: 文本不插入，格式丢失
    Evidence: .sisyphus/evidence/task-04-text-drag.png
  ```

  **Commit**: YES
  - Message: `feat(input): enhance file drag and drop`
  - Files: `opencode-ide/src/components/chat/ChatInputPanel.tsx`, `opencode-ide/src/types/index.ts`

---

- [ ] 5. 项目列表弹窗组件

  **What to do**:
  - 创建新文件 `src/components/input/ProjectMentionPopup.tsx`
  - 实现项目列表弹出组件（类似下拉菜单）
  - Props: `projects: ProjectMention[]`, `onSelect: (project: ProjectMention) => void`, `position: { x: number, y: number }`, `visible: boolean`
  - 渲染项目列表：显示项目名称、路径
  - 支持键盘导航（上下箭头，Enter选择，Esc关闭）
  - 支持搜索过滤（输入关键字实时过滤列表）
  - 最多显示10个项目
  - 使用Tailwind CSS样式，白+粉主题
  - 使用Portal渲染到body（避免被父容器裁剪）

  **Must NOT do**:
  - ❌ 不实现项目上下文加载逻辑（只展示列表）
  - ❌ 不添加跳转功能
  - ❌ 不使用外部UI库（如react-select）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 需要设计弹出菜单的视觉效果和键盘交互
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: 需要设计下拉菜单的交互效果
  - **Skills Evaluated but Omitted**:
    - `playwright`: UI组件，不是浏览器测试

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7)
  - **Blocks**: Tasks 6, 7
  - **Blocked By**: Task 1 (需要ProjectMention类型)

  **References**:
  - `opencode-ide/src/components/layout/index.tsx:18-47` - 参考ActivityBar的项目列表
  - `opencode-ide/src/components/explorer/index.tsx` - 参考文件列表样式

  **Acceptance Criteria**:
  - [ ] 组件渲染正确（显示项目列表）
  - [ ] 支持键盘导航（上下箭头，Enter，Esc）
  - [ ] 支持搜索过滤（实时过滤）
  - [ ] 最多显示10个项目
  - [ ] 使用Portal渲染（避免裁剪）
  - [ ] 点击项目触发onSelect回调

  **QA Scenarios**:

  ```
  Scenario: 项目列表弹窗显示
    Tool: Playwright (playwright skill)
    Preconditions: 输入框窗口已打开，当前打开了2个项目
    Steps:
      1. 启动开发服务器
      2. 打开浏览器
      3. 创建输入框窗口
      4. 在输入框中输入 @
      5. 验证项目列表弹窗显示
      6. 验证显示当前打开的项目（2个）
    Expected Result: 弹窗正常显示，列表正确
    Failure Indicators: 弹窗不显示，列表为空
    Evidence: .sisyphus/evidence/task-05-mention-popup.png

  Scenario: 项目列表键盘导航
    Tool: Playwright
    Preconditions: 项目列表弹窗已打开，有3个项目
    Steps:
      1. 按下箭头键，验证第二个项目高亮
      2. 再次按下箭头键，验证第三个项目高亮
      3. 按上箭头键，验证第二个项目高亮
      4. 按 Enter 键，验证选择该项目
      5. 弹窗关闭
    Expected Result: 键盘导航正常工作
    Failure Indicators: 高亮不移动，Enter无反应
    Evidence: .sisyphus/evidence/task-05-mention-keyboard.png
  ```

  **Commit**: YES
  - Message: `feat(input): add ProjectMentionPopup component`
  - Files: `opencode-ide/src/components/input/ProjectMentionPopup.tsx`

---

- [ ] 6. @提及触发逻辑

  **What to do**:
  - 创建新文件 `src/hooks/useProjectMention.ts`
  - 实现自定义Hook，处理@提及触发逻辑
  - 监听输入框文本变化，检测 `@` 字符
  - 当输入 `@` 时，触发弹出项目列表
  - 跟踪光标位置，确定弹窗显示位置
  - 处理项目选择：插入项目标签（蓝色高亮，如 `@MyProject`）
  - 处理取消：Esc键或点击弹窗外部关闭
  - 返回：`{ showPopup, popupPosition, filteredProjects, handleSelect, handleClose }`

  **Must NOT do**:
  - ❌ 不实现项目上下文加载（由Task 7处理）
  - ❌ 不修改输入框的DOM结构（只处理逻辑）
  - ❌ 不添加跳转功能

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Hook逻辑相对简单，不需要复杂设计
  - **Skills**: []
    - 无特殊技能需求
  - **Skills Evaluated but Omitted**:
    - `visual-engineering`: 不涉及UI设计

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 7)
  - **Blocks**: Task 8
  - **Blocked By**: Task 5 (需要ProjectMentionPopup组件)

  **References**:
  - `opencode-ide/src/hooks/useLongPressInteraction.ts` - 参考现有Hook结构
  - `opencode-ide/src/store/index.ts:71-113` - 参考状态管理

  **Acceptance Criteria**:
  - [ ] 输入 `@` 时触发弹窗显示
  - [ ] 弹窗位置跟随光标位置
  - [ ] 选择项目后插入蓝色标签（如 `@MyProject`）
  - [ ] Esc键关闭弹窗
  - [ ] 点击弹窗外部关闭弹窗
  - [ ] 返回正确的Hook接口

  **QA Scenarios**:

  ```
  Scenario: @提及触发和选择
    Tool: Playwright (playwright skill)
    Preconditions: 输入框窗口已打开，当前打开了项目"MyProject"
    Steps:
      1. 启动开发服务器
      2. 打开浏览器
      3. 创建输入框窗口
      4. 在输入框中输入 @
      5. 验证项目列表弹窗显示
      6. 点击项目"MyProject"
      7. 验证弹窗关闭
      8. 验证输入框中显示蓝色标签 @MyProject
    Expected Result: @提及正常工作，标签显示正确
    Failure Indicators: 弹窗不显示，选择无反应，标签不显示
    Evidence: .sisyphus/evidence/task-06-mention-trigger.png

  Scenario: @提及取消
    Tool: Playwright
    Preconditions: 项目列表弹窗已打开
    Steps:
      1. 按 Esc 键
      2. 验证弹窗关闭
      3. 验证输入框中不插入项目标签
    Expected Result: Esc键正常关闭弹窗
    Failure Indicators: 弹窗不关闭
    Evidence: .sisyphus/evidence/task-06-mention-cancel.png
  ```

  **Commit**: YES
  - Message: `feat(input): add @ mention trigger logic`
  - Files: `opencode-ide/src/hooks/useProjectMention.ts`

---

- [ ] 7. 项目上下文加载

  **What to do**:
  - 在 `src/store/index.ts` 中添加项目上下文相关的状态和actions
  - 添加状态：`currentProjectContext: ProjectMention | null`, `isLoadingContext: boolean`
  - 添加action：`loadProjectContext: (project: ProjectMention) => Promise<void>`
  - 实现 `loadProjectContext`：调用后端API加载项目上下文（文件列表、代码索引等）
  - 添加loading状态指示器
  - 添加错误处理（加载失败时显示错误消息）
  - 注意：后端API是假设的，实际需要与后端团队协调

  **Must NOT do**:
  - ❌ 不实现后端API（只调用假设的API）
  - ❌ 不修改窗口跳转逻辑（只加载上下文）
  - ❌ 不添加项目切换功能

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 状态管理和API调用是标准操作
  - **Skills**: []
    - 无特殊技能需求
  - **Skills Evaluated but Omitted**:
    - `visual-engineering`: 不涉及UI设计

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6)
  - **Blocks**: Task 8
  - **Blocked By**: Task 5 (需要ProjectMention类型)

  **References**:
  - `opencode-ide/src/store/index.ts:176-224` - 参考现有action实现
  - `opencode-ide/src/types/index.ts:72-86` - 参考FileItem类型

  **Acceptance Criteria**:
  - [ ] 状态添加正确（currentProjectContext, isLoadingContext）
  - [ ] loadProjectContext action实现完整
  - [ ] Loading状态正确显示
  - [ ] 错误处理正确（显示错误消息）
  - [ ] 类型检查通过

  **QA Scenarios**:

  ```
  Scenario: 项目上下文加载
    Tool: Playwright (playwright skill)
    Preconditions: 输入框窗口已打开，后端API可用（假设）
    Steps:
      1. 在输入框中输入 @ 并选择项目"MyProject"
      2. 验证loading状态指示器显示
      3. 等待加载完成
      4. 验证loading指示器消失
      5. 验证项目上下文已加载（检查状态）
    Expected Result: 上下文加载正常工作，loading显示正确
    Failure Indicators: loading不显示，加载失败
    Evidence: .sisyphus/evidence/task-07-context-load.png

  Scenario: 项目上下文加载失败
    Tool: Playwright
    Preconditions: 后端API不可用（模拟失败）
    Steps:
      1. 在输入框中输入 @ 并选择项目
      2. 验证loading状态显示
      3. 等待加载失败
      4. 验证错误消息显示
    Expected Result: 错误处理正确，显示错误消息
    Failure Indicators: 无错误提示，应用崩溃
    Evidence: .sisyphus/evidence/task-07-context-error.png
  ```

  **Commit**: YES
  - Message: `feat(input): add project context loading`
  - Files: `opencode-ide/src/store/index.ts`

---

- [ ] 8. ChatInputPanel集成

  **What to do**:
  - 修改 `src/components/chat/ChatInputPanel.tsx`
  - 集成TodoListPanel组件（输入框上方）
  - 集成ProjectMentionPopup组件（@提及弹窗）
  - 集成useProjectMention Hook
  - 连接Zustand store（todos, currentProjectContext）
  - 实现待办清单的交互：
    - onToggle: 切换待办完成状态
    - onDelete: 删除单个待办
    - onClearAll: 清空所有待办
  - 实现@提及的完整流程：
    - 输入@触发弹窗
    - 选择项目加载上下文
    - 插入蓝色标签
  - 智能体结果在消息流中渲染（使用AgentResultBlock）
  - 确保所有功能协同工作

  **Must NOT do**:
  - ❌ 不破坏现有的输入功能（文本输入、图片粘贴、发送消息）
  - ❌ 不添加新的窗口类型
  - ❌ 不修改停靠逻辑

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 集成工作需要仔细协调多个组件，工作量较大
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: 需要确保UI集成后的视觉协调性
  - **Skills Evaluated but Omitted**:
    - `playwright`: 这是开发任务，不是测试

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Tasks 9, 10
  - **Blocked By**: Tasks 1, 2, 3, 4, 6, 7

  **References**:
  - `opencode-ide/src/components/chat/ChatInputPanel.tsx:1-243` - 现有输入框实现
  - `opencode-ide/src/store/index.ts:18-25` - Zustand store使用

  **Acceptance Criteria**:
  - [ ] TodoListPanel正确显示在输入框上方
  - [ ] @提及功能完整工作（输入@ → 弹窗 → 选择 → 加载上下文 → 插入标签）
  - [ ] 待办清单交互正确（切换、删除、清空）
  - [ ] 文件拖拽功能保留
  - [ ] 现有功能不受影响（文本输入、图片粘贴、发送消息）
  - [ ] 所有组件正确连接到store

  **QA Scenarios**:

  ```
  Scenario: ChatInputPanel完整功能测试
    Tool: Playwright (playwright skill)
    Preconditions: 开发服务器运行，输入框窗口已打开
    Steps:
      1. 验证待办清单显示在输入框上方
      2. 点击待办清单折叠按钮，验证折叠/展开
      3. 添加一个待办项（手动或通过智能体），验证显示
      4. 点击待办项复选框，验证状态切换
      5. 在输入框中输入 @，验证项目列表弹窗
      6. 选择一个项目，验证蓝色标签插入
      7. 拖拽一个文件到输入框，验证附件显示
      8. 在输入框中输入文本，按Enter发送
      9. 验证消息发送成功
    Expected Result: 所有功能正常工作，无冲突
    Failure Indicators: 组件不显示，交互失败，功能冲突
    Evidence: .sisyphus/evidence/task-08-integration.png

  Scenario: @提及完整流程
    Tool: Playwright
    Preconditions: 当前打开了项目"TestProject"
    Steps:
      1. 在输入框中输入 @
      2. 验证项目列表弹窗显示"TestProject"
      3. 点击选择"TestProject"
      4. 验证弹窗关闭，输入框显示蓝色标签 @TestProject
      5. 验证项目上下文开始加载
      6. 等待加载完成
      7. 验证上下文加载成功指示
    Expected Result: @提及完整流程正常工作
    Failure Indicators: 弹窗不显示，选择无反应，加载失败
    Evidence: .sisyphus/evidence/task-08-mention-flow.png
  ```

  **Commit**: YES
  - Message: `feat(input): integrate all input enhancements`
  - Files: `opencode-ide/src/components/chat/ChatInputPanel.tsx`

---

- [ ] 9. 输入框尺寸调整

  **What to do**:
  - 修改 `src/components/chat/ChatInputPanel.tsx`
  - 添加输入框宽度调整功能
  - 实现拖拽调整：鼠标拖拽输入框右边缘
  - 默认宽度：500px
  - 最小宽度：300px
  - 最大宽度：800px
  - 保存用户偏好到localStorage（或electron-store）
  - 加载时恢复用户上次的宽度设置
  - 添加视觉反馈（拖拽时显示调整光标）

  **Must NOT do**:
  - ❌ 不调整高度（高度保持自适应）
  - ❌ 不使用外部拖拽库（自己实现）
  - ❌ 不修改停靠模式下的尺寸调整逻辑

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 尺寸调整是简单的拖拽逻辑
  - **Skills**: []
    - 无特殊技能需求
  - **Skills Evaluated but Omitted**:
    - `visual-engineering`: 视觉反馈简单

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 10)
  - **Blocks**: None
  - **Blocked By**: Task 8

  **References**:
  - `opencode-ide/src/components/layout/SplitPane.tsx:30-79` - 参考拖拽调整逻辑
  - `opencode-ide/src/components/window/FloatingWindow.tsx:107-169` - 参考窗口调整

  **Acceptance Criteria**:
  - [ ] 可以拖拽右边缘调整宽度
  - [ ] 宽度限制正确（最小300px，最大800px）
  - [ ] 用户偏好保存到localStorage
  - [ ] 重新打开窗口时恢复宽度
  - [ ] 拖拽时显示调整光标（ew-resize）

  **QA Scenarios**:

  ```
  Scenario: 输入框宽度调整
    Tool: Playwright (playwright skill)
    Preconditions: 输入框窗口已打开
    Steps:
      1. 获取输入框初始宽度（应为500px）
      2. 鼠标移动到右边缘，验证光标变为ew-resize
      3. 拖拽右边缘向左移动100px
      4. 验证宽度变为400px
      5. 刷新页面
      6. 验证宽度保持400px（从localStorage恢复）
    Expected Result: 宽度调整和持久化正常工作
    Failure Indicators: 拖拽无反应，宽度不保存
    Evidence: .sisyphus/evidence/task-09-resize.png

  Scenario: 输入框宽度限制
    Tool: Playwright
    Preconditions: 输入框窗口已打开
    Steps:
      1. 拖拽右边缘向左移动300px（超过最小宽度）
      2. 验证宽度限制为300px
      3. 拖拽右边缘向右移动500px（超过最大宽度）
      4. 验证宽度限制为800px
    Expected Result: 宽度限制正确
    Failure Indicators: 宽度可以超出限制
    Evidence: .sisyphus/evidence/task-09-resize-limit.png
  ```

  **Commit**: YES
  - Message: `feat(input): add resizable input box`
  - Files: `opencode-ide/src/components/chat/ChatInputPanel.tsx`

---

- [ ] 10. 状态管理更新

  **What to do**:
  - 修改 `src/store/index.ts`
  - 添加对话实例管理：
    - 添加 `conversations: Conversation[]` 状态
    - 添加 `currentConversationId: string | null` 状态
    - 添加 `createConversation`, `switchConversation`, `deleteConversation` actions
  - 将现有的全局 `messages` 迁移到对话实例中
  - 添加待办清单管理：
    - 添加 `addTodo`, `toggleTodo`, `deleteTodo`, `clearTodos` actions
  - 添加智能体结果管理：
    - 添加 `addAgentResult` action
  - 确保所有新状态和actions正确连接到ChatInputPanel

  **Must NOT do**:
  - ❌ 不破坏现有的store接口（保持向后兼容）
  - ❌ 不添加后端同步逻辑（假设本地存储）
  - ❌ 不修改其他组件的store使用

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 状态管理更新是标准操作
  - **Skills**: []
    - 无特殊技能需求
  - **Skills Evaluated but Omitted**:
    - `visual-engineering`: 不涉及UI

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 9)
  - **Blocks**: None
  - **Blocked By**: Task 8

  **References**:
  - `opencode-ide/src/store/index.ts:1-429` - 现有store实现
  - `opencode-ide/src/types/index.ts` - 数据类型定义

  **Acceptance Criteria**:
  - [ ] 对话实例管理正确实现
  - [ ] 待办清单管理正确实现
  - [ ] 智能体结果管理正确实现
  - [ ] 现有store接口保持兼容
  - [ ] 类型检查通过
  - [ ] 所有新actions正确导出

  **QA Scenarios**:

  ```
  Scenario: 对话实例管理
    Tool: Bash
    Preconditions: store已更新
    Steps:
      1. 启动开发服务器
      2. 打开浏览器控制台
      3. 执行：window.store.getState().createConversation()
      4. 验证新对话创建成功
      5. 执行：window.store.getState().switchConversation(newId)
      6. 验证当前对话切换成功
    Expected Result: 对话管理正常工作
    Failure Indicators: action不存在，状态不更新
    Evidence: .sisyphus/evidence/task-10-conversation.txt

  Scenario: 待办清单管理
    Tool: Bash
    Preconditions: store已更新
    Steps:
      1. 执行：window.store.getState().addTodo({description: "Test"})
      2. 验证待办添加成功
      3. 执行：window.store.getState().toggleTodo(todoId)
      4. 验证待办状态切换
      5. 执行：window.store.getState().clearTodos()
      6. 验证所有待办清空
    Expected Result: 待办管理正常工作
    Failure Indicators: action不存在，状态不更新
    Evidence: .sisyphus/evidence/task-10-todo.txt
  ```

  **Commit**: YES
  - Message: `feat(input): update state management`
  - Files: `opencode-ide/src/store/index.ts`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration. Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **1**: `feat(input): add data models for todo and agent result` — types/index.ts
- **2**: `feat(input): add TodoListPanel component` — components/input/TodoListPanel.tsx
- **3**: `feat(input): add AgentResultBlock component` — components/input/AgentResultBlock.tsx
- **4**: `feat(input): enhance file drag and drop` — components/chat/ChatInputPanel.tsx
- **5-7**: `feat(input): add @mention functionality` — components/input/ProjectMention.tsx, hooks/useProjectMention.ts
- **8**: `feat(input): integrate all input enhancements` — components/chat/ChatInputPanel.tsx
- **9**: `feat(input): add resizable input box` — components/chat/ChatInputPanel.tsx
- **10**: `feat(input): update state management` — store/index.ts

---

## Success Criteria

### Verification Commands
```bash
# 类型检查
cd opencode-ide && npm run type-check  # Expected: no errors

# 构建检查
cd opencode-ide && npm run build  # Expected: build success

# 启动开发服务器
cd opencode-ide && npm run dev  # Expected: server starts on port 3000
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All QA scenarios pass
- [ ] No TypeScript errors
- [ ] Build succeeds
