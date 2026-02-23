# UI组件规格说明书 - 窗口寄存栏与项目色块

> 基于用户确认的选项（1A 2B 3A 4B 5B）
> 版本：v1.1
> 日期：2026-02-21

---

## 1. 窗口寄存栏 (WindowRegistry)

### 1.1 基于确认选项的设计决策

**选项 1A - 托盘最大高度包含寄存栏**：
- 整个任务栏（左侧 200px + 右侧 120px）总高度不超过屏幕 80%
- 当内容超出时，左侧项目区和右侧寄存栏都显示滚动条
- 保持视觉上的统一性

**选项 4B - 连接状态显示所有服务**：
- 状态灯显示 AI+Git+文件系统的综合状态
- 全部正常 = 绿灯，任一异常 = 黄灯，全部断开 = 红灯
- 鼠标悬浮显示详细状态面板

### 1.2 位置与尺寸

```typescript
interface WindowRegistryDimensions {
  // 在展开的任务栏中的位置
  position: 'right-panel';          // 任务栏右侧 120px 区域
  
  // 尺寸
  width: 120px;
  height: '100%';                     // 与左侧一起限制在屏幕 80%
  
  // 内部布局
  header: {
    height: 40px;
    content: '窗口寄存' | 'Window Registry';
  };
  
  list: {
    maxHeight: 'calc(100% - 40px - 60px)';  // 减去头部和连接状态区
    overflow: 'auto';
  };
  
  connectionStatus: {
    height: 60px;
    position: 'bottom';
  };
}
```

### 1.3 视觉样式（浅色主题）

```css
/* 窗口寄存栏容器 */
.window-registry {
  width: 120px;
  height: 100%;
  background: var(--color-bg-primary);      /* #ffffff */
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
}

/* 头部 */
.registry-header {
  height: 40px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.registry-header-title {
  font-size: var(--text-sm);              /* 12px */
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.registry-header-count {
  font-size: var(--text-xs);                /* 11px */
  color: var(--color-text-tertiary);
  background: var(--color-bg-tertiary);
  padding: 2px 6px;
  border-radius: var(--radius-full);
}

/* 窗口列表 */
.registry-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 窗口项 */
.registry-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid transparent;
}

.registry-item:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-border);
}

.registry-item.active {
  background: var(--color-primary-10);    /* 10% opacity primary color */
  border-color: var(--color-primary);
}

.registry-item.hidden {
  opacity: 0.5;
}

.registry-item-icon {
  width: 16px;
  height: 16px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.registry-item.active .registry-item-icon {
  color: var(--color-primary);
}

.registry-item-title {
  font-size: var(--text-xs);              /* 11px */
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.registry-item.hidden .registry-item-title {
  text-decoration: line-through;
}

/* 连接状态区域 */
.connection-status {
  height: 60px;
  padding: 8px 12px;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.connection-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.connection-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: all var(--transition-normal);
}

.connection-dot.healthy {
  background: var(--color-success);
  box-shadow: 0 0 4px var(--color-success);
}

.connection-dot.warning {
  background: var(--color-warning);
  box-shadow: 0 0 4px var(--color-warning);
}

.connection-dot.error {
  background: var(--color-error);
  box-shadow: 0 0 4px var(--color-error);
  animation: pulse-error 2s infinite;
}

@keyframes pulse-error {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.connection-text {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.connection-details {
  font-size: 10px;
  color: var(--color-text-tertiary);
  padding-left: 14px;
}
```

### 1.4 交互规格

