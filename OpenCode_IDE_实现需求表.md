# OpenCode IDE 实现需求表

> 生成时间：2026-02-18  
> 项目目标：独立桌面端 OpenCode IDE，支持浮动窗口管理 + Git 面板  
> **技术路线：Electron + Next.js + React + TypeScript**

---

## 1. 项目概述

| 项目属性 | 说明 |
|---------|------|
| **项目名称** | OpenCode Desktop IDE |
| **类型** | 独立桌面应用程序 |
| **技术栈** | Electron + Next.js 16 + React 19 + TypeScript + Tailwind CSS |
| **架构** | 主进程 + 渲染进程 + 原生窗口管理 |
| **核心特性** | 模块化浮动窗口、停靠布局、Git 集成、个性化配置 |
| **目标平台** | Windows / macOS / Linux |

---

## 2. 整体布局结构

### 2.1 默认布局模式

```
┌─────────────────────────────────────────────────────┐
│ Activity Bar │ Sidebar │     Content Area          │
│  (48px)      │ (可变)   │      (自适应)              │
│              │         ├───────────────────────────┤
│  ┌──────┐    │ 文件树/ │ │ Chat Panel / Editor /   │
│  │ Chat │    │ 会话列表 │ │ Git Panel               │
│  │ Edit │    │         │ │                         │
│  │ Git  │    │         │ ├─────────────────────────┤
│  │ Repo │    │         │ │ Status Bar              │
│  │ ⚙️   │    │         │ │ (底部 22px)             │
└──────────────┴─────────┴───────────────────────────┘
```

### 2.2 浮动窗口模式

```
    ┌─────────────────┐        ┌─────────────────┐
    │  Chat Window    │        │  Git Window     │
    │  (浮动)         │        │  (停靠-右)      │
    │  透明度: 85%    │        │  显示变更历史    │
    └────────┬────────┘        └─────────────────┘
             │
    ┌────────▼────────┐        ┌─────────────────┐
    │  Input Window   │        │  Diff Window    │
    │  (置顶)         │        │  (浮动)         │
    │  长按置顶       │        │  代码对比视图    │
    └─────────────────┘        └─────────────────┘
```

---

## 3. Electron 架构设计

### 3.1 进程架构

```
┌─────────────────────────────────────────────────────┐
│                   主进程 (Main Process)              │
│  ┌──────────────────────────────────────────────┐  │
│  │ 窗口管理器 (WindowManager)                    │  │
│  │  ├─ 创建/销毁 BrowserWindow                  │  │
│  │  ├─ 窗口状态同步                              │  │
│  │  ├─ 跨窗口通信 (IPC)                          │  │
│  │  └─ 系统级功能集成                            │  │
│  ├──────────────────────────────────────────────┤  │
│  │ 文件系统服务 (FileSystemService)              │  │
│  ├──────────────────────────────────────────────┤  │
│  │ Git 服务 (GitService)                        │  │
│  │  ├─ Git 操作封装                              │  │
│  │  ├─ 仓库状态监听                              │  │
│  │  └─ 变更检测                                  │  │
│  ├──────────────────────────────────────────────┤  │
│  │ AI 服务 (AIService)                          │  │
│  │  └─ 调用本地/云端 AI API                      │  │
│  └──────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────┘
                           │ IPC 通信
                           ▼
┌─────────────────────────────────────────────────────┐
│                渲染进程 (Renderer Process)           │
│  ┌──────────────────────────────────────────────┐  │
│  │  Next.js + React 应用                         │  │
│  │  ├─ App 主组件                                │  │
│  │  ├─ Window Manager 组件                       │  │
│  │  ├─ Chat/Editor/Git 面板组件                   │  │
│  │  └─ 状态管理 (Zustand)                         │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 3.2 窗口管理策略

| 窗口类型 | 实现方式 | 特性 |
|---------|---------|------|
| **主窗口** | BrowserWindow | 应用主入口，可切换布局模式 |
| **浮动面板** | BrowserWindow + `parent` | 独立的子窗口，可自由拖动 |
| **工具窗口** | BrowserWindow + `modal` | 模态对话框（设置、确认等） |
| **停靠窗口** | BrowserWindow | 吸附到屏幕边缘，调整父窗口大小 |

### 3.3 Electron 原生功能利用

| 功能 | Electron API | 优势 |
|-----|-------------|------|
| **窗口拖动** | `BrowserWindow.setPosition()` | 原生级流畅度 |
| **窗口置顶** | `BrowserWindow.setAlwaysOnTop()` | 真正的系统级置顶 |
| **透明度** | `BrowserWindow.setOpacity()` | GPU 加速，无性能问题 |
| **尺寸调整** | 原生 resize | 无需 JS 计算 |
| **停靠检测** | `screen.getDisplayMatching()` | 多显示器支持 |
| **系统托盘** | `Tray` | 后台运行支持 |

---

## 4. 窗口管理系统

### 4.1 窗口类型定义

```typescript
// 窗口类型
enum WindowType {
  MAIN = 'main',           // 主窗口
  CHAT = 'chat',           // 聊天面板
  INPUT = 'input',         // 输入框
  EDITOR = 'editor',       // 代码编辑器
  GIT = 'git',             // Git 面板
  REPOSITORY = 'repository', // 仓库面板
  SIDEBAR = 'sidebar',     // 侧边栏
  ACTIVITY_BAR = 'activityBar', // 活动栏
  DIFF = 'diff',           // 代码对比视图
  SETTINGS = 'settings',   // 设置面板
}

