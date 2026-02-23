# UI组件详细规格说明书（浅色主题）

> 生成时间：2026-02-21  
> 版本：v1.0（草案，待确认）  
> 主题：浅色配色方案

---

## 1. 全局设计系统

### 1.1 配色方案（浅色主题）

```css
/* 主色调 */
--color-primary: #0078d4;          /* 主品牌色 - 微软蓝 */
--color-primary-hover: #106ebe;    /* 主色悬停 */
--color-primary-active: #005a9e;   /* 主色按下 */

/* 背景色 */
--color-bg-primary: #ffffff;       /* 主背景 - 纯白 */
--color-bg-secondary: #f5f5f5;     /* 次级背景 - 浅灰 */
--color-bg-tertiary: #ebebeb;      /* 三级背景 - 中灰 */
--color-bg-hover: #f0f0f0;         /* 悬停背景 */
--color-bg-active: #e5e5e5;        /* 激活背景 */

/* 边框和分割 */
--color-border: #e0e0e0;           /* 默认边框 */
--color-border-hover: #d0d0d0;    /* 悬停边框 */
--color-divider: #e5e5e5;          /* 分割线 */

/* 文字颜色 */
--color-text-primary: #1a1a1a;     /* 主文字 - 深黑 */
--color-text-secondary: #5a5a5a;   /* 次级文字 - 中灰 */
--color-text-tertiary: #8a8a8a;    /* 辅助文字 - 浅灰 */
--color-text-inverse: #ffffff;      /* 反色文字 - 白 */

/* 状态色 */
--color-success: #107c10;          /* 成功 - 绿 */
--color-warning: #ffc107;          /* 警告 - 黄 */
--color-error: #d13438;            /* 错误 - 红 */
--color-info: #0078d4;             /* 信息 - 蓝 */

/* 特殊效果 */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
--shadow-md: 0 4px 6px rgba(0,0,0,0.07);
--shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
--shadow-xl: 0 20px 25px rgba(0,0,0,0.15);

/* 圆角 */
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;
--radius-xl: 12px;
--radius-full: 9999px;
```

### 1.2 动画和过渡规范

```css
/* 悬浮展开动画 - 慢速优雅 */
--transition-slow: 400ms cubic-bezier(0.4, 0.0, 0.2, 1);

/* 标准过渡 */
--transition-normal: 200ms cubic-bezier(0.4, 0.0, 0.2, 1);

/* 快速反馈 */
--transition-fast: 100ms cubic-bezier(0.4, 0.0, 0.6, 1);

/* 弹性动画 */
--transition-bounce: 300ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### 1.3 字体规范

```css
/* 字体族 */
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
--font-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;

/* 字号 */
--text-xs: 11px;    /* 辅助文字 */
--text-sm: 12px;    /* 小标签 */
--text-base: 13px;  /* 正文 */
--text-md: 14px;    /* 菜单文字 */
--text-lg: 16px;    /* 标题 */
--text-xl: 20px;    /* 大标题 */

/* 字重 */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* 行高 */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

---

## 2. 组件详细规格

### 2.1 ActivityBar/菜单栏（TaskBar）

#### 2.1.1 位置与尺寸

```typescript
interface TaskBarDimensions {
  // 折叠状态
  collapsed: {
    width: 40px;        // 仅显示齿轮图标
    height: '100vh';    // 全高
    position: 'fixed';
    left: 0;
    top: 0;
  };
  
  // 展开状态
  expanded: {
    width: 320px;       // 总宽度（包含项目栏、窗口选择栏、寄存栏）
    height: '100vh';
    position: 'fixed';
    left: 0;
    top: 0;
  };
}
```

#### 2.1.2 视觉样式（浅色主题）

```css
/* 折叠状态 - 仅显示齿轮 */
.taskbar-collapsed {
  background: var(--color-bg-secondary);    /* #f5f5f5 */
  border-right: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 0;
}

.taskbar-collapsed .gear-icon {
  width: 24px;
  height: 24px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: transform var(--transition-fast);
}

.taskbar-collapsed .gear-icon:hover {
  transform: rotate(90deg);
  color: var(--color-primary);
}

/* 展开状态 */
.taskbar-expanded {
  background: var(--color-bg-primary);        /* #ffffff */
  border-right: 1px solid var(--color-border);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: row;
}

/* 项目选择区和窗口选择区（左侧面板） */
.taskbar-left-panel {
  width: 200px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

/* 窗口寄存栏（右侧面板） */
.taskbar-registry-panel {
  width: 120px;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-primary);
}
```

