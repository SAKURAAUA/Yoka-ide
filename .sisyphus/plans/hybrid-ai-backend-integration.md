# 混合 AI 后端集成计划

## TL;DR

> **Quick Summary**: 实现可插拔的 AI 后端系统，主要使用 GitHub Copilot SDK（多模态支持），保留 OpenCode SDK 作为备用后端（本地模型索引）。用户可在设置中切换后端。
> 
> **Deliverables**:
> - AI Backend 抽象层
> - Copilot SDK 集成（多模态）
> - OpenCode SDK 集成（备用）
> - 后端选择器 UI
> - 图片上传功能
> - 真实 AI 响应集成

> **Estimated Effort**: 2-2.5周
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: 抽象层 → Copilot SDK → UI 集成

---

## Context

### Original Request
用户希望将 Electron IDE 与 AI 后端集成，原计划使用 OpenCode SDK。经过调研，决定采用混合方案：主要使用 GitHub Copilot CLI SDK（团队已有订阅、模型质量好、支持多模态），保留 OpenCode SDK 作为备用后端（用于本地模型索引）。

### Interview Summary

**Key Discussions**:
- **变更动机**: Copilot 模型质量更好、团队已有订阅、成本更低
- **离线需求**: 不需要
- **数据隐私**: 代码可以发送到 GitHub
- **本地模型**: 用于项目索引（可选）
- **最终方案**: 混合后端，用户可选择

**Technical Decisions**:
- 使用 `@github/copilot-sdk` (JSON-RPC) 作为主要后端
- 使用 `@opencode-ai/sdk` 作为备用后端
- 设计抽象层支持多后端切换
- 支持 Vision/多模态输入（图片）
- 分阶段实施：先 Copilot，后 OpenCode

### Research Findings

**GitHub Copilot Vision 能力**：
- ✅ 完全支持图片输入（2025年3月 Public Preview）
- ✅ 支持格式：JPEG, PNG, GIF, WEBP
- ✅ 功能：拖放/粘贴图片、截图分析、从图片生成代码
- ✅ 支持模型：GPT-4o/5.x, Claude Sonnet, Gemini Pro

**OpenCode SDK 能力**：
- ✅ 通过底层模型支持多模态
- ✅ 支持本地模型（Ollama）
- ⚠️ 需要用户配置 API 密钥

### Metis Review

**Identified Gaps** (addressed):
- 多模态支持确认：✅ Copilot 完全支持
- SDK 稳定性：⚠️ Copilot SDK 为 Technical Preview，需错误处理
- 后端切换：✅ 设计抽象层支持
- 图片上传 UI：✅ 已规划

---

## Work Objectives

### Core Objective
实现一个可插拔的 AI 后端系统，支持：
1. GitHub Copilot SDK 作为主要后端（多模态、高质量）
2. OpenCode SDK 作为备用后端（本地模型、离线场景）
3. 用户可在设置中切换后端
4. Chat 面板使用真实 AI 响应（替换占位符）
5. 支持图片上传和 Vision 分析

### Concrete Deliverables
- `src/lib/ai-backend/` - AI 后端抽象层
- `src/lib/ai-backend/copilot/` - Copilot SDK 集成
- `src/lib/ai-backend/opencode/` - OpenCode SDK 集成（备用）
- `src/store/ai-store.ts` - AI 后端状态管理
- `src/components/chat/ChatPanel.tsx` - 真实 AI 响应
- `src/components/chat/ImageUpload.tsx` - 图片上传组件
- `src/components/settings/BackendSelector.tsx` - 后端选择器

### Definition of Done
- [ ] Copilot SDK 连接成功
- [ ] Chat 面板显示真实 AI 响应
- [ ] 流式响应正常显示
- [ ] 图片上传和 Vision 分析正常工作
- [ ] 后端切换功能正常
- [ ] OpenCode SDK 作为备用可用（可选）

### Must Have
- AI Backend 抽象层
- Copilot SDK 集成
- 真实 AI 响应
- 流式响应
- 多模态/图片支持
- 后端选择器

