# 多格式编辑器集成工作计划

> **这是一个多功能编辑器项目** - 旨在为 OpenCode IDE 构建一个统一的多格式文档编辑系统。

## TL;DR

> **核心目标**: 在 OpenCode IDE 中集成 Word/Excel/Markdown 三种编辑器，支持浏览器式标签页、拖拽选区到输入框的 AI 标注、以及 docx/xlsx 文件兼容。
> 
> **交付物**:
> - SpreadsheetEditor (Univer) - Excel 编辑器
> - DocumentEditor (Tiptap) - Notion 风格富文本
> - MarkdownEditor (Tiptap) - 支持折叠和拖拽
> - EditorTabs - 浏览器式标签页系统
> - SelectionDragDrop - 跨窗口拖拽服务
> - FileConverter - docx/xlsx 转换服务
> 
> **预估工作量**: Large (预计 4-6 周全职开发)
> **并行执行**: YES - 5 个 Wave
> **关键路径**: 基础设施 → Univer 集成 → Tiptap 集成 → 标签页系统 → 拖拽服务 → 测试

---

## Context

### 原始需求
用户希望在 IDE 编辑器窗口中集成 Word、Excel 和 Markdown 编辑功能，支持：
- 标题折叠和拖拽排序整个章节 (Markdown)
- 框选单元格或文本后拖动到输入框让 AI 识别
- 浏览器式标签页切换
- .docx 和 .xlsx 文件兼容

### 访谈摘要
**关键决策**:
- Word 编辑器: 类似 Notion 的富文本 (Tiptap 实现)，接受 docx 格式损失
- Excel 编辑器: Univer，原生支持 xlsx
- Markdown: Tiptap + Drag Handle + Folding extension
- 标签页: 浏览器式，可拖拽排序
- AI 标注: 拖拽选区到任意输入框，支持 Markdown 格式 + @引用
- 测试策略: TDD

**研究发现**:
- Univer: 原生支持 `FRange.attachPopup()` 浮层，xlsx 导入导出 API 完整
- Tiptap: Drag Handle extension 现成可用，Folding 需自定义 extension
- mammoth.js + docx 库: 可实现 docx 导入导出，但格式会部分丢失
- Floating UI: 适合跨编辑器的拖拽浮层定位

### 技术栈背景
- Next.js 16 + React 19 + Electron 34
- Tailwind CSS 4 + Zustand + TypeScript
- 已有: dock 布局系统、浮动窗口、文件类型 (`document | spreadsheet`)
- 现有编辑器: `src/components/editor/index.tsx` (占位符)

---

## Work Objectives

### 核心目标
构建一个统一的多格式编辑器系统，支持代码、文档、表格、Markdown 四种文件类型的编辑，并通过标签页系统无缝切换。

### 具体交付物
1. **SpreadsheetEditor** - 基于 Univer 的 Excel 编辑器组件
2. **DocumentEditor** - 基于 Tiptap 的 Notion 风格文档编辑器
3. **MarkdownEditor** - 基于 Tiptap 的 Markdown 编辑器，支持折叠和拖拽
4. **EditorTabs** - 浏览器式标签页组件，可拖拽排序
5. **SelectionDragDrop** - 跨编辑器/窗口的选区拖拽服务
6. **FileConverter** - docx/xlsx 文件格式转换服务

### 完成定义 (Definition of Done)
- [ ] 可以打开并编辑 .xlsx 文件，保存后格式正确
- [ ] 可以打开并编辑 .md 文件，支持标题折叠和拖拽排序
- [ ] 可以创建 Notion 风格文档，导出为 .docx (接受格式损失)
- [ ] 标签页可以拖拽排序、关闭、新建
- [ ] 可以框选任意编辑器内容拖拽到 Chat 输入框
- [ ] 所有核心功能有对应的 TDD 测试

### Must Have (必须有)
- Univer 表格编辑器基本功能 (单元格编辑、公式、格式)
- Tiptap 文档编辑器基本功能 (标题、列表、加粗、斜体)
- Markdown 标题折叠和拖拽排序
- 浏览器式标签页 (拖拽排序、关闭)
- 跨编辑器拖拽选区到输入框

### Must NOT Have (边界约束)
- ❌ 不要实现完整的 Word 格式兼容 (只做基础转换)
- ❌ 不要在第一版实现协作编辑
- ❌ 不要自己造轮子 (优先使用成熟的开源库)
- ❌ 不要过度抽象 (保持代码简洁)
- ❌ AI slop: 避免过度注释、通用命名、过早抽象

---

## Verification Strategy

### 测试决策
- **基础设施存在**: 需要检查现有测试框架
- **自动化测试**: TDD (红-绿-重构)
- **框架**: 待确认 (vitest / jest / bun test)
- **TDD 流程**: 每个任务遵循 RED (失败测试) → GREEN (最小实现) → REFACTOR

### QA 策略
每个任务必须包含 Agent 执行的 QA 场景验证：
- **Frontend/UI**: Playwright 打开浏览器、导航、交互、截图
- **编辑器功能**: Playwright 模拟键盘输入、选区、拖拽
- **文件转换**: Bash 执行转换脚本，验证输出文件