#### 2.1.3 动画与交互

```typescript
// 展开动画配置
const expandAnimation = {
  duration: 400,                    // 400ms - 慢速优雅
  easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',  // ease-out
  properties: ['width', 'opacity', 'transform'],
  willChange: 'width, transform',
};

// 悬浮检测
const hoverDetection = {
  triggerZone: 20,                  // 左侧20px触发区域
  enterDelay: 200,                  // 移入延迟200ms（防止误触发）
  leaveDelay: 500,                  // 移出延迟500ms（给用户时间移入展开区域）
  // 当鼠标从触发区快速移入展开区域时，保持展开状态
};

// 齿轮图标动画
const gearAnimation = {
  hover: {
    rotate: '90deg',
    duration: 200,
    easing: 'ease-out',
  },
  click: {
    scale: 0.95,
    duration: 100,
  },
};
```

#### 2.1.4 状态管理

```typescript
// TaskBar状态
interface TaskBarState {
  // 展开状态
  isExpanded: boolean;
  isHovered: boolean;
  isLocked: boolean;              // 是否锁定展开状态（点击齿轮切换）
  
  // 展开区域的活动分区
  activeSection: 'projects' | 'windows' | 'registry' | null;
  
  // 动画状态
  isAnimating: boolean;
  animationDirection: 'expanding' | 'collapsing' | null;
}

// 在全局store中的位置
interface AppState {
  // ... 其他状态
  
  // TaskBar状态
  taskBar: TaskBarState;
  
  // 窗口寄存列表
  windowRegistry: WindowRegistryItem[];
  
  // 后端连接状态
  backendConnection: BackendConnectionStatus;
}
```

#### 2.1.5 存疑问题（待确认）

1. **展开宽度的可变性**：
   - **问题**：展开宽度是固定320px，还是会根据项目数量和窗口数量动态调整？
   - **建议**：左侧项目+窗口选择区固定200px，右侧寄存栏固定120px，总宽320px固定
   - **需要确认**：是否允许用户手动拖拽调整宽度？

2. **齿轮图标的功能**：
   - **问题**：点击齿轮是切换展开/折叠，还是打开设置菜单？
   - **建议**：单击切换展开/折叠，右键或长按打开设置菜单
   - **需要确认**：是否需要在齿轮上显示通知徽章（如更新提示）？

3. **寄存栏的显示逻辑**：
   - **问题**：当窗口较多时，寄存栏如何显示？是否支持滚动？
   - **建议**：垂直滚动，最大高度占屏幕70%，显示窗口标题+类型图标
   - **需要确认**：是否需要在寄存栏显示窗口预览缩略图？

4. **连接状态的显示方式**：
   - **问题**：后端连接状态是显示在寄存栏底部，还是独立显示？
   - **建议**：固定在寄存栏底部，用状态灯+简短文字（如"已连接"）
   - **需要确认**：断开连接时是否需要显示重连按钮或提示？

---

### 2.2 项目选择栏和窗口选择栏

#### 2.2.1 整体布局

```
+----------------------------------+
|         折叠托盘（左侧面板）         |
|      宽度：200px（固定）            |
+----------------------------------+
|  ┌────────────────────────────┐   |
|  │      项目选择栏            │   |
|  │  （动态高度，最大150px）    │   |
|  │                            │   |
|  │   [项目1] [项目2] [项目3]  │   |
|  │                            │   |
|  └────────────────────────────┘   |
|           ↑ 可折叠               |
|  ┌────────────────────────────┐   |
|  │      窗口选择栏            │   |
|  │  （动态高度，最大250px）    │   |
|  │                            │   |
|  │   [聊天] [编辑器] [Git]... │   |
|  │                            │   |
|  └────────────────────────────┘   |
|           ↑ 可折叠               |
+----------------------------------+
```