// 窗口状态
enum WindowState {
  DOCKED = 'docked',       // 已停靠
  FLOATING = 'floating',   // 浮动中
  MINIMIZED = 'minimized', // 最小化
  MAXIMIZED = 'maximized', // 最大化
  HIDDEN = 'hidden',       // 隐藏（但保留状态）
}

// 停靠位置
enum DockPosition {
  LEFT = 'left',
  RIGHT = 'right',
  TOP = 'top',
  BOTTOM = 'bottom',
  CENTER = 'center',
}
```

### 4.2 窗口配置规格

| 属性 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| **id** | string | uuid | 窗口唯一标识 |
| **type** | WindowType | - | 窗口类型 |
| **state** | WindowState | floating | 窗口状态 |
| **bounds** | Rectangle | - | 窗口位置和尺寸 {x, y, width, height} |
| **opacity** | number | 1.0 | 透明度 (0.1 - 1.0) |
| **alwaysOnTop** | boolean | false | 是否置顶（系统级） |
| **dockTo** | DockPosition \| null | null | 停靠位置 |
| **parentId** | string \| null | null | 父窗口 ID |
| **minSize** | Size | 300x200 | 最小尺寸限制 |
| **maxSize** | Size | 屏幕尺寸 | 最大尺寸限制 |
| **title** | string | - | 窗口标题 |
| **isLocked** | boolean | false | 是否锁定（不可拖动） |
| **isResizable** | boolean | true | 是否可调整尺寸 |
| **showInTaskbar** | boolean | true | 是否在任务栏显示 |
| **skipTaskbar** | boolean | false | 是否跳过任务栏 |

---

## 5. Git 面板（Git Panel）详细规格

### 5.1 Git 面板功能概述

Git 面板是独立的功能区域，可像其他面板一样浮动或停靠，提供完整的 Git 工作流支持。

### 5.2 Git 面板界面布局

```
┌──────────────────────────────────────────┐
│ Git Panel Header          [刷新] [设置]  │
├──────────────────────────────────────────┤
│ 当前分支: main ▼        [+] 暂存所有     │
├──────────────────────────────────────────┤
│ ┌─ Changes (3) ──────────────────────┐  │
│ │ □ M  src/components/Button.tsx     │  │
│ │ □ D  src/old/File.tsx              │  │
│ │ □ ?  new-file.ts                   │  │
│ └────────────────────────────────────┘  │
├──────────────────────────────────────────┤
│ ┌─ Staged Changes (1) ───────────────┐  │
│ │ □ ✓  src/App.tsx                   │  │
│ └────────────────────────────────────┘  │
├──────────────────────────────────────────┤
│ 提交信息:                                │
│ ┌────────────────────────────────────┐  │
│ │ feat: 添加 Git 面板功能             │  │
│ └────────────────────────────────────┘  │
│                                          │
│ [取消]              [提交 Changes]      │
├──────────────────────────────────────────┤
│ Recent Commits:                          │
│ ● a1b2c3d  添加 Git 面板  (2分钟前)    │
│ ● e5f6g7h  初始化项目    (1小时前)     │
└──────────────────────────────────────────┘
```

### 5.3 Git 面板组件结构

```typescript
// Git 面板状态
interface GitPanelState {
  // 仓库信息
  repository: {
    path: string;
    name: string;
    currentBranch: string;
    branches: string[];
    isDirty: boolean;
  } | null;
  
