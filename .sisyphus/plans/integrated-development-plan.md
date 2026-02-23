# OpenCode IDE - 综合开发计划（合并版）

> 版本：v1.0（合并版）
> 日期：2026-02-22
> 状态：已确认执行策略
> 预估总工期：7-9周

---

## TL;DR

> **核心目标**：整合AI后端集成、多格式编辑器、输入框增强和UI规格实现
>
> **执行顺序**：AI后端 → 编辑器
>
> **协调策略**：
> - ChatInputPanel拆分为6个公共组件
> - 复用FileDropZone组件
> - 统一使用白+粉主题
>
> **交付物**：
> - AI Backend抽象层 + Copilot SDK集成
> - Univer/Tiptap编辑器
> - 增强输入框（@提及、待办清单、文件拖拽）
> - 白+粉主题系统

---

## 执行策略

### 决策汇总

| 决策项 | 选择 | 说明 |
|--------|------|------|
| **执行顺序** | AI后端先执行 | 验证编辑器拖拽到AI的效果 |
| **ChatInputPanel** | 抽取公共组件 | 拆分为6个子组件 |
| **测试策略** | 核心TDD + UI Tests After | 平衡质量和速度 |
| **拖拽集成** | 复用FileDropZone | 编辑器扩展AI后端的组件 |
| **主题系统** | 白+粉配色 | 使用CSS变量实现 |

---

## Phase 1: AI后端 + 公共组件（2.5周）

### Wave 1: 基础设施（5个任务，并行）

- [ ] 1.1 AI Backend 抽象层 [TDD]
  - **文件**: `src/lib/ai-backend/types.ts`, `src/lib/ai-backend/manager.ts`
  - **内容**: 定义 `AIBackend` 接口（sendMessage, uploadImage, getStatus）
  - **测试**: 单元测试覆盖接口定义

- [ ] 1.2 AI 状态管理 Store [TDD]
  - **文件**: `src/store/ai-store.ts`
  - **内容**: activeBackend, connectionStatus, availableBackends
  - **测试**: 状态切换action测试

- [ ] 1.3 类型定义
  - **文件**: `src/types/ai.ts`
  - **内容**: AIMessage, AIImage, AIResponse, AIBackendConfig

- [ ] 1.4 Copilot SDK 客户端封装 [TDD]
  - **文件**: `src/lib/ai-backend/copilot/client.ts`
  - **内容**: 封装CopilotClient，实现AIBackend接口
  - **依赖**: `@github/copilot-sdk`

- [ ] 1.5 IPC 通道扩展 [TDD]
  - **文件**: `electron/preload.js`, `electron/main.js`
  - **内容**: ai:send, ai:upload, ai:status IPC通道

---

### Wave 2: Copilot 集成（4个任务，并行）

- [ ] 2.1 Copilot 认证流程 [TDD]
  - **文件**: `src/lib/ai-backend/copilot/auth.ts`
  - **内容**: GitHub OAuth认证，Token存储和刷新

- [ ] 2.2 Copilot 会话管理 [TDD]
  - **文件**: `src/lib/ai-backend/copilot/session.ts`
  - **内容**: 会话创建、恢复、销毁

- [ ] 2.3 流式响应处理 [TDD]
  - **文件**: `src/lib/ai-backend/copilot/stream.ts`
  - **内容**: JSON-RPC事件流，增量更新UI

- [ ] 2.4 多模态支持 [TDD]
  - **文件**: `src/lib/ai-backend/copilot/vision.ts`
  - **内容**: 图片上传，Vision模型集成

---

### Wave 3: UI 集成 + 公共组件（6个任务，部分并行）

- [ ] 3.1 ChatInputPanel 公共组件拆分 [UI]
  - **新文件**:
    - `src/components/chat/input/TextInputArea.tsx`
    - `src/components/chat/input/ImageAttachmentArea.tsx`
    - `src/components/chat/input/FileDropZone.tsx` ← **关键：编辑器将复用**
    - `src/components/chat/input/MentionPopup.tsx`
    - `src/components/chat/input/SendButton.tsx`
    - `src/components/chat/input/index.tsx`（主容器）
  - **样式**: 白+粉主题，使用CSS变量

- [ ] 3.2 图片上传组件 [UI]
  - **文件**: `src/components/chat/ImageUpload.tsx`
  - **复用**: FileDropZone组件
  - **功能**: 拖放、粘贴、选择文件

- [ ] 3.3 Chat 面板重构 [UI]
  - **文件**: `src/components/chat/index.tsx`
  - **内容**: 集成真实AI响应，流式响应显示
  - **复用**: 拆分后的公共组件

