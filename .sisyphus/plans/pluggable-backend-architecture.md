# 可插拔多后端架构设计方案 (简化版)

## TL;DR

> **核心目标**: 通过 OpenCode SDK 一次集成获得 75+ AI 提供商支持
> 
> **关键发现**: OpenCode SDK 已内置支持 Groq、Ollama、DeepSeek、OpenRouter、Cerebras、Gemini 等 75+ 提供商
> 
> **架构策略**: OpenCode SDK 作为主后端 + GitHub Copilot 作为兼容后端

**Deliverables**:
- 扩展的 AIBackend 类型系统
- OpenCode SDK 集成 (75+ 提供商自动获得)
- 后端检测器 + OpenCode CLI 一键安装
- 请求路由器
- 配置持久化
- 设置界面集成

**Estimated Effort**: Medium (原 Large)
**Parallel Execution**: YES - 3 waves
**Critical Path**: Wave 1 → Wave 2 → Wave 3

---

## Context

### Original Request
用户希望设计一套可插拔的多后端架构，支持 GitHub Copilot、OpenCode SDK、Groq、Ollama 等。

### Key Discovery
**OpenCode SDK 已内置支持 75+ LLM 提供商**，包括：
- Groq、Ollama、DeepSeek、Cerebras
- OpenRouter (聚合 100+ 模型)
- Gemini、Claude、GPT、xAI
- Together AI、Fireworks AI、Hugging Face
- 等等...

这意味着**无需为每个提供商单独开发插件**，只需集成 OpenCode SDK 即可获得所有支持。

### Simplified Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          您的 IDE                                │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Backend Manager                           │
└─────────────────────────────────────────────────────────────────┘
                                 │
        ┌────────────────────────┴────────────────────────┐
        ▼                                                 ▼
┌───────────────────┐                         ┌───────────────────┐
│    OpenCode SDK   │                         │  GitHub Copilot   │
│   (主后端)         │                         │   (兼容后端)       │
├───────────────────┤                         ├───────────────────┤
│ 支持 75+ 提供商:   │                         │ • 现有实现保留     │
│ • Groq (免费额度)  │                         │ • 向后兼容        │
│ • Ollama (本地)    │                         │ • OAuth 登录      │
│ • DeepSeek (推理)  │                         │                   │
│ • OpenRouter (聚合)│                         │                   │
│ • Cerebras (极速)  │                         │                   │
│ • Gemini (免费)    │                         │                   │
│ • ... 更多        │                         │                   │
└───────────────────┘                         └───────────────────┘
```

---

## Work Objectives

### Core Objective
通过 OpenCode SDK 实现一次集成，获得 75+ AI 提供商支持。

### Concrete Deliverables
- `src/lib/ai-backend/types.ts` - 扩展的类型定义
- `src/lib/ai-backend/manager.ts` - 增强的后端管理器
- `src/lib/ai-backend/plugins/opencode/index.ts` - OpenCode SDK 插件
- `src/lib/ai-backend/plugins/copilot/index.ts` - Copilot 兼容插件
- `src/lib/ai-backend/detector.ts` - 后端检测器
- `src/lib/ai-backend/installer.ts` - OpenCode CLI 安装器
- `src/lib/ai-backend/router.ts` - 请求路由器
- `src/lib/ai-backend/config.ts` - 配置持久化
- `electron/ai/backend-ipc.js` - 后端 IPC 处理

### Definition of Done
- [ ] OpenCode SDK 可正常调用
- [ ] 支持 OpenCode 的所有提供商 (75+)
- [ ] Copilot 后端保持兼容
- [ ] 配置可持久化存储
- [ ] 未安装 OpenCode 时可一键安装

### Must Have
- OpenCode SDK 集成
- GitHub Copilot 兼容
- 配置持久化
- 一键安装能力

### Must NOT Have (Guardrails)
- 不使用 OAuth 反代方案 (已被封锁/高风险)
- 不在主程序中打包 OpenCode SDK (动态加载)
- 不修改现有 Copilot 实现的核心逻辑

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: TDD
- **Framework**: Vitest

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — 基础设施):
├── Task 1: 扩展类型定义 [quick]
├── Task 2: 配置持久化层 [quick]
├── Task 3: 后端检测器 [quick]
└── Task 4: IPC 扩展 [quick]

Wave 2 (After Wave 1 — 核心实现):
├── Task 5: OpenCode SDK 插件 (75+ 提供商) [unspecified-high]
├── Task 6: Copilot 兼容插件 [unspecified-high]
├── Task 7: OpenCode CLI 安装器 [quick]
└── Task 8: 请求路由器 [unspecified-high]

Wave 3 (After Wave 2 — 集成):
├── Task 9: 后端管理器增强 [unspecified-high]
├── Task 10: 设置界面集成 [visual-engineering]
└── Task 11: 集成测试 [deep]

Wave FINAL (verification):
├── Task F1: 计划合规审计 (oracle)
├── Task F2: 代码质量审查 (unspecified-high)
├── Task F3: 真实手动 QA (unspecified-high)
└── Task F4: 范围保真度检查 (deep)

Critical Path: Task 1 → Task 5 → Task 9 → Task 11 → F1-F4
Parallel Speedup: ~50% faster than sequential
Max Concurrent: 4 (Waves 1 & 2)
```