### Must NOT Have (Guardrails)
- 不要阻塞 UI 线程（所有 AI 操作异步）
- 不要在渲染进程直接调用 Copilot CLI（使用 SDK 或 IPC）
- 不要硬编码后端配置（使用设置）
- 不要忽略网络错误（优雅降级）
- 不要默认选择 OpenCode（Copilot 为主）

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: 需要检查（bun test）
- **Automated tests**: 单元测试
- **Framework**: bun test
- **TDD**: 核心逻辑使用 TDD

### QA Policy
每个任务包含 Agent-Executed QA Scenarios。

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (基础设施 - 5 并行):
├── Task 1: AI Backend 抽象层 [quick]
├── Task 2: AI 状态管理 Store [quick]
├── Task 3: 类型定义 [quick]
├── Task 4: Copilot SDK 客户端 [quick]
└── Task 5: IPC 通道扩展 [quick]

Wave 2 (Copilot 集成 - 4 并行):
├── Task 6: Copilot 认证流程 [deep]
├── Task 7: Copilot 会话管理 [deep]
├── Task 8: 流式响应处理 [deep]
└── Task 9: 多模态支持 [unspecified-high]

Wave 3 (UI 集成 - 5 并行):
├── Task 10: Chat 面板重构 [visual-engineering]
├── Task 11: 图片上传组件 [visual-engineering]
├── Task 12: 后端选择器 [visual-engineering]
├── Task 13: 状态指示器 [visual-engineering]
└── Task 14: OpenCode SDK 集成（可选）[unspecified-high]

Wave FINAL (验证 - 4 并行):
├── Task F1: 功能完整性检查 [oracle]
├── Task F2: 代码质量审查 [unspecified-high]
├── Task F3: 实际场景测试 [unspecified-high]
└── Task F4: 范围一致性检查 [deep]
```

---

## TODOs

### Wave 1: 基础设施

- [ ] 1. AI Backend 抽象层

  **What to do**:
  - 创建 `src/lib/ai-backend/types.ts` 定义统一接口
  - 创建 `src/lib/ai-backend/manager.ts` 后端管理器
  - 定义 `AIBackend` 接口：`sendMessage()`, `uploadImage()`, `getStatus()`
  - 实现后端注册和切换逻辑

  **Must NOT do**:
  - 不要在抽象层中包含特定后端的实现细节

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: 无特殊要求

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 4, 6, 7

  **References**:
  - `src/store/index.ts` - 现有状态管理模式
  - `src/types/index.ts` - 类型定义模式

  **Acceptance Criteria**:
  - [ ] `AIBackend` 接口定义完成
  - [ ] `BackendManager` 类创建
  - [ ] TypeScript 编译通过
  - [ ] 单元测试通过

  **QA Scenarios**:
  ```
  Scenario: 抽象层导入测试
    Tool: Bash
    Steps:
      1. bun test src/lib/ai-backend/types.test.ts
    Expected Result: 所有测试通过
    Evidence: .sisyphus/evidence/task-01-abstract-test.log
  ```

  **Commit**: YES
  - Message: `feat(ai): add AI backend abstraction layer`
  - Files: `src/lib/ai-backend/types.ts`, `src/lib/ai-backend/manager.ts`

---

- [ ] 2. AI 状态管理 Store

  **What to do**:
  - 创建 `src/store/ai-store.ts`
  - 实现后端状态：`activeBackend`, `connectionStatus`, `availableBackends`
  - 实现后端切换 action
  - 集成到主 Store

  **Must NOT do**:
  - 不要在 Store 中直接发起网络请求

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: 无特殊要求

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 10, 12, 13

  **References**:
  - `src/store/index.ts:21-50` - 现有 Store 结构

  **Acceptance Criteria**:
  - [ ] AIStore 创建完成
  - [ ] 状态类型完整
  - [ ] 后端切换 action 实现
  - [ ] 单元测试通过

  **QA Scenarios**:
  ```
  Scenario: Store 状态更新
    Tool: Bash
    Steps:
      1. bun test src/store/ai-store.test.ts
    Expected Result: 所有测试通过
    Evidence: .sisyphus/evidence/task-02-store-test.log
  ```

  **Commit**: YES
  - Message: `feat(store): add AI backend state management`
  - Files: `src/store/ai-store.ts`, `src/store/index.ts`

---

- [ ] 3. 类型定义

  **What to do**:
  - 创建 `src/types/ai.ts` AI 相关类型
  - 定义 `AIMessage`, `AIImage`, `AIResponse`, `AIBackendConfig`
  - 定义后端类型枚举

  **Must NOT do**:
  - 不要与现有 `src/types/index.ts` 冲突

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: 无特殊要求

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 1, 2

  **References**:
  - `src/types/index.ts:56-70` - 现有 Message 类型

  **Acceptance Criteria**:
  - [ ] 类型定义完整
  - [ ] 与现有类型兼容
  - [ ] TypeScript 编译通过

  **Commit**: YES
  - Message: `feat(types): add AI backend types`
  - Files: `src/types/ai.ts`

---

- [ ] 4. Copilot SDK 客户端封装

  **What to do**:
  - 安装 `@github/copilot-sdk` npm 包
  - 创建 `src/lib/ai-backend/copilot/client.ts`
  - 封装 SDK 的 `CopilotClient` 类
  - 实现连接、断开、重连逻辑
  - 实现 `AIBackend` 接口

  **Must NOT do**:
  - 不要硬编码认证信息
  - 不要忽略 SDK 错误

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: 无特殊要求

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 6, 7, 8, 9

  **References**:
  - SDK 文档: `https://github.com/github/copilot-sdk`
  - `src/lib/ai-backend/types.ts` - 抽象接口

  **Acceptance Criteria**:
  - [ ] `@github/copilot-sdk` 安装成功
  - [ ] `CopilotBackend` 类实现 `AIBackend` 接口
  - [ ] 连接/断开逻辑正常
  - [ ] 单元测试通过

  **QA Scenarios**:
  ```
  Scenario: SDK 导入验证
    Tool: Bash
    Steps:
      1. node -e "require('@github/copilot-sdk')"
    Expected Result: 无错误输出
    Evidence: .sisyphus/evidence/task-04-sdk-import.log
  ```

  **Commit**: YES
  - Message: `feat(copilot): add Copilot SDK client wrapper`
  - Files: `package.json`, `src/lib/ai-backend/copilot/client.ts`

