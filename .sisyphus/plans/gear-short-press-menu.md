# 齿轮区短按下拉菜单实现计划

## TL;DR

> **快速摘要**: 在 ActivityBar 的齿轮按钮上添加短按下拉菜单，包含基础设置（主题、字体大小、编辑器行为等），保留长按托盘功能。

> **交付物**:
> - 短按齿轮图标展开下拉菜单
> - SettingsMenu 组件，包含基础设置项
> - 设置项存储到 localStorage 持久化
> - 保留原有长按托盘功能

> **预估工作量**: Short
> **并行执行**: NO - 顺序实现
> **关键路径**: 修改 ActivityBar → 创建 SettingsMenu → 添加设置项 → 持久化

---

## Context

### 原始需求
在齿轮区添加类似 OpenCode 的菜单页面，加载到齿轮区的短按按钮

### 讨论要点
- **菜单样式**: 下拉菜单（在齿轮按钮附近展开）
- **菜单内容**: 主题、字体大小、编辑器行为等基础设置
- **长按行为**: 保留原有的长按托盘功能（0.3s+ 打开托盘）

### 技术分析
- **齿轮按钮**: `opencode-ide/src/components/layout/index.tsx` (ActivityBar 组件)
- **当前行为**: 短按(<200ms)无动作，长按(300ms+)打开托盘
- **GearPanel**: 空白占位面板 (`opencode-ide/src/components/layout/GearPanel.tsx`)

---

## Work Objectives

### 核心目标
在齿轮按钮上实现短按下拉菜单，包含基础设置功能

### 具体交付物
1. 修改 `ActivityBar` 组件的齿轮按钮，短按(<200ms)展开下拉菜单
2. 创建 `SettingsMenu` 组件，实现下拉菜单 UI
3. 添加基础设置项：主题选择、字体大小、编辑器行为
4. 设置项持久化到 localStorage

### 定义完成
- [ ] 短按齿轮图标显示下拉菜单
- [ ] 下拉菜单包含至少 3 个设置项
- [ ] 设置项更改后持久化保存
- [ ] 长按仍能打开托盘面板

### Must Have
- 短按齿轮展开下拉菜单
- 基础设置 UI
- localStorage 持久化

### Must NOT Have
- 不修改现有的长按托盘行为
- 不修改其他 ActivityBar 元素

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (项目使用 React + TypeScript)
- **Automated tests**: NO (手动 QA 即可)
- **QA Policy**: Agent-executed QA scenarios

### QA Policy
Every task MUST include agent-executed QA scenarios.
- 前端/UI: 手动点击齿轮按钮验证下拉菜单展开
- 设置项: 修改设置后刷新页面验证持久化

---

## Execution Strategy

### Wave 1: 基础功能实现

- **Task 1**: 修改 ActivityBar 齿轮按钮，短按触发下拉菜单
- **Task 2**: 创建 SettingsMenu 组件框架
- **Task 3**: 实现设置项 UI（主题、字体大小、编辑器行为）
- **Task 4**: 添加 localStorage 持久化
- **Task 5**: 整合测试

---

## TODOs