---

## TODOs

- [ ] 1. 扩展类型定义

  **What to do**:
  - 扩展 AIBackendType 支持新后端类型 (`'opencode' | 'copilot'`)
  - 定义 BackendMetadata 接口 (名称、描述、安装状态等)
  - 定义 BackendConfig 接口 (API Key、端点、模型列表等)

  **Must NOT do**:
  - 不修改现有 AIBackend 接口的核心方法
  - 不删除现有类型定义

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 5, 6, 8

  **References**:
  - `src/lib/ai-backend/types.ts:1-71` - 现有类型定义
  - `src/types/ai.ts:1-59` - AI 相关类型

  **Acceptance Criteria**:
  - [ ] AIBackendType 包含 'copilot' | 'opencode'
  - [ ] BackendMetadata 接口定义完整

  **Commit**: YES
  - Message: `feat(backend): extend type definitions`
  - Files: `src/lib/ai-backend/types.ts`

- [ ] 2. 配置持久化层

  **What to do**:
  - 创建 BackendConfigStore 类
  - 实现配置读取/写入方法
  - 支持 OpenCode 配置文件路径配置
  - API Key 加密存储

  **Must NOT do**:
  - 不存储敏感信息明文
  - 不在渲染进程直接访问文件系统

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 5, 8, 10

  **References**:
  - `electron/main.js:2223-2274` - 现有认证存储模式

  **Acceptance Criteria**:
  - [ ] BackendConfigStore 类创建完成
  - [ ] 配置可持久化到本地文件
  - [ ] API Key 加密存储

  **Commit**: YES
  - Message: `feat(backend): add config persistence layer`
  - Files: `src/lib/ai-backend/config.ts`

- [ ] 3. 后端检测器

  **What to do**:
  - 创建 BackendDetector 类
  - 检测 OpenCode CLI 是否安装 (`opencode --version`)
  - 检测 Ollama 服务是否运行 (`localhost:11434`)
  - 检测 Copilot CLI 是否可用
  - 返回检测状态和版本信息

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 7

  **References**:
  - 检测命令: `opencode --version`, `ollama list`

  **Acceptance Criteria**:
  - [ ] BackendDetector 类创建完成
  - [ ] 支持 OpenCode CLI 检测
  - [ ] 支持 Ollama 服务检测

  **Commit**: YES
  - Message: `feat(backend): add backend detector`
  - Files: `src/lib/ai-backend/detector.ts`