  // 工作区状态
  workingTree: {
    modified: GitFile[];
    staged: GitFile[];
    untracked: GitFile[];
    deleted: GitFile[];
    renamed: GitFile[];
  };
  
  // 提交历史
  commits: GitCommit[];
  
  // 选中状态
  selectedFiles: string[];
  
  // 提交消息
  commitMessage: string;
  
  // 面板状态
  isLoading: boolean;
  error: string | null;
}

// Git 文件
interface GitFile {
  path: string;
  name: string;
  status: 'modified' | 'staged' | 'untracked' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  diff?: string;
}

// Git 提交
interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: Date;
  filesChanged: number;
  additions: number;
  deletions: number;
}
```

### 5.4 Git 功能清单

#### 5.4.1 基础操作

| 功能 | 操作方式 | 快捷键 |
|-----|---------|--------|
| **初始化仓库** | 按钮 | - |
| **克隆仓库** | 按钮 + 对话框 | - |
| **暂存文件** | 勾选框 / 拖拽 | Space |
| **取消暂存** | 勾选框 / 拖拽 | Space |
| **提交更改** | 按钮 | Ctrl+Enter |
| **提交并推送** | 下拉按钮 | Ctrl+Shift+Enter |
| **拉取更新** | 按钮 | Ctrl+Shift+P |
| **获取更新** | 按钮 | - |

#### 5.4.2 分支管理

| 功能 | 操作方式 |
|-----|---------|
| **切换分支** | 下拉菜单 |
| **创建分支** | 按钮 + 输入框 |
| **合并分支** | 右键菜单 |
| **删除分支** | 右键菜单 |
| **重命名分支** | 右键菜单 |
| **查看分支图** | 切换视图 |

#### 5.4.3 高级功能

| 功能 | 说明 |
|-----|------|
| **代码对比 (Diff)** | 双击文件打开 diff 视图 |
| **撤销更改** | 右键文件 → Discard Changes |
| **储藏变更** | Stash / Unstash |
| **查看历史** | 文件右键 → View History |
| ** blame 注释** | 编辑器内联显示 |
| **标签管理** | 创建/删除标签 |
| **远程管理** | 添加/删除远程仓库 |
| **子模块** | 基础支持 |

### 5.5 Git 面板交互细节

#### 文件列表交互

```
文件项:
┌────────────────────────────────────┐
│ □ ✓ M  filename.tsx    +10  -3   │  │
│   ↑ ↑ ↑                    ↑   ↑    │
│   │ │ │                    │   └─ 删除行数
│   │ │ └─ 文件名            └──── 添加行数
│   │ └─ 状态图标 (Modified)
│   └─ 选中状态
└────────────────────────────────────┘
```

- **单击**: 选中/取消选中
- **双击**: 打开 diff 视图
- **右键**: 上下文菜单（暂存、撤销、查看历史）
- **拖拽**: 暂存 ↔ 取消暂存

#### 提交信息输入框

- 支持多行文本
- 自动补全常用前缀（feat:, fix:, docs:, style:, refactor:, test:, chore:）
- 字符计数显示
- 空提交消息阻止提交

#### Diff 视图

```
┌──────────────────────────────────────────┐
│ Diff: src/App.tsx        [×] [分屏/行内] │
├──────────────────────────────────────────┤
│  @@ -15,7 +15,12 @@                      │
│     import React from 'react';           │
│  -  import Button from './Button';       │
│  +  import Button from './components/    │
│  +    Button';                           │
│  +  +import GitPanel from './components/ │
│  +  +  GitPanel';                        │
│                                           │
│     function App() {                     │
│       return (                           │
│  +        <div>                          │
│           <h1>Hello</h1>                 │
│  +          <GitPanel />                 │
│  +        </div>                         │
│       );                                 │
└──────────────────────────────────────────┘
```

- 语法高亮
- 行号显示
- 支持分屏/行内两种模式
- 可折叠未变更区域
- 支持 Stage/Unstage 行级操作（未来版本）

---

## 6. 交互逻辑规格

### 6.1 窗口拖动

| 交互 | 触发方式 | 行为 |
|-----|---------|------|
| **开始拖动** | 按住标题栏 + 移动鼠标 | 调用 `win.setPosition()` |
| **拖动中** | 鼠标移动 | 实时更新窗口位置 |
| **结束拖动** | 释放鼠标 | 检测停靠，应用吸附 |
| **停靠预览** | 靠近边缘 50px 内 | 半透明高亮目标区域 |

### 6.2 停靠系统

**停靠区域定义**：

```typescript
interface DockZones {
  left: { x: 0, y: 0, width: screen.width * 0.3, height: screen.height };
  right: { x: screen.width * 0.7, y: 0, width: screen.width * 0.3, height: screen.height };
  top: { x: 0, y: 0, width: screen.width, height: screen.height * 0.5 };
  bottom: { x: 0, y: screen.height * 0.5, width: screen.width, height: screen.height * 0.5 };
}
```

**停靠行为**：

| 位置 | 窗口尺寸 | 行为 |
|-----|---------|------|
| **Left** | 30% 屏幕宽，全高 | 吸附到左侧，可调整宽度 |
| **Right** | 30% 屏幕宽，全高 | 吸附到右侧，可调整宽度 |
| **Top** | 全宽，50% 屏幕高 | 吸附到顶部 |
| **Bottom** | 全宽，50% 屏幕高 | 吸附到底部 |

### 6.3 透明度调整

| 交互 | 触发方式 | 行为 |
|-----|---------|------|
| **打开调节器** | 右键标题栏 → Opacity | 显示滑块 |
| **快速调节** | Ctrl + 滚轮 | ±5% |
| **应用透明度** | 释放滑块 | `win.setOpacity(value)` |
| **保存设置** | 自动保存 | 写入配置文件 |

### 6.4 窗口置顶（长按左键）

| 交互 | 触发方式 | 行为 |
|-----|---------|------|
| **开始长按** | 按住标题栏 > 800ms | 显示进度环 |
| **触发置顶** | 达到 800ms | `win.setAlwaysOnTop(true)` |
| **视觉反馈** | 置顶后 | 标题栏显示 📌，边框高亮蓝色 |
| **取消置顶** | 再次长按 800ms | `win.setAlwaysOnTop(false)` |

**长按检测代码示例**：

```typescript
// useLongPress.ts
export function useLongPress(
  callback: () => void,
  duration: number = 800
) {
  const timerRef = useRef<NodeJS.Timeout>();
  const [isPressing, setIsPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const start = useCallback(() => {
    setIsPressing(true);
    const startTime = Date.now();
    
    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(elapsed / duration, 1);
      setProgress(newProgress);
      
      if (newProgress < 1) {
        requestAnimationFrame(updateProgress);
      }
    };
    
    timerRef.current = setTimeout(() => {
      callback();
      setIsPressing(false);
      setProgress(0);
    }, duration);
    
    requestAnimationFrame(updateProgress);
  }, [callback, duration]);
  
  const stop = useCallback(() => {
    clearTimeout(timerRef.current);
    setIsPressing(false);
    setProgress(0);
  }, []);
  
  return { start, stop, isPressing, progress };
}
```

### 6.5 快捷键

#### 全局快捷键

| 快捷键 | 功能 |
|-------|------|
| `Ctrl/Cmd + Shift + N` | 新建窗口 |
| `Ctrl/Cmd + Shift + W` | 关闭当前窗口 |
| `Ctrl/Cmd + Tab` | 在窗口间切换 |
| `Ctrl/Cmd + Shift + T` | 切换窗口置顶 |
| `Ctrl/Cmd + Shift + ↑` | 增加透明度 |
| `Ctrl/Cmd + Shift + ↓` | 降低透明度 |
| `Ctrl/Cmd + Shift + R` | 重置窗口位置 |
| `F11` | 当前窗口全屏 |

#### Git 面板快捷键

| 快捷键 | 功能 |
|-------|------|
| `Ctrl + Enter` | 提交更改 |
| `Ctrl + Shift + Enter` | 提交并推送 |
| `Ctrl + Shift + P` | 拉取更新 |
| `Space` | 暂存/取消暂存选中文件 |
| `Ctrl + Shift + G` | 聚焦 Git 面板 |

---

## 7. 状态管理

### 7.1 全局状态

```typescript
interface AppState {
  // 窗口管理
  windows: WindowInstance[];
  activeWindowId: string | null;
  layoutMode: 'fixed' | 'floating';
  dockedAreas: Record<DockPosition, string | null>;
  
  // Git 状态
  git: GitPanelState;
  
  // AI 状态
  chat: ChatState;
  config: ConfigState;
  
  // 编辑器状态
  editor: EditorState;
  
  // 全局设置
  settings: AppSettings;
}

interface AppSettings {
  window: {
    defaultOpacity: number;
    snapDistance: number;
    longPressDuration: number;
    showDockPreview: boolean;
    rememberLayout: boolean;
  };
  git: {
    autoFetchInterval: number; // 分钟
    showInlineBlame: boolean;
    defaultCommitTemplate: string;
  };
  editor: {
    fontSize: number;
    fontFamily: string;
    tabSize: number;
    wordWrap: boolean;
  };
}
```

### 7.2 IPC 通信协议

```typescript
// 主进程 → 渲染进程
interface MainToRendererEvents {
  'window:moved': { windowId: string; bounds: Rectangle };
  'window:resized': { windowId: string; bounds: Rectangle };
  'window:focused': { windowId: string };
  'window:closed': { windowId: string };
  'git:statusChanged': { repository: string; status: GitStatus };
  'git:commitReceived': { commit: GitCommit };
}

// 渲染进程 → 主进程
interface RendererToMainEvents {
  'window:create': { type: WindowType; options: WindowOptions };
  'window:close': { windowId: string };
  'window:move': { windowId: string; x: number; y: number };
  'window:resize': { windowId: string; width: number; height: number };
  'window:setOpacity': { windowId: string; opacity: number };
  'window:setAlwaysOnTop': { windowId: string; alwaysOnTop: boolean };
  'window:dock': { windowId: string; position: DockPosition };
  'window:undock': { windowId: string };
  
  'git:init': { path: string };
  'git:clone': { url: string; path: string };
  'git:status': { path: string };
  'git:add': { path: string; files: string[] };
  'git:unstage': { path: string; files: string[] };
  'git:commit': { path: string; message: string };
  'git:push': { path: string };
  'git:pull': { path: string };
  'git:fetch': { path: string };
  'git:checkout': { path: string; branch: string };
  'git:branch:create': { path: string; name: string; from?: string };
  'git:branch:delete': { path: string; name: string };
  'git:diff': { path: string; file: string };
  
  'app:getPath': { name: 'home' | 'appData' | 'userData' | 'temp' };
  'app:showOpenDialog': { options: OpenDialogOptions };
  'app:showSaveDialog': { options: SaveDialogOptions };
}
```

---

## 8. 依赖清单

### 8.1 Electron 依赖

```json
{
  "dependencies": {
    // === Electron 核心 ===
    "electron": "^34.0.0",
    "@electron/remote": "^2.1.0",
    
    // === 构建工具 ===
    "electron-builder": "^25.0.0",
    "electron-updater": "^6.3.0",
    
    // === Next.js + React ===
    "next": "^16.1.6",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    
    // === 状态管理 ===
    "zustand": "^5.0.11",
    
    // === Git 操作 ===
    "simple-git": "^3.31.1",
    
    // === 编辑器 ===
    "@monaco-editor/react": "^4.7.0",
    
    // === UI 组件 ===
    "lucide-react": "^0.574.0",
    "react-markdown": "^10.1.0",
    "react-syntax-highlighter": "^16.1.0",
    "remark-gfm": "^4.0.1",
    
    // === AI SDK ===
    "@anthropic-ai/sdk": "^0.74.0",
    "openai": "^6.22.0",
    
    // === 工具库 ===
    "uuid": "^9.0.0",
    "date-fns": "^4.1.0",
    "lodash": "^4.17.21"
  },
  "devDependencies": {
    "@types/node": "^22.13.13",
    "@types/react": "^19.0.12",
    "@types/react-dom": "^19.0.4",
    "@types/uuid": "^9.0.0",
    "typescript": "^5.8.2",
    "tailwindcss": "^4.0.14",
    "@tailwindcss/postcss": "^4.0.14",
    "eslint": "^9",
    "eslint-config-next": "^16.1.6"
  }
}
```

---

## 9. 文件结构

```
opencode-ide/
├── electron/                           # Electron 主进程
│   ├── main.js                         # 主进程入口
│   ├── preload.js                      # 预加载脚本（安全桥接）
│   ├── window-manager.js               # 窗口管理器
│   ├── services/
│   │   ├── git-service.js              # Git 操作服务
│   │   ├── file-service.js             # 文件系统服务
│   │   └── ai-service.js               # AI API 服务
│   └── utils/
│       ├── ipc-handlers.js             # IPC 处理器
│       └── window-helpers.js           # 窗口辅助函数
│
├── src/                                # 渲染进程（Next.js）
│   ├── app/
│   │   ├── page.tsx                    # 主入口
│   │   ├── layout.tsx                  # 根布局
│   │   └── globals.css                 # 全局样式
│   │
│   ├── components/
│   │   ├── window/                     # 窗口管理组件
│   │   │   ├── WindowManager.tsx       # 窗口管理器
│   │   │   ├── FloatingWindow.tsx      # 浮动窗口容器
│   │   │   ├── WindowTitlebar.tsx      # 标题栏（含长按检测）
│   │   │   ├── DockZone.tsx            # 停靠区域
│   │   │   └── hooks/
│   │   │       ├── useWindowDrag.ts    # 拖动 Hook
│   │   │       ├── useLongPress.ts     # 长按检测 Hook
│   │   │       └── useDocking.ts       # 停靠检测 Hook
│   │   │
│   │   ├── git/                        # Git 面板组件
│   │   │   ├── GitPanel.tsx            # Git 面板主组件
│   │   │   ├── GitStatus.tsx           # 工作区状态
│   │   │   ├── GitCommitList.tsx       # 提交历史列表
│   │   │   ├── GitDiffViewer.tsx       # 代码对比视图
│   │   │   ├── GitBranchSelector.tsx   # 分支选择器
│   │   │   ├── FileChangeItem.tsx      # 文件变更项
│   │   │   └── hooks/
│   │   │       ├── useGitStatus.ts     # Git 状态 Hook
│   │   │       ├── useGitCommits.ts    # 提交历史 Hook
│   │   │       └── useGitOperations.ts # Git 操作 Hook
│   │   │
│   │   ├── chat/                       # 聊天面板
│   │   ├── editor/                     # 编辑器
│   │   ├── repository/                 # 仓库面板
│   │   ├── layout/                     # 布局组件
│   │   └── common/                     # 通用组件
│   │
│   ├── store/                          # 状态管理
│   │   ├── index.ts                    # Zustand 主状态
│   │   ├── window-store.ts             # 窗口状态
│   │   ├── git-store.ts                # Git 状态
│   │   └── types.ts                    # 类型定义
│   │
│   ├── hooks/                          # 自定义 Hooks
│   │   ├── useIPC.ts                   # IPC 通信 Hook
│   │   ├── useElectron.ts              # Electron API Hook
│   │   └── useLayoutPersistence.ts     # 布局持久化 Hook
│   │
│   ├── lib/
│   │   ├── utils.ts                    # 工具函数
│   │   └── ipc-channels.ts             # IPC 通道定义
│   │
│   └── types/
│       ├── window.ts                   # 窗口类型
│       └── git.ts                      # Git 类型
│
├── resources/                          # 资源文件
│   ├── icons/                          # 应用图标
│   └── tray/                           # 托盘图标
│
├── build/                              # 构建输出
├── scripts/                            # 构建脚本
├── package.json
├── next.config.ts
├── electron-builder.json               # Electron 打包配置
└── tsconfig.json
```

---

## 10. 实现路线图

### 阶段 1：Electron 基础架构（2-3 周）

**Week 1: 项目初始化**
- [ ] 初始化 Next.js + Electron 项目
- [ ] 配置 electron-builder
- [ ] 设置开发环境（热重载）
- [ ] 创建基础窗口管理器

**Week 2: IPC 通信**
- [ ] 实现 preload.js 安全桥接
- [ ] 设置 IPC 通道
- [ ] 窗口创建/关闭/管理
- [ ] 持久化配置存储

**Week 3: 浮动窗口系统**
- [ ] 多窗口管理
- [ ] 窗口拖动
- [ ] 停靠检测
- [ ] 基础状态同步

### 阶段 2：窗口管理功能（2 周）

**Week 4: 高级窗口功能**
- [ ] 透明度调节
- [ ] 尺寸调整手柄
- [ ] 停靠吸附动画
- [ ] 布局持久化

**Week 5: 置顶与锁定**
- [ ] 长按检测机制
- [ ] 进度环动画
- [ ] 系统级置顶
- [ ] 窗口锁定功能

### 阶段 3：Git 面板（3 周）

**Week 6: Git 基础**
- [ ] Git 服务封装
- [ ] 仓库状态检测
- [ ] 文件变更列表
- [ ] 暂存/取消暂存

**Week 7: 提交功能**
- [ ] 提交信息输入
- [ ] 提交操作
- [ ] 提交历史列表
- [ ] 推送/拉取

**Week 8: 高级 Git**
- [ ] 分支管理
- [ ] Diff 视图
- [ ] 代码对比
- [ ] 快捷键支持

### 阶段 4：核心功能集成（2 周）

**Week 9: AI 集成**
- [ ] Chat 面板
- [ ] AI API 调用
- [ ] 消息历史
- [ ] 流式响应

**Week 10: 编辑器**
- [ ] Monaco Editor
- [ ] 文件打开/保存
- [ ] 语法高亮
- [ ] 标签页管理

### 阶段 5：优化与发布（2 周）

**Week 11: 优化**
- [ ] 性能优化
- [ ] 内存管理
- [ ] 错误处理
- [ ] 日志系统

**Week 12: 发布准备**
- [ ] 图标与品牌
- [ ] 安装包配置
- [ ] 自动更新
- [ ] 文档完善

---

## 11. 样式规格

### 11.1 颜色主题（深色模式）

```css
/* 基础颜色 */
--bg-primary: #0d1117;        /* 主背景 - GitHub Dark */
--bg-secondary: #161b22;      /* 次背景 */
--bg-tertiary: #21262d;       /* 三阶背景 */
--bg-hover: #30363d;          /* 悬停背景 */
--bg-active: #388bfd;         /* 选中背景 */

/* 边框 */
--border-color: #30363d;
--border-subtle: #21262d;

/* 文字 */
--text-primary: #f0f6fc;
--text-secondary: #8b949e;
--text-muted: #484f58;

/* 强调色 */
--accent-color: #58a6ff;       /* 蓝色 */
--accent-hover: #79c0ff;
--success-color: #238636;      /* 绿色 */
--success-light: #3fb950;
--warning-color: #f0883e;      /* 橙色 */
--error-color: #f85149;        /* 红色 */

/* Git 专用 */
--git-added: #238636;
--git-modified: #f0883e;
--git-deleted: #f85149;
--git-untracked: #8b949e;
--git-renamed: #58a6ff;
```

### 11.2 浮动窗口样式

```css
.floating-window {
  position: fixed;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  backdrop-filter: blur(10px);
}

.floating-window.always-on-top {
  border-color: var(--accent-color);
  box-shadow: 0 8px 32px rgba(88, 166, 255, 0.2);
}

.window-titlebar {
  height: 36px;
  background: linear-gradient(to bottom, var(--bg-tertiary), var(--bg-secondary));
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-color);
  -webkit-app-region: drag;  /* Electron 拖动区域 */
}