- [ ] 1. 修改 ActivityBar 齿轮按钮 - 短按触发下拉菜单

  **What to do**:
  - 在 `opencode-ide/src/components/layout/index.tsx` 的齿轮按钮上添加短按逻辑
  - 当按压时间 < 200ms 且未移动时，触发下拉菜单显示
  - 保持现有的长按托盘逻辑不变

  **Must NOT do**:
  - 不修改长按触发托盘的时间阈值 (300ms)
  - 不修改其他 ActivityBar 元素

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: 小范围 React 组件修改

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 2-5
  - **Blocked By**: None

  **References**:
  - `opencode-ide/src/components/layout/index.tsx:117-166` - 齿轮按钮当前实现
  - `opencode-ide/src/components/layout/index.tsx:174` - Settings icon 使用

  **Acceptance Criteria**:
  - [ ] 短按齿轮按钮触发 onShortPress 回调

  **QA Scenarios**:

  Scenario: 短按齿轮按钮
    Tool: 手动测试
    Preconditions: 页面加载完成，齿轮按钮可见
    Steps:
      1. 点击齿轮按钮，保持 <200ms
      2. 观察是否展开下拉菜单
    Expected Result: 下拉菜单在齿轮按钮附近展开
    Evidence: 截图或描述

  Scenario: 长按齿轮按钮（保留功能验证）
    Tool: 手动测试
    Preconditions: 页面加载完成，齿轮按钮可见
    Steps:
      1. 长按齿轮按钮超过 300ms
      2. 观察是否打开托盘面板
    Expected Result: 托盘面板正常打开
    Evidence: 截图或描述

  **Commit**: YES
  - Message: `feat(gear): add short-press dropdown menu trigger`
  - Files: `opencode-ide/src/components/layout/index.tsx`

- [ ] 2. 创建 SettingsMenu 组件框架

  **What to do**:
  - 在 `opencode-ide/src/components/layout/` 下创建 `SettingsMenu.tsx`
  - 实现下拉菜单容器样式（定位、阴影、圆角）
  - 接收 isOpen 和 onClose props
  - 基础结构：标题 + 设置项列表 + 关闭按钮

  **Must NOT do**:
  - 不实现具体设置项 UI
  - 不处理 localStorage

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: 纯 UI 组件创建

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 3-4
  - **Blocked By**: Task 1

  **References**:
  - `opencode-ide/src/components/layout/VerticalTrayPopup.tsx` - 下拉菜单样式参考
  - `opencode-ide/src/components/layout/GearPanel.tsx` - 当前空白面板

  **Acceptance Criteria**:
  - [ ] SettingsMenu.tsx 文件创建
  - [ ] 下拉菜单容器渲染

  **QA Scenarios**:

  Scenario: SettingsMenu 组件渲染
    Tool: 手动测试
    Preconditions: Task 1 完成，组件已创建
    Steps:
      1. 短按齿轮按钮
      2. 观察下拉菜单是否渲染
    Expected Result: 显示空白的设置菜单容器
    Evidence: 截图或描述

  **Commit**: YES
  - Message: `feat(settings): create SettingsMenu component`
  - Files: `opencode-ide/src/components/layout/SettingsMenu.tsx`

- [ ] 3. 实现设置项 UI（主题、字体大小、编辑器行为）

  **What to do**:
  - 在 SettingsMenu 中添加具体设置项：
    1. **主题选择**: 亮色/暗色/跟随系统 单选
    2. **字体大小**: 滑块 (12-24px)
    3. **编辑器行为**: 自动保存开关、Tab 大小选择
  - 使用 React hooks 管理状态
  - 添加简单的视觉样式

  **Must NOT do**:
  - 不实现后端存储
  - 不修改其他组件

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: UI 组件实现

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 5
  - **Blocked By**: Task 2

  **References**:
  - `opencode-ide/src/components/layout/SettingsMenu.tsx` - 本文件扩展

  **Acceptance Criteria**:
  - [ ] 主题选择 UI 显示并可交互
  - [ ] 字体大小滑块显示并可调整
  - [ ] 编辑器行为开关显示并可切换

  **QA Scenarios**:

  Scenario: 主题选择交互
    Tool: 手动测试
    Preconditions: Task 2 完成
    Steps:
      1. 打开设置菜单
      2. 点击主题选项
      3. 选择"暗色"
    Expected Result: 主题选项被选中，状态更新

  Scenario: 字体大小调整
    Tool: 手动测试
    Preconditions: Task 2 完成
    Steps:
      1. 打开设置菜单
      2. 拖动字体大小滑块
    Expected Result: 滑块可拖动，值变化

  **Commit**: YES
  - Message: `feat(settings): add theme, font size, editor behavior options`
  - Files: `opencode-ide/src/components/layout/SettingsMenu.tsx`