- [ ] 4. IPC 扩展

  **What to do**:
  - 扩展 electron API 支持后端管理
  - 添加 backend:list, backend:status, backend:switch, backend:install, backend:config IPC 处理
  - 更新 preload.js 暴露新接口

  **Must NOT do**:
  - 不暴露敏感信息到渲染进程
  - 不允许渲染进程直接执行系统命令

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 10

  **References**:
  - `electron/main.js:2091-2274` - 现有 AI IPC 处理

  **Acceptance Criteria**:
  - [ ] 所有新增 IPC 处理注册完成
  - [ ] preload.js 暴露新接口

  **Commit**: YES
  - Message: `feat(backend): add IPC handlers for backend management`
  - Files: `electron/ai/backend-ipc.js, electron/preload.js`

- [ ] 5. OpenCode SDK 插件 (核心任务)

  **What to do**:
  - 创建 OpenCodeBackend 类实现 AIBackend 接口
  - 动态加载 @opencode-ai/sdk (ES Module)
  - 使用 `createOpencode()` 创建客户端
  - 支持流式响应
  - 暴露 OpenCode 的提供商切换能力
  - 处理 SDK 加载失败的降级方案

  **关键能力** - 自动获得 75+ 提供商:
  - Groq (免费额度，极速)
  - Ollama (本地模型)
  - DeepSeek (推理能力强)
  - OpenRouter (聚合平台)
  - Cerebras (极速推理)
  - Gemini (免费额度)
  - 等等...

  **Must NOT do**:
  - 不在主程序中打包 SDK
  - 不假设 SDK 一定可用

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 9, 10, 11

  **References**:
  - OpenCode SDK: `@opencode-ai/sdk`
  - 使用方式: `import { createOpencode } from '@opencode-ai/sdk'`
  - OpenCode 提供商列表: https://opencode.ai/docs/providers/

  **Acceptance Criteria**:
  - [ ] OpenCodeBackend 类实现完成
  - [ ] SDK 动态加载成功
  - [ ] 支持流式输出
  - [ ] 可切换 OpenCode 配置的提供商
  - [ ] SDK 不可用时优雅降级

  **Commit**: YES
  - Message: `feat(backend): implement OpenCode SDK plugin with 75+ providers`
  - Files: `src/lib/ai-backend/plugins/opencode/index.ts`

- [ ] 6. Copilot 兼容插件

  **What to do**:
  - 将现有 Copilot 实现适配为插件模式
  - 创建 CopilotBackend 类包装现有功能
  - 保持向后兼容
  - 复用现有 Bridge 和认证逻辑

  **Must NOT do**:
  - 不修改现有 Copilot 核心逻辑
  - 不破坏现有功能

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 9

  **References**:
  - `electron/ai/copilotClient.js` - 现有 Copilot 客户端
  - `src/lib/ai-backend/copilot/` - 现有 Copilot 认证

  **Acceptance Criteria**:
  - [ ] CopilotBackend 类创建完成
  - [ ] 现有功能不受影响
  - [ ] 符合 AIBackend 接口

  **Commit**: YES
  - Message: `feat(backend): adapt Copilot as compatible backend`
  - Files: `src/lib/ai-backend/plugins/copilot/index.ts`

- [ ] 7. OpenCode CLI 安装器

  **What to do**:
  - 创建 Installer 类
  - 实现跨平台安装脚本:
    - Windows: `choco install opencode` / `scoop install opencode` / npm
    - macOS: `brew install anomalyco/tap/opencode`
    - Linux: `curl -fsSL https://opencode.ai/install | sh`
  - 显示安装进度
  - 安装后自动检测

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 10

  **References**:
  - OpenCode 安装文档: https://opencode.ai/docs/

  **Acceptance Criteria**:
  - [ ] Installer 类创建完成
  - [ ] 支持跨平台安装
  - [ ] 安装后自动验证

  **Commit**: YES
  - Message: `feat(backend): add OpenCode CLI installer`
  - Files: `src/lib/ai-backend/installer.ts`