---

- [ ] 5. IPC 通道扩展

  **What to do**:
  - 扩展 `electron/preload.js` 添加 AI 相关 IPC
  - 添加 IPC 通道：`ai:send`, `ai:upload`, `ai:status`
  - 扩展 `electron/main.js` 添加处理器
  - 更新类型定义

  **Must NOT do**:
  - 不要暴露敏感 API 给渲染进程

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: 无特殊要求

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 6, 11

  **References**:
  - `electron/main.js:407-510` - 现有 IPC 处理器
  - `electron/preload.js` - 现有 preload 脚本

  **Acceptance Criteria**:
  - [ ] 新增 AI 相关 IPC 通道
  - [ ] preload.js 暴露新 API
  - [ ] 类型定义更新

  **Commit**: YES
  - Message: `feat(ipc): add AI backend IPC channels`
  - Files: `electron/main.js`, `electron/preload.js`

---

### Wave 2: Copilot 集成

- [ ] 6. Copilot 认证流程

  **What to do**:
  - 创建 `src/lib/ai-backend/copilot/auth.ts`
  - 实现 GitHub OAuth 认证流程
  - 处理 Token 存储和刷新
  - 实现认证状态检查

  **Must NOT do**:
  - 不要在代码中硬编码 Token
  - 不要在渲染进程存储敏感信息

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: 无特殊要求

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 7, 10

  **References**:
  - SDK 文档: GitHub Copilot SDK 认证
  - `electron/main.js` - 安全存储

  **Acceptance Criteria**:
  - [ ] OAuth 流程实现
  - [ ] Token 安全存储
  - [ ] 认证状态检查
  - [ ] 单元测试通过

  **QA Scenarios**:
  ```
  Scenario: 认证状态检查
    Tool: Bash
    Steps:
      1. bun test src/lib/ai-backend/copilot/auth.test.ts
    Expected Result: 认证检查逻辑正确
    Evidence: .sisyphus/evidence/task-06-auth-test.log
  ```

  **Commit**: YES
  - Message: `feat(copilot): implement authentication flow`
  - Files: `src/lib/ai-backend/copilot/auth.ts`