```typescript
// 窗口寄存状态
interface WindowRegistryState {
  // 窗口列表
  windows: WindowRegistryItem[];
  
  // 选中项
  selectedWindowId: string | null;
  
  // 过滤和排序
  filter: 'all' | 'visible' | 'hidden';
  sortBy: 'recent' | 'alphabetical' | 'type';
  
  // 连接状态
  connectionStatus: ConnectionStatus;
  isConnectionPanelOpen: boolean;
}

// 窗口寄存项
interface WindowRegistryItem {
  id: string;
  type: WindowType;
  title: string;
  icon: string;
  isVisible: boolean;
  isMinimized: boolean;
  isActive: boolean;
  lastActiveAt: number;           // 用于排序
  thumbnail?: string;             // 缩略图（可选）
}

// 连接状态（基于选项4B：显示所有服务）
interface ConnectionStatus {
  overall: 'healthy' | 'warning' | 'error';
  services: {
    ai: { status: 'connected' | 'disconnected' | 'connecting'; latency: number; lastPing: Date };
    git: { status: 'connected' | 'disconnected'; lastSync: Date };
    filesystem: { status: 'connected' | 'disconnected'; rootPath: string };
  };
  lastUpdated: Date;
}

// 交互动作
interface WindowRegistryActions {
  // 窗口操作
  selectWindow: (id: string) => void;
  toggleWindowVisibility: (id: string) => void;
  showWindow: (id: string) => void;
  hideWindow: (id: string) => void;
  closeWindow: (id: string) => void;
  
  // 过滤和排序
  setFilter: (filter: WindowRegistryState['filter']) => void;
  setSortBy: (sortBy: WindowRegistryState['sortBy']) => void;
  
  // 连接状态
  toggleConnectionPanel: () => void;
  refreshConnectionStatus: () => Promise<void>;
}
```

### 1.5 动画规格

```typescript
// 窗口项动画
const windowItemAnimations = {
  // 列表项进入动画
  enter: {
    duration: 200,
    easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    from: { opacity: 0, transform: 'translateX(-10px)' },
    to: { opacity: 1, transform: 'translateX(0)' },
  },
  
  // 列表项退出动画
  exit: {
    duration: 150,
    easing: 'ease-out',
    from: { opacity: 1, height: 'auto' },
    to: { opacity: 0, height: 0 },
  },
  
  // 选中状态变化
  select: {
    duration: 150,
    easing: 'ease-in-out',
    properties: ['background-color', 'border-color', 'box-shadow'],
  },
  
  // 隐藏/显示切换
  visibilityToggle: {
    duration: 200,
    easing: 'ease-in-out',
    iconAnimation: { rotation: 180 },  // 图标旋转180度
    opacityChange: { from: 1, to: 0.5 },
  },
};

// 连接状态指示器动画
const connectionStatusAnimations = {
  // 状态变化时的脉冲效果
  statusChange: {
    duration: 300,
    easing: 'ease-out',
    pulse: {
      scale: [1, 1.3, 1],
      opacity: [1, 0.7, 1],
    },
  },
  
  // 错误状态的闪烁动画
  errorPulse: {
    duration: 2000,
    easing: 'ease-in-out',
    iteration: 'infinite',
    keyframes: [
      { opacity: 1, offset: 0 },
      { opacity: 0.4, offset: 0.5 },
      { opacity: 1, offset: 1 },
    ],
  },
  
  // 详情面板展开/收起
  panelToggle: {
    duration: 250,
    easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    height: { from: 0, to: 'auto' },
    opacity: { from: 0, to: 1 },
  },
};
```

---

## 2. 存疑问题清单更新

基于已完成的设计，以下问题仍然需要确认：

| 序号 | 问题 | 当前假设 | 影响 | 优先级 |
|------|------|----------|------|--------|
| 1 | **窗口项缩略图** | 暂不支持，只显示图标和标题 | 开发成本 | 低 |
| 2 | **窗口列表滚动条样式** | 使用系统默认样式 | 视觉一致性 | 中 |
| 3 | **连接状态刷新频率** | 手动刷新 + 每30秒自动刷新 | 性能 | 中 |
| 4 | **空状态显示** | "暂无窗口" + 引导创建按钮 | 用户体验 | 中 |
| 5 | **错误重连机制** | 断开时显示"重连"按钮，3次失败后提示 | 稳定性 | 高 |

---

**下一步：确认上述问题或继续下一个组件（项目色块和对话列表）的设计？** 🎨