- [ ] 8. 请求路由器

  **What to do**:
  - 创建 RequestRouter 类
  - 支持请求类型分类 (chat/completion/reasoning/offline)
  - 支持路由规则配置
  - 支持后端优先级和回退策略

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 9, 11

  **Acceptance Criteria**:
  - [ ] RequestRouter 类创建完成
  - [ ] 支持路由规则配置
  - [ ] 支持回退策略

  **Commit**: YES
  - Message: `feat(backend): add request router`
  - Files: `src/lib/ai-backend/router.ts`

- [ ] 9. 后端管理器增强

  **What to do**:
  - 增强 BackendManager 支持插件注册
  - 实现后端切换逻辑
  - 集成检测器和安装器
  - 集成请求路由器

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Task 5, 6, 7, 8

  **Acceptance Criteria**:
  - [ ] 后端管理器增强完成
  - [ ] 可动态切换后端
  - [ ] 集成检测和安装功能

  **Commit**: YES
  - Message: `feat(backend): enhance backend manager`
  - Files: `src/lib/ai-backend/manager.ts`

- [ ] 10. 设置界面集成

  **What to do**:
  - 创建后端设置 UI 组件
  - 显示可用后端列表和检测状态
  - 提供一键安装按钮
  - 提供提供商切换下拉框

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocked By**: Task 4, 7

  **Acceptance Criteria**:
  - [ ] 设置界面创建完成
  - [ ] 可切换后端
  - [ ] 可一键安装

  **Commit**: YES
  - Message: `feat(ui): integrate backend settings UI`
  - Files: `src/components/BackendSettings.tsx`

- [ ] 11. 集成测试

  **What to do**:
  - 测试 OpenCode SDK 动态加载
  - 测试各提供商连接
  - 测试后端切换
  - 测试配置持久化

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocked By**: Task 9

  **Acceptance Criteria**:
  - [ ] 所有集成测试通过

  **Commit**: YES
  - Message: `test(backend): add integration tests`
  - Files: `src/lib/ai-backend/integration.test.ts`

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
- [ ] F2. **Code Quality Review** — `unspecified-high`
- [ ] F3. **Real Manual QA** — `unspecified-high`
- [ ] F4. **Scope Fidelity Check** — `deep`

---

## Commit Strategy

1. `feat(backend): add type definitions and config persistence`
2. `feat(backend): implement OpenCode SDK plugin with 75+ providers`
3. `feat(backend): add backend detector and installer`
4. `feat(backend): add request router and enhance manager`
5. `feat(ui): integrate backend settings UI`
6. `test(backend): add integration tests`

---

## Success Criteria

### Final Checklist
- [ ] OpenCode SDK 可正常调用
- [ ] 支持 OpenCode 的所有提供商 (75+)
- [ ] Copilot 后端保持兼容
- [ ] 配置持久化正常工作
- [ ] 未安装 OpenCode 时可一键安装
- [ ] 用户可自由切换提供商

---

## OpenCode 支持的提供商速查

| 提供商 | 免费额度 | 特点 |
|--------|----------|------|
| **Groq** | ✅ 有 | LPU 极速推理 |
| **Ollama** | ✅ 完全免费 | 本地模型 |
| **DeepSeek** | ✅ $5 额度 | 推理能力强 |
| **OpenRouter** | 部分 | 聚合 100+ 模型 |
| **Cerebras** | ✅ 有 | 超快推理 |
| **Gemini** | ✅ 每天 1500 请求 | 最强免费额度 |
| **Anthropic** | ❌ | Claude 系列 |
| **OpenAI** | ❌ | GPT 系列 |
| **GitHub Copilot** | ❌ | 订阅制 |
| **xAI** | ❌ | Grok |
| **Together AI** | ✅ $1 额度 | 开源模型 |
| **Fireworks AI** | ✅ 有 | 低延迟 |
| **Hugging Face** | ✅ 有 | 开源模型集合 |
| ... | ... | 共 75+ 提供商 |