- [ ] 3.4 后端选择器 [UI]
  - **文件**: `src/components/settings/BackendSelector.tsx`
  - **内容**: Copilot/OpenCode切换，状态显示

- [ ] 3.5 状态指示器 [UI]
  - **文件**: `src/components/statusbar/AIStatusIndicator.tsx`
  - **内容**: 连接状态图标，重连按钮

- [ ] 3.6 OpenCode SDK 集成（可选）
  - **文件**: `src/lib/ai-backend/opencode/client.ts`
  - **优先级**: 低

---

### Wave 3.5: 主题系统更新（2个任务，可与Wave 3并行）

- [ ] 3.7 白+粉主题变量
  - **文件**: `src/app/globals.css`
  - **内容**: CSS变量定义（白+粉配色方案）
  ```css
  :root {
    --color-primary: #ff6b9d;
    --color-bg-primary: #ffffff;
    --color-bg-secondary: #fafafa;
    /* ... 完整配色方案 */
  }
  ```

- [ ] 3.8 主题应用
  - **文件**: 各组件CSS/Tailwind类
  - **内容**: 将硬编码颜色替换为CSS变量

---

## Phase 2: 编辑器（4-6周）

### Wave 1: 基础设施（5个任务，并行）

- [ ] 4.1 安装依赖 + 测试框架配置
  - **依赖**: @univerjs/presets, @tiptap/react, mammoth, docx
  - **测试**: 配置vitest或bun test

- [ ] 4.2 类型定义 + 共享接口
  - **文件**: `src/types/editor.ts`
  - **内容**: EditorType, EditorTab, SelectionRange, DragDropPayload

- [ ] 4.3 EditorTabs 组件骨架 [UI]
  - **文件**: `src/components/editor/EditorTabs.tsx`
  - **功能**: 标签栏、标签、关闭按钮

- [ ] 4.4 Zustand Store 扩展 [TDD]
  - **文件**: `src/store/index.ts`
  - **内容**: editorTabs, selectionRanges, 相关actions

- [ ] 4.5 文件类型检测服务 [TDD]
  - **文件**: `src/utils/fileTypeDetector.ts`
  - **功能**: detectEditorType(path) → EditorType

---

### Wave 2: Excel 编辑器（4个任务，并行）

- [ ] 5.1 Univer 基础集成
  - **文件**: `src/components/editor/UniverProvider.tsx`, `src/hooks/useUniver.ts`
  - **内容**: Univer实例初始化，生命周期管理

- [ ] 5.2 xlsx 导入/导出
  - **文件**: `src/services/xlsxConverter.ts`
  - **功能**: importXlsx, exportXlsx

- [ ] 5.3 SpreadsheetEditor 组件 [UI]
  - **文件**: `src/components/editor/SpreadsheetEditor.tsx`
  - **功能**: 集成Univer，连接store

- [ ] 5.4 Excel 单元格选区 API
  - **文件**: `src/hooks/useSpreadsheetSelection.ts`
  - **功能**: 选区监听，内容提取

---

### Wave 3: Tiptap 编辑器（5个任务，并行）

- [ ] 6.1 Tiptap 基础集成
  - **文件**: `src/components/editor/TiptapProvider.tsx`, `src/hooks/useTiptapEditor.ts`

- [ ] 6.2 DocumentEditor 组件 [UI]
  - **文件**: `src/components/editor/DocumentEditor.tsx`
  - **功能**: Notion风格富文本

- [ ] 6.3 MarkdownEditor 组件 [UI]
  - **文件**: `src/components/editor/MarkdownEditor.tsx`
  - **功能**: 语法高亮，快捷键

- [ ] 6.4 标题折叠 Extension
  - **文件**: `src/extensions/folding.ts`
  - **功能**: ProseMirror Section node

- [ ] 6.5 章节拖拽 Extension
  - **文件**: `src/extensions/dragSection.ts`
  - **功能**: Tiptap DragHandle配置

---

### Wave 4: 集成层（4个任务，部分并行）

- [ ] 7.1 docx 转换服务
  - **文件**: `src/services/docxConverter.ts`
  - **依赖**: mammoth, docx库

- [ ] 7.2 SelectionDragDrop 服务
  - **文件**: `src/services/selectionDragDrop.ts`
  - **功能**: 统一选区接口，HTML5 Drag & Drop

- [ ] 7.3 拖拽到输入框集成 ← **复用 FileDropZone**
  - **文件**: `src/components/chat/input/FileDropZone.tsx`（扩展）
  - **功能**: 识别编辑器内容拖拽，Markdown格式转换
  - **复用**: Phase 1 创建的 FileDropZone 组件

- [ ] 7.4 EditorTabs 完整实现 [UI]
  - **文件**: `src/components/editor/EditorTabs.tsx`（完善）
  - **功能**: 拖拽排序，右键菜单