#### 2.2.2 视觉样式

```css
/* 折叠托盘容器 */
.collapsible-tray {
  display: flex;
  flex-direction: column;
  width: 200px;
  height: 100%;
  background: var(--color-bg-secondary);  /* #f5f5f5 */
  border-right: 1px solid var(--color-border);
}

/* 项目选择栏 */
.project-selector-section {
  display: flex;
  flex-direction: column;
  min-height: 60px;
  max-height: 150px;
  padding: 8px;
  border-bottom: 1px solid var(--color-border);
  transition: max-height var(--transition-normal);
}

.project-selector-section.collapsed {
  max-height: 32px;
  overflow: hidden;
}

/* 项目色块网格 */
.project-color-blocks {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px;
}

/* 窗口选择栏 */
.window-selector-section {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 100px;
  max-height: 250px;
  padding: 8px;
  border-bottom: 1px solid var(--color-border);
  transition: max-height var(--transition-normal);
}

.window-selector-section.collapsed {
  max-height: 32px;
  overflow: hidden;
}

/* 窗口按钮网格 */
.window-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  padding: 4px;
}
```

#### 2.2.3 交互规格

```typescript
// 折叠托盘状态
interface CollapsibleTrayState {
  isProjectSectionExpanded: boolean;
  isWindowSectionExpanded: boolean;
  projectSectionHeight: number;      // 当前高度（动态调整）
  windowSectionHeight: number;
}

// 折叠/展开动画
const sectionToggleAnimation = {
  duration: 300,
  easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  properties: ['height', 'opacity'],
};

// 托盘尺寸动态调整逻辑
function calculateTrayDimensions(
  projectCount: number,
  windowButtonCount: number,
  availableHeight: number
): TrayDimensions {
  const projectSectionMinHeight = 60;
  const projectSectionMaxHeight = 150;
  const windowSectionMinHeight = 100;
  const windowSectionMaxHeight = 250;
  
  // 计算项目选择栏的理想高度
  const projectRowCount = Math.ceil(projectCount / 4);  // 每行4个色块
  const idealProjectHeight = 40 + projectRowCount * 46;   // 40px头部 + 每行46px
  
  // 计算窗口选择栏的理想高度
  const windowRowCount = Math.ceil(windowButtonCount / 2);  // 每行2个按钮
  const idealWindowHeight = 40 + windowRowCount * 46;
  
  // 应用约束
  const projectHeight = Math.min(
    projectSectionMaxHeight,
    Math.max(projectSectionMinHeight, idealProjectHeight)
  );
  
  const windowHeight = Math.min(
    windowSectionMaxHeight,
    Math.max(windowSectionMinHeight, idealWindowHeight)
  );
  
  return {
    projectSectionHeight: projectHeight,
    windowSectionHeight: windowHeight,
    totalHeight: projectHeight + windowHeight,
  };
}
```

#### 2.2.4 存疑问题

1. **托盘尺寸约束**：
   - **问题**：托盘的最大高度是多少？是占满整个屏幕高度，还是有一个上限（如600px）？
   - **建议**：最大高度为屏幕高度的80%，最小高度为300px
   - **需要确认**：当项目数量很多时，是显示滚动条还是展开到最大高度？

2. **折叠状态的记忆**：
   - **问题**：用户折叠了某个区域后，下次打开任务栏时是否应该记住这个状态？
   - **建议**：记住用户的折叠偏好，持久化到localStorage
   - **需要确认**：是每个项目单独记忆，还是全局统一的折叠状态？

3. **窗口按钮的显示**：
   - **问题**：窗口选择栏显示的是所有可创建的窗口类型，还是只显示部分常用类型？
   - **建议**：显示常用的6-8个窗口类型，提供"更多"按钮展开完整列表
   - **需要确认**：是否允许用户自定义哪些窗口类型显示在快捷区域？

---

## 3. 待确认问题清单

### 3.1 关键问题（阻塞设计）