---

## Execution Strategy

### 并行执行 Wave

```
Wave 1 (基础设施 — 可立即开始):
├── Task 1: 安装依赖 + 测试框架配置 [quick]
├── Task 2: 类型定义 + 共享接口 [quick]
├── Task 3: EditorTabs 组件骨架 [visual-engineering]
├── Task 4: Zustand store 扩展 [quick]
└── Task 5: 文件类型检测服务 [quick]

Wave 2 (Excel 编辑器 — Wave 1 完成后):
├── Task 6: Univer 基础集成 [unspecified-high]
├── Task 7: Univer xlsx 导入/导出 [unspecified-high]
├── Task 8: SpreadsheetEditor 组件 [unspecified-high]
└── Task 9: Excel 单元格选区 API [unspecified-high]

Wave 3 (Tiptap 编辑器 — Wave 1 完成后，可与 Wave 2 并行):
├── Task 10: Tiptap 基础集成 [unspecified-high]
├── Task 11: DocumentEditor 组件 [unspecified-high]
├── Task 12: MarkdownEditor 组件 [unspecified-high]
├── Task 13: 标题折叠 Extension [deep]
└── Task 14: 章节拖拽 Extension [deep]

Wave 4 (集成层 — Wave 2 & 3 完成后):
├── Task 15: docx 转换服务 (mammoth + docx) [unspecified-high]
├── Task 16: SelectionDragDrop 服务 [deep]
├── Task 17: 拖拽到输入框集成 [unspecified-high]
└── Task 18: EditorTabs 完整实现 [visual-engineering]

Wave 5 (验证与收尾 — Wave 4 完成后):
├── Task 19: 集成测试 [deep]
├── Task 20: E2E QA - Playwright [unspecified-high]
├── Task 21: 性能优化 [unspecified-high]
└── Task 22: 文档与清理 [quick]

Wave FINAL (最终验证 — 4 个并行审查):
├── Task F1: 计划合规审计 (oracle)
├── Task F2: 代码质量审查 (unspecified-high)
├── Task F3: 手动 QA (unspecified-high)
└── Task F4: 范围保真度检查 (deep)

关键路径: Task 1 → Task 6 → Task 8 → Task 16 → Task 17 → Task 19 → F1-F4
并行加速: ~60% 快于顺序执行
最大并发: 5 (Wave 1 & 3)
```

### 依赖矩阵

| Task | 依赖 | 被依赖 |
|------|------|--------|
| 1-5 | - | 6-18 |
| 6-9 | 1, 2, 4 | 16, 19 |
| 10-14 | 1, 2, 4 | 15, 16, 19 |
| 15 | 10 | 19 |
| 16-17 | 2, 6, 10 | 19 |
| 18 | 3, 6, 10 | 19 |
| 19-22 | 6-18 | F1-F4 |

### Agent 调度摘要

- **Wave 1**: 5 tasks → `quick` x4, `visual-engineering` x1
- **Wave 2**: 4 tasks → `unspecified-high` x4
- **Wave 3**: 5 tasks → `unspecified-high` x3, `deep` x2
- **Wave 4**: 4 tasks → `unspecified-high` x3, `deep` x1, `visual-engineering` x1
- **Wave 5**: 4 tasks → `deep` x1, `unspecified-high` x2, `quick` x1
- **Final**: 4 tasks → `oracle` x1, `unspecified-high` x2, `deep` x1

---

## TODOs

> 实现 + 测试 = 一个任务。永不分离。
> 每个任务必须有: 推荐的 Agent Profile + 并行信息 + QA 场景。

---

### Wave 1: 基础设施 (5 个任务，全部可并行)