---

### Wave 5: 验证与收尾（4个任务，并行）

- [ ] 8.1 集成测试
- [ ] 8.2 E2E QA - Playwright
- [ ] 8.3 性能优化
- [ ] 8.4 文档与清理

---

## Phase 3: 输入框增强（与Phase 2部分并行）

> 这些任务已在 input-box-implementation.md 中详细定义
> 与编辑器Wave 4的Task 7.3协调

### 协调点

- **Task @提及功能**: 使用 `MentionPopup.tsx`（Phase 1 Wave 3创建）
- **Task 待办清单**: 使用 `TodoListPanel.tsx`（需新建）
- **Task 文件拖拽**: 复用 `FileDropZone.tsx`（Phase 1 Wave 3创建）
- **Task 智能体结果**: 使用 `AgentResultBlock.tsx`（需新建）

---

## Final Verification Wave（8个任务并行）

### AI后端验证
- [ ] F1. AI后端计划合规审计 (oracle)
- [ ] F2. AI后端代码质量审查 (unspecified-high)
- [ ] F3. AI后端手动QA (unspecified-high)
- [ ] F4. AI后端范围保真度检查 (deep)

### 编辑器验证
- [ ] F5. 编辑器计划合规审计 (oracle)
- [ ] F6. 编辑器代码质量审查 (unspecified-high)
- [ ] F7. 编辑器手动QA (unspecified-high)
- [ ] F8. 编辑器范围保真度检查 (deep)

---

## 关键依赖图

```
Phase 1 Wave 3 Task 3.1 (ChatInputPanel拆分 - FileDropZone)
    ↓
Phase 2 Wave 4 Task 7.3 (拖拽到输入框集成)
    ↑
Phase 2 Wave 4 Task 7.2 (SelectionDragDrop服务)

Phase 1 Wave 3.5 (主题系统)
    ↓
所有UI组件（使用白+粉主题）
```

---

## 测试策略

| 类型 | 策略 | 范围 |
|------|------|------|
| **核心逻辑** | TDD | 状态管理、工具函数、API封装 |
| **UI组件** | Tests After | React组件、样式、交互 |
| **集成** | Tests After | 跨组件交互、IPC通信 |
| **E2E** | Playwright | 完整用户流程 |

---

## 提交策略

按Wave分组提交：
- **Phase 1 Wave 1-2**: `feat(ai): add AI backend infrastructure and Copilot integration`
- **Phase 1 Wave 3**: `feat(ui): add ChatInputPanel components and AI UI integration`
- **Phase 1 Wave 3.5**: `feat(theme): implement white-pink theme system`
- **Phase 2 Wave 1**: `feat(editor): setup multi-format editor infrastructure`
- **Phase 2 Wave 2-3**: `feat(editor): add Univer and Tiptap editors`
- **Phase 2 Wave 4**: `feat(editor): integrate file conversion and drag-drop`

---

## 成功标准

### 验证命令
```bash
# 类型检查
npm run typecheck

# 单元测试
bun test

# 构建
npm run build

# E2E测试
npx playwright test
```

### 最终检查清单
- [ ] Copilot SDK集成完成
- [ ] 真实AI响应正常工作
- [ ] 流式响应正常显示
- [ ] 图片上传和Vision分析正常
- [ ] 可以打开.xlsx文件并编辑
- [ ] 可以创建Markdown文档并折叠标题
- [ ] 标签页可以拖拽排序
- [ ] 可以框选内容拖拽到Chat输入框
- [ ] 白+粉主题正确应用
- [ ] 所有测试通过
- [ ] 无TypeScript错误

---

## 附录：UI规格整合

### 白+粉配色方案

```css
:root {
  /* 主色调 - 粉色系 */
  --color-primary: #ff6b9d;
  --color-primary-hover: #ff5a8a;
  --color-primary-light: #ffb8d0;
  
  /* 背景色 - 白色系 */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #fafafa;
  --color-bg-hover: #fff0f3;
  
  /* 边框和分割 */
  --color-border: #ffe4ed;
  --color-border-active: #ff6b9d;
  
  /* 文字颜色 */
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #666666;
  
  /* 阴影效果 */
  --shadow-pink: 0 4px 12px rgba(255, 107, 157, 0.2);
}
```

### 窗口系统规格

- **浮动模式**: 默认宽度500px，高度自适应（最小100px）
- **停靠模式**: 竖条宽度40px，展开后宽度500px
- **合并模式**: 支持split-horizontal/vertical/tabbed布局

---

**文档完**

*最后更新：2026-02-22*
*版本：v1.0（合并版）*
*状态：已确认执行策略*