- [ ] 4. 添加 localStorage 持久化

  **What to do**:
  - 在 SettingsMenu 中添加 localStorage 读写逻辑
  - 页面加载时读取设置
  - 设置变更时保存设置
  - 使用 `localStorage.setItem('yoka-settings', JSON.stringify(settings))`

  **Must NOT do**:
  - 不修改其他组件的 localStorage 用法
  - 不添加敏感信息存储

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: 简单状态管理逻辑

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 5
  - **Blocked By**: Task 3

  **References**:
  - `opencode-ide/src/components/chat/ChatInputPanel.tsx` - localStorage 使用示例

  **Acceptance Criteria**:
  - [ ] 刷新页面后设置保留

  **QA Scenarios**:

  Scenario: 设置持久化验证
    Tool: 手动测试
    Preconditions: Task 3 完成
    Steps:
      1. 打开设置菜单
      2. 选择"暗色"主题
      3. 调整字体大小到 16px
      4. 刷新页面
      5. 再次打开设置菜单
    Expected Result: 主题和字体大小保持为之前的选择

  **Commit**: YES
  - Message: `feat(settings): add localStorage persistence`
  - Files: `opencode-ide/src/components/layout/SettingsMenu.tsx`

- [ ] 5. 整合测试

  **What to do**:
  - 整合 ActivityBar 和 SettingsMenu
  - 确保短按触发下拉菜单显示
  - 验证所有设置项正常工作
  - 运行 `npm run build` 验证无编译错误

  **Must NOT do**:
  - 不修改其他功能

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: 整合测试

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: None
  - **Blocked By**: Task 1-4

  **References**:
  - 所有之前任务的参考

  **Acceptance Criteria**:
  - [ ] npm run build 通过
  - [ ] 短按齿轮显示下拉菜单
  - [ ] 所有设置项可交互
  - [ ] 设置持久化正常

  **QA Scenarios**:

  Scenario: 完整流程测试
    Tool: 手动测试
    Preconditions: 所有任务完成
    Steps:
      1. 页面加载完成
      2. 短按齿轮 - 验证菜单展开
      3. 选择"暗色主题"
      4. 调整字体大小到 18px
      5. 关闭菜单
      6. 刷新页面
      7. 短按齿轮 - 验证设置保留
      8. 长按齿轮 - 验证托盘仍能打开
    Expected Result: 所有步骤正常工作
    Evidence: 截图或描述

  **Commit**: YES
  - Message: `feat(gear): integrate short-press settings menu`
  - Files: `opencode-ide/src/components/layout/index.tsx`, `SettingsMenu.tsx`

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — 验证所有 Must Have 存在
- [ ] F2. **Build Verification** — npm run build 通过
- [ ] F3. **Manual QA** — 短按/长按功能测试
- [ ] F4. **Scope Fidelity Check** — 确保无范围蔓延

---

## Commit Strategy

- **1**: `feat(gear): add short-press dropdown menu trigger` — index.tsx
- **2**: `feat(settings): create SettingsMenu component` — SettingsMenu.tsx
- **3**: `feat(settings): add theme, font size, editor behavior options` — SettingsMenu.tsx
- **4**: `feat(settings): add localStorage persistence` — SettingsMenu.tsx
- **5**: `feat(gear): integrate short-press settings menu` — index.tsx, SettingsMenu.tsx

---

## Success Criteria

### Verification Commands
```bash
cd opencode-ide && npm run build  # Expected: build success
```

### Final Checklist
- [ ] 短按齿轮按钮展开下拉菜单
- [ ] 下拉菜单包含主题、字体大小、编辑器行为设置
- [ ] 设置项持久化到 localStorage
- [ ] 长按齿轮仍能打开托盘面板
- [ ] npm run build 通过