- [ ] 1. 安装依赖 + 测试框架配置

  **What to do**:
  - 安装 Univer 相关包: `@univerjs/presets`, `@univerjs/sheets-core`, `@univerjs/sheets-formula`
  - 安装 Tiptap 相关包: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-drag-handle`
  - 安装文件转换: `mammoth`, `docx`
  - 配置测试框架 (vitest 或 bun test)
  - 创建 `vitest.config.ts` 或确认 bun test 可用

  **Must NOT do**:
  - 不要安装不需要的 Tiptap Pro 扩展
  - 不要配置过于复杂的测试设置

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 纯配置任务，依赖安装和文件创建
  - **Skills**: 无特殊技能需求

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-5)
  - **Blocks**: Task 6, 10 (需要依赖)
  - **Blocked By**: None

  **References**:
  - `package.json:15-37` - 现有依赖结构
  - https://docs.univer.ai/guides/sheets/integrations/react - Univer React 集成
  - https://tiptap.dev/docs/editor/getting-started/configure - Tiptap 配置

  **Acceptance Criteria**:
  - [ ] `npm install` 成功无错误
  - [ ] 测试框架可运行 (`bun test` 或 `vitest run`)
  - [ ] 示例测试文件通过

  **QA Scenarios**:
  ```
  Scenario: 依赖安装验证
    Tool: Bash
    Steps:
      1. cd opencode-ide && npm install
      2. npm list @univerjs/presets @tiptap/react mammoth docx
    Expected Result: 所有包列出版本号，无 missing 错误
    Evidence: .sisyphus/evidence/task-01-deps.txt
  
  Scenario: 测试框架验证
    Tool: Bash
    Steps:
      1. cd opencode-ide
      2. echo 'test("example", () => expect(1).toBe(1))' > test-example.test.ts
      3. bun test test-example.test.ts (或 vitest run)
      4. rm test-example.test.ts
    Expected Result: 测试通过，输出 "1 passed"
    Evidence: .sisyphus/evidence/task-01-test-framework.txt
  ```

  **Commit**: YES
  - Message: `feat(editor): install Univer, Tiptap and file conversion deps`
  - Files: `package.json`, `package-lock.json`, `vitest.config.ts` (if created)

---

- [ ] 2. 类型定义 + 共享接口

  **What to do**:
  - 扩展 `src/types/index.ts`:
    - `EditorType = 'code' | 'document' | 'spreadsheet' | 'markdown'`
    - `EditorTab` 接口 (id, type, title, path, isDirty, icon)
    - `SelectionRange` 接口 (editorType, start, end, content, format)
    - `DragDropPayload` 接口 (type, data, source, position?)
  - 创建 `src/types/editor.ts` 存放编辑器专用类型

  **Must NOT do**:
  - 不要过度设计类型层次
  - 不要创建不需要的泛型

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 纯类型定义，无复杂逻辑

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 4, 6, 10, 16
  - **Blocked By**: None

  **References**:
  - `src/types/index.ts:73-86` - 现有 FileItem 和 OpenFile 类型
  - `src/types/index.ts:30-43` - WindowInstance 接口结构

  **Acceptance Criteria**:
  - [ ] `tsc --noEmit` 通过
  - [ ] 类型可被其他模块导入使用
  - [ ] 测试覆盖类型守卫函数 (如有)

  **QA Scenarios**:
  ```
  Scenario: 类型检查通过
    Tool: Bash
    Steps:
      1. cd opencode-ide && npx tsc --noEmit
    Expected Result: 无类型错误
    Evidence: .sisyphus/evidence/task-02-typescript.txt
  ```

  **Commit**: YES
  - Message: `feat(editor): add editor types and interfaces`
  - Files: `src/types/index.ts`, `src/types/editor.ts`

---

- [ ] 3. EditorTabs 组件骨架

  **What to do**:
  - 创建 `src/components/editor/EditorTabs.tsx`
  - 实现基本标签页 UI:
    - 标签栏 (可滚动)
    - 单个标签 (图标 + 标题 + 关闭按钮)
    - 新建标签按钮
  - 使用 Tailwind CSS 样式
  - 支持点击切换 active tab

  **Must NOT do**:
  - 暂不实现拖拽排序 (Task 18)
  - 不要使用复杂的状态管理

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI 组件开发，需要前端样式设计
  - **Skills**: `frontend-ui-ux`
    - 需要 UI 组件设计经验

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 18
  - **Blocked By**: Task 2 (需要 EditorTab 类型)

  **References**:
  - `src/components/editor/index.tsx:6-55` - 现有编辑器组件结构
  - Chrome/Firefox 标签页设计参考

  **Acceptance Criteria**:
  - [ ] 组件渲染正确
  - [ ] 点击标签切换 active 状态
  - [ ] 点击关闭按钮触发回调
  - [ ] Tailwind 样式正确应用

  **QA Scenarios**:
  ```
  Scenario: 标签页渲染与交互
    Tool: Playwright
    Preconditions: 应用运行在 localhost:3000
    Steps:
      1. 打开浏览器导航到 http://localhost:3000
      2. 截图保存初始状态
      3. 点击侧边栏打开多个文件 (至少 3 个)
      4. 验证标签栏显示 3 个标签
      5. 点击第二个标签，验证 active 状态变化
      6. 点击第一个标签的关闭按钮
      7. 验证只剩 2 个标签
    Expected Result: 标签切换和关闭功能正常
    Evidence: .sisyphus/evidence/task-03-tabs-interaction.png
  ```

  **Commit**: YES
  - Message: `feat(editor): add EditorTabs component skeleton`
  - Files: `src/components/editor/EditorTabs.tsx`

---

- [ ] 4. Zustand Store 扩展

  **What to do**:
  - 扩展 `src/store/index.ts`:
    - `editorTabs: EditorTab[]` - 标签页列表
    - `activeTabId: string | null` - 当前活动标签
    - `openEditorTab(file: EditorTab)` - 打开新标签
    - `closeEditorTab(id: string)` - 关闭标签
    - `setActiveTab(id: string)` - 设置活动标签
    - `reorderTabs(from: number, to: number)` - 重排序
    - `selectionRanges: SelectionRange[]` - 选区列表
    - `setSelection(editorType, range)` - 设置选区

  **Must NOT do**:
  - 不要在 store 中存储编辑器实例
  - 不要添加不必要的 computed values

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 状态管理扩展，结构清晰

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 6, 10, 16
  - **Blocked By**: Task 2 (需要类型)

  **References**:
  - `src/store/index.ts` - 现有 store 结构
  - Zustand 文档: https://zustand.docs.pmnd.rs/

  **Acceptance Criteria**:
  - [ ] Store 可被组件正确使用
  - [ ] 所有 action 有单元测试
  - [ ] TypeScript 类型完整

  **QA Scenarios**:
  ```
  Scenario: Store 操作测试
    Tool: Bash
    Steps:
      1. cd opencode-ide
      2. bun test src/store/editor.test.ts
    Expected Result: 所有测试通过
    Evidence: .sisyphus/evidence/task-04-store-tests.txt
  ```

  **Commit**: YES
  - Message: `feat(editor): extend Zustand store for editor tabs and selection`
  - Files: `src/store/index.ts`, `src/store/editor.test.ts`

---

- [ ] 5. 文件类型检测服务

  **What to do**:
  - 创建 `src/utils/fileTypeDetector.ts`
  - 实现文件类型检测函数:
    - `detectEditorType(path: string): EditorType`
    - 根据扩展名: .xlsx/.xls → 'spreadsheet', .md/.markdown → 'markdown', .docx → 'document', 其他 → 'code'
  - 创建单元测试覆盖各种扩展名

  **Must NOT do**:
  - 不要检测文件内容 (只看扩展名)
  - 不要硬编码过多扩展名

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 简单工具函数

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 6, 8, 10, 12 (需要判断文件类型)
  - **Blocked By**: Task 2 (需要 EditorType 类型)

  **References**:
  - `src/types/index.ts:78` - 现有 fileType 字段

  **Acceptance Criteria**:
  - [ ] 函数正确检测所有支持的文件类型
  - [ ] 100% 测试覆盖
  - [ ] 边界情况处理 (无扩展名、未知扩展名)

  **QA Scenarios**:
  ```
  Scenario: 文件类型检测测试
    Tool: Bash
    Steps:
      1. cd opencode-ide
      2. bun test src/utils/fileTypeDetector.test.ts
    Expected Result: 所有测试用例通过 (至少 10 个场景)
    Evidence: .sisyphus/evidence/task-05-detector-tests.txt
  ```

  **Commit**: YES
  - Message: `feat(editor): add file type detector utility`
  - Files: `src/utils/fileTypeDetector.ts`, `src/utils/fileTypeDetector.test.ts`

---

### Wave 2: Excel 编辑器 (4 个任务，Wave 1 完成后可并行)

- [ ] 6. Univer 基础集成

  **What to do**:
  - 创建 `src/components/editor/UniverProvider.tsx`
  - 初始化 Univer 实例:
    - 配置 locale (中文/英文)
    - 配置主题 (匹配 IDE 风格)
    - 注册核心插件 (SheetUI, Formula)
  - 创建 `useUniver` hook 管理生命周期
  - 测试 Univer 实例创建和销毁

  **Must NOT do**:
  - 不要注册不需要的插件
  - 不要在组件外部保持全局 Univer 实例

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 第三方库集成，需要理解 Univer API
  - **Skills**: 无特殊技能需求

  **Parallelization**:
  - **Can Run In Parallel**: YES (与 Task 7-9)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 8, 16
  - **Blocked By**: Task 1 (依赖), Task 2 (类型), Task 4 (store)

  **References**:
  - https://docs.univer.ai/guides/sheets/integrations/react - React 集成官方文档
  - https://docs.univer.ai/guides/sheets/features/core/range-selection - Range API

  **Acceptance Criteria**:
  - [ ] Univer 实例正确创建
  - [ ] 组件卸载时正确销毁
  - [ ] 无内存泄漏
  - [ ] 测试覆盖初始化流程

  **QA Scenarios**:
  ```
  Scenario: Univer 初始化验证
    Tool: Playwright
    Preconditions: 应用运行
    Steps:
      1. 打开一个 .xlsx 文件
      2. 等待 Univer 编辑器加载
      3. 截图验证表格渲染
      4. 检查控制台无错误
    Expected Result: 表格正确渲染，无 JS 错误
    Evidence: .sisyphus/evidence/task-06-univer-init.png
  
  Scenario: 内存泄漏检查
    Tool: Playwright
    Steps:
      1. 打开 .xlsx 文件
      2. 关闭标签页
      3. 重复 5 次
      4. 检查内存使用趋势
    Expected Result: 内存无明显增长趋势
    Evidence: .sisyphus/evidence/task-06-memory.txt
  ```

  **Commit**: YES
  - Message: `feat(editor): integrate Univer spreadsheet base`
  - Files: `src/components/editor/UniverProvider.tsx`, `src/hooks/useUniver.ts`

---

- [ ] 7. Univer xlsx 导入/导出

  **What to do**:
  - 创建 `src/services/xlsxConverter.ts`
  - 实现导入函数:
    - `importXlsx(file: File): Promise<UniverWorkbook>`
    - 使用 Univer 内置的导入 API
  - 实现导出函数:
    - `exportXlsx(workbook: UniverWorkbook): Promise<Blob>`
    - 使用 Univer 内置的导出 API
  - 添加错误处理和进度提示

  **Must NOT do**:
  - 不要自己解析 xlsx 二进制格式
  - 不要忽略大文件警告

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 文件格式处理，需要理解 Univer IO API

  **Parallelization**:
  - **Can Run In Parallel**: YES (与 Task 6, 8-9)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 19 (集成测试)
  - **Blocked By**: Task 1 (依赖), Task 6 (需要 Univer 实例)

  **References**:
  - https://docs.univer.ai/guides/sheets/features/import-export - 导入导出文档
  - `src/store/index.ts` - 文件操作相关 store

  **Acceptance Criteria**:
  - [ ] 可以导入示例 .xlsx 文件
  - [ ] 导出后可在 Excel 中打开
  - [ ] 单元格格式保留 (字体、颜色、边框)
  - [ ] 公式保留

  **QA Scenarios**:
  ```
  Scenario: xlsx 导入测试
    Tool: Playwright
    Preconditions: 准备测试文件 test-data.xlsx
    Steps:
      1. 点击 "打开文件" 按钮
      2. 选择 test-data.xlsx
      3. 等待导入完成
      4. 验证单元格 A1 内容为 "测试数据"
      5. 验证公式单元格显示计算结果
    Expected Result: 数据和公式正确导入
    Evidence: .sisyphus/evidence/task-07-xlsx-import.png
  
  Scenario: xlsx 导出测试
    Tool: Playwright
    Steps:
      1. 在编辑器中输入测试数据
      2. 点击 "保存" 按钮
      3. 下载导出的 .xlsx 文件
      4. 用 Microsoft Excel 打开验证
    Expected Result: Excel 可正确打开，格式保留
    Evidence: .sisyphus/evidence/task-07-xlsx-export.xlsx
  ```

  **Commit**: YES
  - Message: `feat(editor): add xlsx import/export for Univer`
  - Files: `src/services/xlsxConverter.ts`, `src/services/xlsxConverter.test.ts`

---

- [ ] 8. SpreadsheetEditor 组件

  **What to do**:
  - 创建 `src/components/editor/SpreadsheetEditor.tsx`
  - 集成 UniverProvider
  - 连接 Zustand store:
    - 从 store 读取文件路径
    - 使用 xlsxConverter 加载文件
    - 监听保存事件
  - 添加工具栏 (可选):
    - 字体、颜色、边框按钮
    - 公式栏
  - 处理组件生命周期

  **Must NOT do**:
  - 不要过度定制 Univer UI (使用默认样式)
  - 不要阻塞主线程进行大文件加载

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 组件集成，需要协调多个模块

  **Parallelization**:
  - **Can Run In Parallel**: YES (与 Task 7, 9)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 16, 18, 19
  - **Blocked By**: Task 2 (类型), Task 4 (store), Task 5 (类型检测), Task 6 (Univer)

  **References**:
  - `src/components/editor/index.tsx` - 现有编辑器结构
  - https://docs.univer.ai/guides/sheets/ui/components - 自定义组件文档

  **Acceptance Criteria**:
  - [ ] 组件可打开并显示 xlsx 文件
  - [ ] 单元格可编辑
  - [ ] 保存功能正常
  - [ ] 响应式布局

  **QA Scenarios**:
  ```
  Scenario: 完整编辑流程
    Tool: Playwright
    Steps:
      1. 打开 test.xlsx 文件
      2. 点击单元格 A1，输入 "Hello"
      3. 按 Enter 确认
      4. 点击单元格 B1，输入 "=A1&\" World\""
      5. 验证 B1 显示 "Hello World"
      6. Ctrl+S 保存
      7. 关闭并重新打开
      8. 验证数据保留
    Expected Result: 编辑、公式、保存全部正常
    Evidence: .sisyphus/evidence/task-08-spreadsheet-edit.png
  ```

  **Commit**: YES
  - Message: `feat(editor): add SpreadsheetEditor component`
  - Files: `src/components/editor/SpreadsheetEditor.tsx`

---

- [ ] 9. Excel 单元格选区 API

  **What to do**:
  - 创建 `src/hooks/useSpreadsheetSelection.ts`
  - 监听 Univer 选区变化:
    - 使用 `FRange` API 获取选区
    - 转换为 `SelectionRange` 类型
  - 实现选区内容提取:
    - `getSelectionContent(range: FRange): string`
    - 支持 Markdown 格式输出 (表格格式)
  - 更新 store 中的 selectionRanges

  **Must NOT do**:
  - 不要在每次选区变化时触发重渲染
  - 不要存储过大的选区数据

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 需要深入理解 Univer Range API

  **Parallelization**:
  - **Can Run In Parallel**: YES (与 Task 7-8)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 16 (拖拽服务需要选区)
  - **Blocked By**: Task 2 (类型), Task 6 (Univer)

  **References**:
  - https://docs.univer.ai/guides/sheets/features/core/range-selection - Range API
  - `src/types/editor.ts:SelectionRange` - 选区类型定义

  **Acceptance Criteria**:
  - [ ] 选区变化时触发回调
  - [ ] 可获取选区文本内容
  - [ ] Markdown 格式输出正确 (表格对齐)
  - [ ] 性能良好 (不阻塞 UI)

  **QA Scenarios**:
  ```
  Scenario: 选区内容提取
    Tool: Playwright
    Steps:
      1. 打开 test.xlsx (含 A1:C3 数据)
      2. 选中 A1:B2 区域
      3. 触发拖拽 (模拟 mousedown + drag)
      4. 验证提取的内容为 Markdown 表格格式
    Expected Result: 内容格式为 "| A1 | B1 |\n| A2 | B2 |"
    Evidence: .sisyphus/evidence/task-09-selection.txt
  ```

  **Commit**: YES
  - Message: `feat(editor): add spreadsheet selection API`
  - Files: `src/hooks/useSpreadsheetSelection.ts`, `src/hooks/useSpreadsheetSelection.test.ts`

---

### Wave 3: Tiptap 编辑器 (5 个任务，Wave 1 完成后可与 Wave 2 并行)

- [ ] 10. Tiptap 基础集成

  **What to do**:
  - 创建 `src/components/editor/TiptapProvider.tsx`
  - 配置 Tiptap Editor (StarterKit, Placeholder)
  - 创建 `useTiptapEditor` hook
  - 定义基础编辑器样式 (Tailwind)

  **Recommended Agent Profile**: `unspecified-high`
  **Parallelization**: Wave 3, 与 Task 11-14 并行

  **Acceptance Criteria**:
  - [ ] 编辑器可正常输入文本
  - [ ] 基础格式化可用 (加粗、斜体、标题)

  **Commit**: `feat(editor): integrate Tiptap editor base`

---

- [ ] 11. DocumentEditor 组件

  **What to do**:
  - 创建 `src/components/editor/DocumentEditor.tsx`
  - 添加扩展: Heading, Lists, Blockquote, CodeBlock, Image, Link
  - 添加 BubbleMenu 浮动工具栏
  - 连接 store 处理文件保存

  **Recommended Agent Profile**: `unspecified-high`
  **Parallelization**: Wave 3, 与 Task 10, 12-14 并行

  **Acceptance Criteria**:
  - [ ] 所有基础 block 类型可用
  - [ ] BubbleMenu 选中文本时出现

  **Commit**: `feat(editor): add DocumentEditor with Notion-style features`

---

- [ ] 12. MarkdownEditor 组件

  **What to do**:
  - 创建 `src/components/editor/MarkdownEditor.tsx`
  - 添加 Markdown 快捷输入和代码高亮
  - 实现 Markdown 导出功能
  - 处理 .md 文件的加载和保存

  **Recommended Agent Profile**: `unspecified-high`
  **Parallelization**: Wave 3, 与 Task 10-11, 13-14 并行

  **Acceptance Criteria**:
  - [ ] Markdown 快捷键正常工作
  - [ ] 代码块有语法高亮

  **Commit**: `feat(editor): add MarkdownEditor with syntax highlighting`

---

- [ ] 13. 标题折叠 Extension

  **What to do**:
  - 创建 `src/extensions/folding.ts`
  - 参考 ProseMirror folding 示例实现 Section node
  - 创建 NodeView 渲染折叠 UI
  - 实现 Plugin 管理折叠状态

  **Recommended Agent Profile**: `deep` (需要 ProseMirror 深度理解)
  **Parallelization**: Wave 3, 与 Task 10-12, 14 并行

  **Acceptance Criteria**:
  - [ ] 点击折叠按钮隐藏章节内容
  - [ ] 键盘快捷键可用

  **Commit**: `feat(editor): add heading folding extension`

---

- [ ] 14. 章节拖拽 Extension

  **What to do**:
  - 配置 Tiptap DragHandle 扩展 (nested: true)
  - 实现章节级别拖拽
  - 集成 Dropcursor 显示放置位置

  **Recommended Agent Profile**: `deep`
  **Parallelization**: Wave 3, 与 Task 10-13 并行

  **Acceptance Criteria**:
  - [ ] 可拖拽整个章节到新位置
  - [ ] 拖拽时显示放置指示器

  **Commit**: `feat(editor): add section drag-drop extension`

---

### Wave 4: 集成层 (4 个任务，Wave 2 & 3 完成后)

- [ ] 15. docx 转换服务

  **What to do**:
  - 创建 `src/services/docxConverter.ts`
  - 使用 mammoth.js 实现 docx → HTML 导入
  - 使用 docx 库实现 HTML → docx 导出
  - 处理格式转换警告和错误

  **Recommended Agent Profile**: `unspecified-high`
  **Parallelization**: Wave 4, 与 Task 16-18 并行

  **Acceptance Criteria**:
  - [ ] 可导入 .docx 文件 (接受格式损失)
  - [ ] 可导出为 .docx 文件

  **Commit**: `feat(editor): add docx conversion service`

---

- [ ] 16. SelectionDragDrop 服务

  **What to do**:
  - 创建 `src/services/selectionDragDrop.ts`
  - 统一各编辑器的选区获取接口
  - 实现 HTML5 Drag and Drop 协议
  - 支持 Markdown 格式 + @引用 + 原位置信息

  **Recommended Agent Profile**: `deep`
  **Parallelization**: Wave 4, 与 Task 15, 17-18 并行

  **Acceptance Criteria**:
  - [ ] 可从 Excel 拖拽单元格到输入框
  - [ ] 可从 MarkdownEditor 拖拽整个章节

  **Commit**: `feat(editor): add cross-editor selection drag-drop service`

---

- [ ] 17. 拖拽到输入框集成

  **What to do**:
  - 修改 ChatInputPanel 支持接收拖拽
  - 修改搜索框、命令面板支持接收拖拽
  - 实现拖拽时的视觉反馈

  **Recommended Agent Profile**: `unspecified-high`
  **Parallelization**: Wave 4, 与 Task 15-16, 18 并行

  **Acceptance Criteria**:
  - [ ] 拖拽到 Chat 输入框时内容正确插入
  - [ ] 拖拽时有视觉指示

  **Commit**: `feat(editor): integrate drag-drop to input fields`

---

- [ ] 18. EditorTabs 完整实现

  **What to do**:
  - 完善 EditorTabs 组件
  - 实现标签页拖拽排序 (使用 dnd-kit 或 react-dnd)
  - 集成所有编辑器类型
  - 处理标签页右键菜单

  **Recommended Agent Profile**: `visual-engineering`
  **Parallelization**: Wave 4, 与 Task 15-17 并行

  **Acceptance Criteria**:
  - [ ] 标签页可拖拽排序
  - [ ] 不同文件类型显示对应编辑器

  **Commit**: `feat(editor): complete EditorTabs with drag-reorder`

---

### Wave 5: 验证与收尾 (4 个任务，Wave 4 完成后)

- [ ] 19. 集成测试

  **What to do**:
  - 创建 `src/__tests__/editor-integration.test.ts`
  - 测试完整编辑流程 (打开 → 编辑 → 保存 → 关闭)
  - 测试跨编辑器拖拽
  - 测试文件格式转换

  **Recommended Agent Profile**: `deep`
  **Parallelization**: Wave 5, 与 Task 20-22 并行

  **Commit**: `test(editor): add integration tests`

---

- [ ] 20. E2E QA - Playwright

  **What to do**:
  - 创建 `e2e/editor.spec.ts`
  - 实现所有 QA 场景的自动化测试
  - 截图证据收集

  **Recommended Agent Profile**: `unspecified-high` + `playwright` skill
  **Parallelization**: Wave 5, 与 Task 19, 21-22 并行

  **Commit**: `test(e2e): add editor E2E tests`

---

- [ ] 21. 性能优化

  **What to do**:
  - 分析编辑器加载时间
  - 实现代码分割 (lazy load 编辑器)
  - 优化大文件处理

  **Recommended Agent Profile**: `unspecified-high`
  **Parallelization**: Wave 5, 与 Task 19-20, 22 并行

  **Commit**: `perf(editor): optimize editor loading and performance`

---

- [ ] 22. 文档与清理

  **What to do**:
  - 更新 README.md
  - 清理无用代码
  - 添加 JSDoc 注释 (仅公共 API)

  **Recommended Agent Profile**: `quick`
  **Parallelization**: Wave 5, 与 Task 19-21 并行

  **Commit**: `docs(editor): update documentation and cleanup`

---

## Final Verification Wave

> 4 个审查 Agent 并行运行。全部必须 APPROVE。拒绝 → 修复 → 重新运行。

- [ ] F1. **计划合规审计** — `oracle`
  读取计划全文。验证每个 "Must Have" 有实现，每个 "Must NOT Have" 无违规代码。
  输出: `Must Have [N/N] | Must NOT Have [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **代码质量审查** — `unspecified-high`
  运行 `tsc --noEmit` + linter + 测试。检查 AI slop 模式。
  输出: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | VERDICT`

- [ ] F3. **手动 QA** — `unspecified-high` (+ `playwright` skill)
  执行每个任务的 QA 场景，捕获证据。
  输出: `Scenarios [N/N pass] | VERDICT`

- [ ] F4. **范围保真度检查** — `deep`
  验证实现与规格 1:1 对应，无范围蔓延。
  输出: `Tasks [N/N compliant] | VERDICT`

---

## Commit Strategy

按 Wave 分组提交:
- **Wave 1**: `feat(editor): setup multi-format editor infrastructure`
- **Wave 2**: `feat(editor): add Univer spreadsheet editor`
- **Wave 3**: `feat(editor): add Tiptap document and markdown editors`
- **Wave 4**: `feat(editor): integrate file conversion and drag-drop`
- **Wave 5**: `test(editor): add integration tests and optimize`

---

## Success Criteria

### 验证命令
```bash
# 运行所有测试
bun test

# 类型检查
tsc --noEmit

# 构建检查
npm run build

# E2E 测试
npx playwright test
```

### 最终检查清单
- [ ] 可以打开 .xlsx 文件并编辑单元格
- [ ] 可以保存 .xlsx 文件并在 Excel 中打开
- [ ] 可以创建 Markdown 文档并折叠标题
- [ ] 可以拖拽 Markdown 章节重新排序
- [ ] 可以创建 Notion 风格文档并导出 .docx
- [ ] 标签页可以拖拽排序
- [ ] 可以框选内容拖拽到 Chat 输入框
- [ ] 所有测试通过
- [ ] 无 TypeScript 错误
- [ ] 无 Lint 警告

---

## 第二版规划 (V2 Roadmap)

> 以下功能将在第一版稳定后作为第二版迭代开发。

### V2.1: 图片编辑器 (ImageEditor)

**目标**: 支持常见图片格式的查看和基础编辑

**功能范围**:
- 图片查看器 (支持 png, jpg, gif, webp, svg, bmp)
- 基础编辑功能:
  - 裁剪 (Crop)
  - 旋转/翻转 (Rotate/Flip)
  - 缩放 (Resize)
  - 标注 (Annotation: 箭头、矩形、文字、高亮)
  - 马赛克/模糊 (Redact/Blur)
- 框选区域拖拽到 AI 输入框 (OCR + 图像识别)

**推荐技术栈**:
| 功能 | 库 | 说明 |
|------|-----|------|
| 图片查看 | `react-image-gallery` 或自建 | 支持缩放、拖拽 |
| 图片编辑 | `fabric.js` 或 `konva` | Canvas 操作 |
| 裁剪 | `react-image-crop` | 裁剪框 UI |
| 标注 | `fabric.js` 自定义 | 箭头、矩形、文字 |
| OCR | Tesseract.js 或云端 API | 文字识别 |

**预估工作量**: Medium (2-3 周)

---

### V2.2: 内置浏览器 (WebView Panel)

**目标**: 在 IDE 内嵌入网页浏览功能，支持开发者文档查阅、API 测试等

**功能范围**:
- Electron WebView 集成
- 基础浏览器功能:
  - 地址栏 + 导航 (前进/后退/刷新)
  - 书签管理
  - 历史记录
  - 开发者工具切换
- 页面内容框选拖拽到 AI 输入框
- 与 Chat 联动: 选择页面内容提问

**推荐技术栈**:
| 功能 | 库/技术 | 说明 |
|------|---------|------|
| WebView | Electron `BrowserView` 或 `<webview>` | 原生支持 |
| 开发者工具 | Electron `openDevTools` | 复用 Chrome DevTools |
| 书签/历史 | IndexedDB + Zustand | 本地持久化 |

**预估工作量**: Medium (2-3 周)

---

### V2.3: PDF 阅读器 (PDFViewer)

**目标**: 支持 PDF 文件的查看和标注

**功能范围**:
- PDF 渲染 (支持大文件分页加载)
- 基础功能:
  - 页面缩放
  - 页面跳转
  - 全文搜索
  - 书签/目录导航
- 标注功能:
  - 高亮文本
  - 添加注释
  - 绘制图形
- 文本框选拖拽到 AI 输入框

**推荐技术栈**:
| 功能 | 库 | 说明 |
|------|-----|------|
| PDF 渲染 | `pdfjs-dist` | Mozilla PDF.js |
| React 封装 | `react-pdf` | React 组件 |
| 标注 | `pdf-lib` + 自定义 | PDF 修改 |

**预估工作量**: Medium (2-3 周)

---

### V2 优先级排序

| 优先级 | 功能 | 理由 |
|--------|------|------|
| P1 | 图片编辑器 | 开发者常见需求，技术成熟 |
| P2 | 内置浏览器 | 提升 AI 辅助效率 |
| P3 | PDF 阅读器 | 需求较少，可作为后续补充 |

---

### V2 架构预留

在第一版开发时，应预留以下扩展点：

```typescript
// src/types/editor.ts 扩展
export type EditorType = 
  | 'code' 
  | 'document' 
  | 'spreadsheet' 
  | 'markdown'
  | 'image'      // V2.1
  | 'browser'    // V2.2
  | 'pdf';       // V2.3

// 统一选区接口预留
export interface SelectionRange {
  editorType: EditorType;
  // 图片选区: { x, y, width, height }
  // 浏览器选区: DOM Range
  // PDF 选区: 页码 + 坐标
  start: Position;
  end: Position;
  content: string;
  format: 'text' | 'markdown' | 'html' | 'base64';
}
```

**第一版应避免**:
- 不要过度抽象 EditorType 相关代码
- 保持 SelectionRange 接口可扩展
- 文件类型检测服务应易于添加新类型