.window-titlebar .controls {
  -webkit-app-region: no-drag;
}
```

### 11.3 Git 面板样式

```css
.git-panel {
  background: var(--bg-secondary);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.git-section {
  border-bottom: 1px solid var(--border-color);
  padding: 12px;
}

.git-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.file-change-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.file-change-item:hover {
  background: var(--bg-hover);
}

.file-change-item.added { border-left: 3px solid var(--git-added); }
.file-change-item.modified { border-left: 3px solid var(--git-modified); }
.file-change-item.deleted { border-left: 3px solid var(--git-deleted); }
.file-change-item.untracked { border-left: 3px solid var(--git-untracked); }

.commit-input {
  min-height: 60px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 10px;
  resize: vertical;
  font-family: inherit;
  font-size: 13px;
}

.commit-input:focus {
  outline: none;
  border-color: var(--accent-color);
}
```

---

## 12. 风险评估与建议

### 12.1 技术风险

| 风险 | 影响 | 缓解措施 |
|-----|------|---------|
| **Electron 体积大** | 安装包 >100MB | 使用 electron-builder 优化，按需打包 |
| **多窗口同步复杂** | 状态不同步 | 使用 IPC 严格同步，Zustand 统一管理 |
| **Git 操作权限** | 文件系统访问受限 | 使用 Node.js child_process，请求用户授权 |
| **跨平台差异** | Windows/macOS/Linux 行为不一致 | 充分测试，使用 Electron 抽象层 |
| **内存占用** | 多窗口导致内存过高 | 限制最大窗口数，及时回收不活跃窗口 |

### 12.2 开发建议

1. **优先实现主窗口**：先完成单窗口版本，再扩展到多窗口
2. **Git 功能渐进式**：先实现 status/add/commit，再逐步添加高级功能
3. **持续集成**：配置 GitHub Actions 自动构建多平台安装包
4. **用户反馈**：早期发布 beta 版本收集反馈

---

## 参考资料

- **OpenCode 官方仓库**: https://github.com/anomalyco/opencode
- **官方文档**: https://opencode.ai/docs
- **Electron 文档**: https://www.electronjs.org/docs
- **simple-git 文档**: https://github.com/steveukx/git-js
- **当前项目路径**: D:\yoka open IDE\opencode-ide

---

*此文档由 AI 助手生成，供开发团队参考使用*  
*更新日期: 2026-02-18*  
*版本: v2.0（Electron + Git 面板版本）*