| 序号 | 问题 | 当前理解 | 需要确认 | 影响范围 |
|------|------|----------|----------|----------|
| 1 | **托盘最大高度** | 屏幕高度的80% | 是否包含寄存栏？ | 布局系统 |
| 2 | **折叠状态记忆** | 持久化到localStorage | 是按项目还是全局？ | 用户体验 |
| 3 | **窗口按钮数量** | 显示6-8个常用 | 是否支持用户自定义？ | 界面灵活性 |
| 4 | **连接状态粒度** | 显示AI服务状态 | 是否显示Git和文件系统？ | 功能范围 |
| 5 | **拖拽释放确认** | 跨项目移动时确认 | 是否有"不再询问"选项？ | 交互流程 |

### 3.2 次要问题（可后续确认）

| 序号 | 问题 | 建议方案 | 备注 |
|------|------|----------|------|
| 6 | **项目色块形状** | 圆角矩形（8px） | 是否考虑圆形选项？ |
| 7 | **对话列表宽度** | 200px | 是否需要可调节？ |
| 8 | **动画时长** | 悬浮展开400ms | 是否需要更快/更慢选项？ |
| 9 | **滚动条样式** | 系统默认 | 是否需要自定义样式？ |
| 10 | **空状态显示** | "暂无项目"/"暂无窗口" | 是否需要引导创建？ |

---

## 4. 下一步行动

### 4.1 需要立即确认的问题

请回答以下**5个关键问题**，以便我继续完善设计：

1. **托盘最大高度是否包含窗口寄存栏？**
   - A: 包含，整个任务栏（左侧+右侧）总高度不超过屏幕80%
   - B: 不包含，只有左侧项目+窗口选择区限制80%，右侧寄存栏独立

2. **折叠状态的记忆粒度？**
   - A: 全局统一（用户折叠项目区，所有项目都记住折叠）
   - B: 按项目记忆（每个项目的折叠状态独立保存）

3. **窗口按钮的自定义？**
   - A: 不支持，固定显示6-8个预设窗口类型
   - B: 支持，用户可以自选哪些窗口类型显示在快捷区域

4. **连接状态的显示范围？**
   - A: 只显示AI服务连接状态
   - B: 显示所有服务（AI+Git+文件系统）的综合状态

5. **跨项目拖拽的确认？**
   - A: 每次移动都弹出确认对话框
   - B: 首次确认，提供"不再询问"选项

### 4.2 后续工作计划

在确认上述问题后，我将继续完成：

1. **窗口寄存栏详细规格**
   - 窗口项的显示方式（标题、图标、状态）
   - 显示/隐藏切换的动画
   - 连接状态指示器的设计

2. **项目色块和对话列表详细规格**
   - 颜色生成算法
   - 对话列表的布局和样式
   - 拖拽交互的详细流程

3. **其他组件规格**
   - 窗口选择按钮的样式
   - 输入框的完整规格
   - 多功能编辑器的初步规格

4. **技术实现建议**
   - 组件拆分建议
   - 状态管理方案
   - 动画实现方案

---

## 5. 附录

### 5.1 术语表

| 术语 | 定义 |
|------|------|
| **ActivityBar** | 现有实现中的左侧固定侧边栏 |
| **TaskBar/菜单栏** | 新的悬浮展开式任务栏 |
| **项目选择栏** | 显示项目色块的区域 |
| **窗口选择栏** | 显示窗口创建按钮的区域 |
| **窗口寄存栏** | 显示已打开窗口的区域 |
| **项目色块** | 代表项目的随机颜色圆角矩形 |
| **对话列表** | 悬浮在项目色块上时显示的对话列表 |
| **折叠托盘** | 包含项目选择栏和窗口选择栏的可折叠容器 |

### 5.2 现有代码参考

- **ActivityBar当前实现**: `opencode-ide/src/components/layout/index.tsx`
- **Store状态管理**: `opencode-ide/src/store/index.ts`
- **TypeScript类型定义**: `opencode-ide/src/types/index.ts`

### 5.3 参考文档

1. [基础需求参考.md](./基础需求参考.md)
2. [OpenCode_IDE_实现需求表.md](./OpenCode_IDE_实现需求表.md)

---

*文档版本：v1.0（草案）*  
*最后更新：2026-02-21*  
*状态：等待关键问题确认*