---

- [ ] 7. Copilot 会话管理

  **What to do**:
  - 创建 `src/lib/ai-backend/copilot/session.ts`
  - 实现会话创建、恢复、销毁
  - 与 SDK 的 `createSession()` 集成
  - 会话历史管理

  **Must NOT do**:
  - 不要在内存中无限存储会话

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: 无特殊要求

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 8, 10

  **References**:
  - `src/lib/ai-backend/copilot/client.ts` - 客户端封装

  **Acceptance Criteria**:
  - [ ] 会话管理实现
  - [ ] 与 SDK 集成
  - [ ] 会话状态同步
  - [ ] 单元测试通过

  **Commit**: YES
  - Message: `feat(copilot): implement session management`
  - Files: `src/lib/ai-backend/copilot/session.ts`

---

- [ ] 8. 流式响应处理

  **What to do**:
  - 创建 `src/lib/ai-backend/copilot/stream.ts`
  - 处理 JSON-RPC 事件流
  - 实现增量更新 UI
  - 处理流中断和错误
  - 实现重连逻辑

  **Must NOT do**:
  - 不要阻塞主线程处理流数据
  - 不要忽略流错误

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: 无特殊要求

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 10

  **References**:
  - SDK 事件: `assistant.message`, `assistant.error`
  - `src/store/ai-store.ts` - 状态更新

  **Acceptance Criteria**:
  - [ ] 流式响应处理实现
  - [ ] 事件分发正常
  - [ ] 错误处理完善
  - [ ] 单元测试通过

  **Commit**: YES
  - Message: `feat(copilot): implement streaming response handler`
  - Files: `src/lib/ai-backend/copilot/stream.ts`

---

- [ ] 9. 多模态支持

  **What to do**:
  - 扩展 `CopilotBackend` 支持图片上传
  - 实现 `uploadImage()` 方法
  - 图片格式验证（JPEG, PNG, GIF, WEBP）
  - 图片大小限制检查
  - 与 Vision 模型集成

  **Must NOT do**:
  - 不要上传超大图片（限制 10MB）
  - 不要支持不兼容的格式

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: 无特殊要求

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 11

  **References**:
  - Copilot Vision 文档
  - `src/types/ai.ts` - 图片类型定义

  **Acceptance Criteria**:
  - [ ] 图片上传实现
  - [ ] 格式验证正常
  - [ ] Vision 模型集成
  - [ ] 单元测试通过

  **Commit**: YES
  - Message: `feat(copilot): add multimodal/vision support`
  - Files: `src/lib/ai-backend/copilot/vision.ts`

---

### Wave 3: UI 集成

- [ ] 10. Chat 面板重构

  **What to do**:
  - 重构 `src/components/chat/index.tsx`
  - 集成真实 AI 响应（替换占位符）
  - 流式响应显示
  - 错误状态处理
  - 加载状态

  **Must NOT do**:
  - 不要保留占位响应代码
  - 不要阻塞 UI 等待响应

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Task F3

  **References**:
  - `src/components/chat/index.tsx:59-90` - 现有 handleSubmit
  - `src/lib/ai-backend/manager.ts` - 后端管理器

  **Acceptance Criteria**:
  - [ ] 真实 AI 响应集成
  - [ ] 流式响应显示
  - [ ] 错误处理
  - [ ] 加载状态

  **QA Scenarios**:
  ```
  Scenario: 发送消息获取响应
    Tool: Playwright
    Preconditions: Copilot 已认证
    Steps:
      1. 启动应用
      2. 在聊天输入框输入 "Hello"
      3. 点击发送
      4. 等待响应
    Expected Result: 显示 AI 响应（非占位符）
    Evidence: .sisyphus/evidence/task-10-chat-response.png
  ```

  **Commit**: YES
  - Message: `feat(ui): integrate real AI responses in chat panel`
  - Files: `src/components/chat/index.tsx`

---

