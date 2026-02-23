# 上下文转接文档：OpenCode IDE 混合 AI 后端集成

## 使用说明

将以下内容复制到新的 AI 会话中，可无缝继续工作。

---

## 完整上下文提示词

```
# 项目背景

我正在开发一个 Electron + Next.js 16 的 IDE 项目，需要集成 AI 后端。

## 技术栈
- Electron 34
- Next.js 16.1.6
- React 19
- Zustand 5 (状态管理)
- TypeScript 5.8
- Tailwind CSS 4

## 当前状态
- ✅ 基础框架完成（窗口管理、停靠系统、文件管理器、Git集成）
- ✅ Chat 面板 UI 完成（但使用占位响应，`setTimeout` 模拟）
- ❌ AI 后端未集成（原计划用 OpenCode SDK，但未开始实现）
- ❌ package.json 中无 AI 相关依赖

## 技术选型决策（已完成调研）

经过详细调研，决定采用**混合后端方案**：

### 主要后端：GitHub Copilot SDK
- 原因：
  1. 团队已有 Copilot 订阅（$10/月），成本更低
  2. 模型质量更好（GPT-5.1/5.2 默认）
  3. 部署简单，即开即用
  4. 完全支持多模态/Vision（可上传图片分析）
  5. 集成工作量少（比 OpenCode 减少50%）

### 备用后端：OpenCode SDK
- 用途：本地模型索引、离线场景
- 原因：保留灵活性，支持 Ollama 本地模型

### 多模态确认
- ✅ GitHub Copilot 完全支持 Vision/图片输入
- ✅ 支持格式：JPEG, PNG, GIF, WEBP
- ✅ 功能：拖放/粘贴图片、截图分析、从图片生成代码
- ✅ 支持模型：GPT-4o/5.x, Claude Sonnet 4.5/4.6, Gemini 2.5 Pro/3 Pro

## 用户确认的需求
- 不需要离线使用
- 代码可以发送到 GitHub
- 本地模型用于项目索引（可选）
- 保留双后端支持

## 架构设计

```
┌─────────────────────────────────────────┐
│            IDE Frontend                  │
└────────────────┬────────────────────────┘
                 │
      ┌──────────▼──────────┐
      │   AI Backend Manager │  ← 统一抽象层
      └──────────┬──────────┘
                 │
        ┌────────┴────────┐
        │                 │
   ┌────▼────┐      ┌─────▼─────┐
   │ Copilot │      │  OpenCode │
   │   SDK   │      │    SDK    │
   │(Primary)│      │ (Backup)  │
   └─────────┘      └───────────┘
```

## 关键技术点

### 1. Copilot SDK 集成方式
- 包名：`@github/copilot-sdk`
- 协议：JSON-RPC
- 状态：Technical Preview（可能有破坏性变更）

示例代码：
```typescript
import { CopilotClient } from "@github/copilot-sdk";

const client = new CopilotClient();
await client.start();

const session = await client.createSession({
    model: "gpt-5.1",
});

session.on("assistant.message", (event) => {
    // 流式响应处理
});
```

### 2. 抽象层接口设计
```typescript
interface AIBackend {
  id: string;
  name: string;
  sendMessage(message: string, images?: AIImage[]): Promise<void>;
  uploadImage(file: File): Promise<AIImage>;
  getStatus(): BackendStatus;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}
```

### 3. 现有代码参考
- Store：`src/store/index.ts`（Zustand）
- Types：`src/types/index.ts`
- Chat UI：`src/components/chat/index.tsx`（占位响应在第76-81行）
- IPC：`electron/main.js`, `electron/preload.js`

## 详细工作计划

### Wave 1: 基础设施（3天，5任务并行）
1. **AI Backend 抽象层** - `src/lib/ai-backend/types.ts`, `manager.ts`
2. **AI 状态管理 Store** - `src/store/ai-store.ts`
3. **类型定义** - `src/types/ai.ts`
4. **Copilot SDK 客户端封装** - 安装 `@github/copilot-sdk`, `src/lib/ai-backend/copilot/client.ts`
5. **IPC 通道扩展** - `ai:send`, `ai:upload`, `ai:status`

### Wave 2: Copilot 集成（4天，4任务并行）
6. **认证流程** - GitHub OAuth, Token 存储
7. **会话管理** - `createSession()`, 会话历史
8. **流式响应** - JSON-RPC 事件处理，增量 UI 更新
9. **多模态支持** - 图片上传，Vision 模型集成

### Wave 3: UI 集成（4天，5任务并行）
10. **Chat 面板重构** - 替换占位响应，真实 AI 响应
11. **图片上传组件** - 拖放、粘贴、预览
12. **后端选择器** - Copilot/OpenCode 切换
13. **状态指示器** - 连接状态显示
14. **OpenCode SDK 集成**（可选）- 备用后端

### Final: 验证（1天）
- 功能完整性检查
- 代码质量审查
- 实际场景测试
- 范围一致性检查

## 约束条件（Guardrails）

### Must Have
- AI Backend 抽象层
- Copilot SDK 集成
- 真实 AI 响应
- 流式响应
- 多模态/图片支持
- 后端选择器

### Must NOT Have
- 不要阻塞 UI 线程（所有 AI 操作异步）
- 不要在渲染进程直接调用 CLI（使用 SDK 或 IPC）
- 不要硬编码后端配置（使用设置）
- 不要忽略网络错误（优雅降级）
- 不要默认选择 OpenCode（Copilot 为主）
- 不要硬编码认证信息
- 不要支持超大图片（限制 10MB）

## 参考资源

### 官方文档
- GitHub Copilot CLI: https://docs.github.com/en/copilot/concepts/agents/copilot-cli/about-copilot-cli
- Copilot SDK: https://github.com/github/copilot-sdk
- Copilot Supported Models: https://docs.github.com/en/copilot/reference/ai-models/supported-models
- OpenCode SDK: https://open-code.ai/docs/en/sdk

### 关键日期
- 2025-03-06: Copilot Vision Public Preview
- 2025-04-02: GitHub.com 支持图片上传
- 2025-11-18: Copilot CLI 支持更好图片支持

## 任务

请根据以上上下文，帮我实现混合 AI 后端集成。从 Wave 1 的基础设施开始，逐步完成所有任务。

首先确认你理解了上下文，然后建议我们从哪个任务开始。
```

---

## 快速开始命令

如果要立即开始执行计划：

```
/start-work hybrid-ai-backend-integration
```

计划文件位置：`.sisyphus/plans/hybrid-ai-backend-integration.md`