- [ ] 11. 图片上传组件

  **What to do**:
  - 创建 `src/components/chat/ImageUpload.tsx`
  - 支持拖放、粘贴、选择文件
  - 图片预览
  - 删除/替换图片
  - 上传进度显示

  **Must NOT do**:
  - 不要支持不兼容的图片格式
  - 不要在内存中无限存储图片

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Task F3

  **References**:
  - `src/components/chat/index.tsx` - Chat 面板
  - `src/types/ai.ts:AIImage` - 图片类型

  **Acceptance Criteria**:
  - [ ] 拖放上传
  - [ ] 粘贴上传
  - [ ] 图片预览
  - [ ] 格式验证

  **QA Scenarios**:
  ```
  Scenario: 图片拖放上传
    Tool: Playwright
    Steps:
      1. 启动应用
      2. 拖放 PNG 图片到聊天区域
      3. 验证图片预览显示
    Expected Result: 图片预览正常显示
    Evidence: .sisyphus/evidence/task-11-image-upload.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add image upload component for vision`
  - Files: `src/components/chat/ImageUpload.tsx`

---

- [ ] 12. 后端选择器

  **What to do**:
  - 创建 `src/components/settings/BackendSelector.tsx`
  - 后端列表显示（Copilot, OpenCode）
  - 后端切换功能
  - 后端状态显示（已连接/断开）
  - 后端配置入口

  **Must NOT do**:
  - 不要在切换时丢失未保存的聊天

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Task F3

  **References**:
  - `src/store/ai-store.ts` - 后端状态
  - `src/lib/ai-backend/manager.ts` - 后端管理器

  **Acceptance Criteria**:
  - [ ] 后端选择器 UI
  - [ ] 切换功能正常
  - [ ] 状态显示正确
  - [ ] 配置入口

  **Commit**: YES
  - Message: `feat(ui): add backend selector component`
  - Files: `src/components/settings/BackendSelector.tsx`

---

- [ ] 13. 状态指示器

  **What to do**:
  - 创建 `src/components/statusbar/AIStatusIndicator.tsx`
  - 显示连接状态图标和文字
  - 断开时显示重连按钮
  - 点击显示连接详情
  - 显示当前后端名称

  **Must NOT do**:
  - 不要频繁更新状态（节流）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Task F3

  **References**:
  - `src/components/layout/index.tsx` - 现有布局
  - `src/store/ai-store.ts` - 连接状态

  **Acceptance Criteria**:
  - [ ] 状态指示器组件
  - [ ] 状态显示正确
  - [ ] 重连按钮可用
  - [ ] 样式一致

  **Commit**: YES
  - Message: `feat(ui): add AI status indicator to status bar`
  - Files: `src/components/statusbar/AIStatusIndicator.tsx`

---

- [ ] 14. OpenCode SDK 集成（可选）

  **What to do**:
  - 安装 `@opencode-ai/sdk`
  - 创建 `src/lib/ai-backend/opencode/client.ts`
  - 实现 `AIBackend` 接口
  - 实现连接到本地 OpenCode Server
  - 用于本地模型索引

  **Must NOT do**:
  - 不要假设 OpenCode 一定在运行
  - 不要阻塞 UI 等待连接

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: 无特殊要求

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 无（可选功能）

  **References**:
  - OpenCode SDK 文档
  - `src/lib/ai-backend/types.ts` - 抽象接口

  **Acceptance Criteria**:
  - [ ] OpenCode SDK 集成
  - [ ] 本地服务器连接
  - [ ] 作为备用后端注册

  **Commit**: YES
  - Message: `feat(opencode): add OpenCode SDK integration as backup`
  - Files: `src/lib/ai-backend/opencode/client.ts`

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

- **Wave 1**: `feat(ai): add AI backend infrastructure and abstraction layer`
- **Wave 2**: `feat(copilot): implement Copilot SDK integration`
- **Wave 3**: `feat(ui): integrate AI backend with UI components`

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
- [ ] Copilot SDK 集成完成
- [ ] 真实 AI 响应正常工作
- [ ] 流式响应正常显示
- [ ] 图片上传和 Vision 分析正常
- [ ] 后端切换功能正常
- [ ] OpenCode SDK 可用（可选）
