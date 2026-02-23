# UI组件规格说明书 - 项目色块与对话列表

> 版本：v1.2  
> 日期：2026-02-21  
> 主题：浅色配色方案  
> 状态：基于用户确认（全部同意）

---

## 1. 项目色块 (Project Color Block)

### 1.1 尺寸与形状

```typescript
interface ProjectColorBlockDimensions {
  // 默认尺寸
  default: {
    width: 40px;
    height: 40px;
    borderRadius: 8px;          // 圆角矩形
  };
  
  // 紧凑模式（项目数量较多时）
  compact: {
    width: 32px;
    height: 32px;
    borderRadius: 6px;
  };
  
  // 切换阈值
  compactThreshold: 10;           // 项目数量>=10时切换为紧凑模式
  
  // 间距
  gap: 6px;                       // 色块之间的间距
}
```

### 1.2 颜色生成算法

```typescript
/**
 * 基于项目名生成一致的颜色
 * 确保相同项目名总是生成相同的颜色
 */
function generateProjectColor(projectName: string): string {
  // 1. 计算项目名的哈希值
  let hash = 0;
  for (let i = 0; i < projectName.length; i++) {
    const char = projectName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // 2. 基于哈希生成HSL颜色
  // 色相：0-360度，使用哈希的前8位
  const hue = Math.abs(hash % 360);
  
  // 饱和度：60-80%，使用哈希的中间4位
  const saturationBase = Math.abs((hash >> 8) % 21); // 0-20
  const saturation = 60 + saturationBase; // 60-80%
  
  // 亮度：45-65%，使用哈希的后4位
  const lightnessBase = Math.abs((hash >> 12) % 21); // 0-20
  const lightness = 45 + lightnessBase; // 45-65%
  
  // 3. 转换为HSL字符串
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// 颜色对比度检查（确保文字可读性）
function getContrastColor(backgroundColor: string): string {
  // 提取HSL中的亮度
  const lightnessMatch = backgroundColor.match(/(\d+)%\)/);
  const lightness = lightnessMatch ? parseInt(lightnessMatch[1]) : 50;
  
  // 亮度>55%使用深色文字，否则使用白色文字
  return lightness > 55 ? '#1a1a1a' : '#ffffff';
}
```

### 1.3 视觉样式

```css
/* 项目色块基础样式 */
.project-color-block {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  position: relative;
  transition: all 200ms ease-out;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border: 2px solid transparent;
}

/* 悬浮效果 */
.project-color-block:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 10;
}

/* 选中状态 */
.project-color-block.active {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(0,120,212,0.2);
}

/* 紧凑模式 */
.project-color-block.compact {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  font-size: 13px;
}

/* 拖拽时的样式 */
.project-color-block.dragging {
  opacity: 0.5;
  transform: scale(0.95);
}

/* 拖拽释放区域的样式 */
.project-color-block.drag-over {
  border-color: var(--color-primary);
  background: rgba(0,120,212,0.1);
}
```

### 1.4 交互规格

```typescript
// 项目色块交互
interface ProjectColorBlockInteraction {
  // 悬浮显示对话列表
  onHover: {
    delay: 300ms;                    // 悬浮300ms后显示对话列表
    action: 'showConversationList';   // 显示对话列表面板
  };
  
  // 点击选中项目
  onClick: {
    action: 'selectProject';
    effect: 'highlightBlock';         // 高亮当前色块
    sideEffect: 'switchToProject';   // 切换到该项目上下文
  };
  
  // 右键菜单
  onContextMenu: {
    items: [
      { label: '重命名', action: 'renameProject' },
      { label: '更改颜色', action: 'changeColor' },
      { label: '固定到顶部', action: 'pinProject' },
      { label: '删除项目', action: 'deleteProject', danger: true },
    ];
  };
  
  // 拖拽交互（作为拖拽源）
  onDragStart: {
    effect: 'moveProject';
    data: { projectId: string; projectName: string };
    visual: 'dragImage';             // 拖拽时的视觉反馈
  };
  
  // 拖拽交互（作为放置目标）
  onDrop: {
    accepts: ['conversation', 'conversationGroup'];
    action: 'moveToProject';          // 将对话/对话组移动到该项目
    visual: 'highlightBorder';       // 放置时的视觉反馈
  };
}
```

---

## 2. 对话列表 (Conversation List)

### 2.1 位置与尺寸

```typescript
interface ConversationListDimensions {
  // 位置（相对于项目色块）
  position: {
    anchor: 'right';                  // 从项目色块右侧弹出
    offset: { x: 8px; y: 0 };      // 水平偏移8px，垂直对齐
  };
  
  // 尺寸
  width: 200px;
  minHeight: 100px;
  maxHeight: 300px;                   // 超出时显示滚动条
  
  // 头部
  header: {
    height: 40px;
    padding: '0 12px';
  };
  
  // 列表区域
  list: {
    padding: '4px 0';
  };
  
  // 间距
  itemGap: 2px;                       // 列表项之间的间距
}
```

### 2.2 视觉样式

```css
/* 对话列表容器 */
.conversation-list {
  width: 200px;
  background: var(--color-bg-primary);        /* #ffffff */
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);              /* 8px */
  box-shadow: var(--shadow-xl);                 /* 0 20px 25px rgba(0,0,0,0.15) */
  overflow: hidden;
  z-index: 1000;
  animation: conversationListEnter 200ms ease-out;
}

@keyframes conversationListEnter {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 头部 */
.conversation-list-header {
  height: 40px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-bg-secondary);        /* #f5f5f5 */
  border-bottom: 1px solid var(--color-border);
}

.conversation-list-title {
  font-size: var(--text-sm);                  /* 12px */
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.conversation-list-count {
  font-size: var(--text-xs);                    /* 11px */
  color: var(--color-text-tertiary);
  background: var(--color-bg-tertiary);
  padding: 2px 6px;
  border-radius: var(--radius-full);
}

.conversation-list-new-btn {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.conversation-list-new-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-primary);
}

/* 列表区域 */
.conversation-list-content {
  max-height: 260px;
  overflow-y: auto;
  padding: 4px 0;
}

/* 自定义滚动条 */
.conversation-list-content::-webkit-scrollbar {
  width: 6px;
}

.conversation-list-content::-webkit-scrollbar-track {
  background: transparent;
}

.conversation-list-content::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: var(--radius-full);
}

.conversation-list-content::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-hover);
}

/* 列表项（对话组或对话） */
.conversation-list-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background var(--transition-fast);
  border-left: 3px solid transparent;
}

.conversation-list-item:hover {
  background: var(--color-bg-hover);
}

.conversation-list-item.selected {
  background: var(--color-bg-tertiary);
  border-left-color: var(--color-primary);
}

.conversation-list-item.dragging {
  opacity: 0.5;
  background: var(--color-bg-secondary);
}

.conversation-list-item.drag-over {
  background: rgba(0, 120, 212, 0.1);
  border-left-color: var(--color-primary);
}

/* 列表项图标 */
.conversation-item-icon {
  width: 16px;
  height: 16px;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.conversation-list-item:hover .conversation-item-icon,
.conversation-list-item.selected .conversation-item-icon {
  color: var(--color-text-secondary);
}

/* 列表项内容 */
.conversation-item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.conversation-item-title {
  font-size: var(--text-sm);              /* 12px */
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: var(--font-medium);
}

.conversation-item-meta {
  font-size: var(--text-xs);                /* 11px */
  color: var(--color-text-tertiary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.conversation-item-time {
  white-space: nowrap;
}

.conversation-item-count {
  background: var(--color-bg-tertiary);
  padding: 0 4px;
  border-radius: var(--radius-full);
  font-size: 10px;
}

/* 对话组特有的展开/折叠图标 */
.conversation-group-toggle {
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  transition: transform var(--transition-fast);
}

.conversation-group-toggle.expanded {
  transform: rotate(90deg);
}

/* 对话组的子列表 */
.conversation-group-children {
  padding-left: 16px;
  border-left: 1px solid var(--color-border);
  margin-left: 7px;
}

/* 空状态 */
.conversation-list-empty {
  padding: 24px 12px;
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

.conversation-list-empty-icon {
  width: 32px;
  height: 32px;
  margin: 0 auto 8px;
  color: var(--color-border-hover);
}
```

### 2.3 交互规格

```typescript
// 对话列表交互
interface ConversationListInteraction {
  // 显示触发
  onTrigger: {
    condition: 'hoverProjectColorBlock';    // 悬浮在项目色块上
    delay: 300ms;                           // 延迟300ms显示
    action: 'showConversationList';
    position: {                              // 显示位置
      anchor: 'right';                       // 从色块右侧弹出
      offset: { x: 8px; y: 0 };
    };
  };
  
  // 关闭触发
  onClose: {
    conditions: [
      { type: 'mouseLeave'; delay: 500ms },   // 鼠标离开列表500ms后关闭
      { type: 'clickOutside' },               // 点击列表外部关闭
      { type: 'pressEscape' },                // 按ESC键关闭
    ];
  };
  
  // 列表项（对话或对话组）交互
  listItem: {
    // 悬浮
    onHover: {
      action: 'highlightItem';
      showActions: ['quickActions'];        // 显示快速操作按钮
    };
    
    // 点击
    onClick: {
      action: 'openConversation';
      effect: 'activateConversation';        // 激活对话，在聊天面板中显示
    };
    
    // 右键菜单
    onContextMenu: {
      items: [
        { label: '重命名', action: 'rename', icon: 'Edit' },
        { label: '复制', action: 'duplicate', icon: 'Copy' },
        { label: '导出', action: 'export', icon: 'Download' },
        { type: 'separator' },
        { label: '移动到组', action: 'moveToGroup', icon: 'Folder' },
        { label: '移动到项目', action: 'moveToProject', icon: 'ArrowRight' },
        { type: 'separator' },
        { label: '删除', action: 'delete', icon: 'Trash2', danger: true },
      ];
    };
    
    // 拖拽（对话项作为拖拽源）
    onDragStart: {
      effect: 'move';
      data: {
        type: 'conversation' | 'conversationGroup';
        id: string;
        projectId: string;
        title: string;
      };
      visual: 'dragImage';               // 拖拽时的缩略图
    };
    
    // 放置（对话项作为放置目标 - 用于排序）
    onDrop: {
      accepts: ['conversation', 'conversationGroup'];
      position: 'before' | 'after';        // 放置在目标之前或之后
      action: 'reorder';                   // 重新排序
    };
  };
  
  // 对话组特有的展开/折叠
  conversationGroup: {
    onToggleExpand: {
      action: 'toggleChildrenVisibility';
      animation: {
        duration: 200ms;
        easing: 'ease-in-out';
        properties: ['height', 'opacity'];
      };
      iconRotation: 90deg;                  // 展开时箭头旋转90度
    };
    
    // 拖拽整个组
    onDragStart: {
      effect: 'move';
      data: {
        type: 'conversationGroup';
        id: string;
        projectId: string;
        name: string;
        conversationIds: string[];
      };
      visual: 'groupDragImage';            // 显示组图标和名称
    };
  };
  
  // 新建对话按钮
  newConversationButton: {
    position: 'header';                      // 在列表头部
    icon: 'Plus';
    label: '新对话';
    onClick: {
      action: 'createNewConversation';
      effect: 'openInputPanel';              // 打开输入框面板
    };
  };
  
  // 作为放置目标（整个列表）
  onDrop: {
    accepts: ['conversation', 'conversationGroup'];
    from: 'otherProject';                    // 接受来自其他项目的拖拽
    action: 'moveToCurrentProject';          // 移动到当前项目
    confirm: {
      enabled: true;                          // 启用确认（基于选项5B）
      rememberChoice: true;                   // 记住"不再询问"选项
      defaultAction: 'move';                  // 默认移动（非复制）
      modifierKey: 'ctrl';                    // 按住Ctrl为复制
    };
  };
}
```

### 2.4 数据结构

```typescript
// 对话列表数据
interface ConversationListData {
  // 所属项目
  projectId: string;
  projectName: string;
  projectColor: string;
  
  // 对话组
  groups: ConversationGroup[];
  
  // 独立对话（不在组内）
  standaloneConversations: Conversation[];
  
  // 统计
  totalCount: number;
  unreadCount: number;
}

// 对话组
interface ConversationGroup {
  id: string;
  name: string;
  projectId: string;
  order: number;                          // 排序序号
  isExpanded: boolean;                    // 是否展开
  createdAt: Date;
  updatedAt: Date;
  
  // 组内的对话
  conversations: Conversation[];
}

// 对话
interface Conversation {
  id: string;
  title: string;
  projectId: string;
  groupId: string | null;                   // null表示不在组内
  order: number;                            // 在组内或独立列表中的排序
  
  // 元数据
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
  
  // 统计
  messageCount: number;
  unreadCount: number;
  
  // 标签
  tags: string[];
  
  // 上下文（用于恢复对话）
  context: {
    modelId: string;
    systemPrompt: string;
    temperature: number;
    // ... 其他上下文
  };
}
```

---

## 3. 拖拽交互详细规格

### 3.1 拖拽源类型

```typescript
type DragSource = 
  | { type: 'conversation'; data: ConversationDragData }
  | { type: 'conversationGroup'; data: ConversationGroupDragData }
  | { type: 'projectColorBlock'; data: ProjectDragData };

interface ConversationDragData {
  id: string;
  title: string;
  projectId: string;
  groupId: string | null;
  isInGroup: boolean;
}

interface ConversationGroupDragData {
  id: string;
  name: string;
  projectId: string;
  conversationCount: number;
  isExpanded: boolean;
}

interface ProjectDragData {
  id: string;
  name: string;
  color: string;
  conversationCount: number;
}
```

### 3.2 放置目标类型和交互

```typescript
type DropTarget =
  | { type: 'conversationGroup'; accepts: ['conversation']; action: DropAction }
  | { type: 'conversationList'; accepts: ['conversation', 'conversationGroup']; action: DropAction }
  | { type: 'projectColorBlock'; accepts: ['conversation', 'conversationGroup']; action: DropAction };

type DropAction =
  | { type: 'reorder'; direction: 'before' | 'after' }
  | { type: 'moveToGroup' }
  | { type: 'moveToProject'; confirm: boolean }
  | { type: 'copyToProject'; confirm: boolean };

// 放置交互详细配置
const dropInteractions: DropInteractionConfig = {
  // 对话 → 对话组（将对话拖进组）
  conversationToGroup: {
    accepts: ['conversation'],
    target: 'conversationGroup',
    action: { type: 'moveToGroup' },
    visualFeedback: {
      targetHighlight: true,                // 高亮目标组
      expandGroup: true,                    // 自动展开组（如果折叠）
      dropIndicator: 'inside',              // 显示"放入内部"指示器
    },
    animation: {
      duration: 200,
      easing: 'ease-out',
    },
  },
  
  // 对话/对话组 → 对话列表（重新排序）
  itemToList: {
    accepts: ['conversation', 'conversationGroup'],
    target: 'conversationList',
    action: { type: 'reorder', direction: 'before' },  // 默认插入到目标之前
    visualFeedback: {
      dropIndicator: 'line',            // 显示水平线指示放置位置
      reorderPreview: true,             // 预览重新排序后的效果
    },
    animation: {
      duration: 150,
      easing: 'ease-in-out',
    },
  },
  
  // 对话/对话组 → 项目色块（移动/复制到项目）
  itemToProject: {
    accepts: ['conversation', 'conversationGroup'],
    target: 'projectColorBlock',
    action: { 
      type: 'moveToProject', 
      confirm: true                    // 启用确认（基于选项5B）
    },
    visualFeedback: {
      targetHighlight: true,          // 高亮目标项目色块
      dragImage: 'itemPreview',       // 拖拽时显示项预览
    },
    // 确认对话框配置
    confirmDialog: {
      title: (itemType) => itemType === 'conversation' ? '移动对话' : '移动对话组',
      message: (itemName, projectName) => `确定要将"${itemName}"移动到"${projectName}"项目吗？`,
      modifierKey: 'ctrl',              // 按住Ctrl键为复制
      modifierHint: '按住 Ctrl 复制而非移动',
      rememberChoice: {
        enabled: true,
        label: '记住我的选择，不再询问',
        storageKey: 'conversationMoveConfirmPreference',
      },
      buttons: [
        { label: '移动', action: 'move', primary: true },
        { label: '复制', action: 'copy', visible: 'onModifierKey' },
        { label: '取消', action: 'cancel' },
      ],
    },
    animation: {
      flyToTarget: {
        duration: 300,
        easing: 'ease-in-out',
      },
      targetPulse: {
        duration: 400,
        scale: [1, 1.1, 1],
        easing: 'ease-out',
      },
    },
  },
};
```

---

## 4. 组件结构

### 4.1 React组件拆分

```typescript
// 项目色块组件
interface ProjectColorBlockProps {
  project: {
    id: string;
    name: string;
  };
  size?: 'default' | 'compact';
  isActive?: boolean;
  isDragging?: boolean;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, item: DropItem) => void;
}

// 对话列表组件
interface ConversationListProps {
  projectId: string;
  projectName: string;
  projectColor: string;
  isVisible: boolean;
  position: { x: number; y: number };
  conversations: Conversation[];
  groups: ConversationGroup[];
  onClose: () => void;
  onSelectConversation: (id: string) => void;
  onCreateConversation: () => void;
  onDragStart: (item: DragItem) => void;
  onDrop: (targetId: string, position: 'before' | 'after') => void;
}
```

---

## 5. 待确认问题（更新）

基于已完成的设计，以下问题已经明确或需要最终确认：

### 已明确的问题

1. ✅ **托盘最大高度**：包含寄存栏，整个任务栏限制在屏幕80%
2. ✅ **折叠状态记忆**：按项目独立记忆每个项目的折叠状态
3. ✅ **窗口按钮**：不支持自定义，固定显示6-8个预设类型
4. ✅ **连接状态**：显示AI+Git+文件系统的综合状态
5. ✅ **跨项目拖拽**：启用确认对话框，支持"不再询问"选项

### 仍需确认的问题

| 序号 | 问题 | 当前假设 | 影响 | 建议 |
|------|------|----------|------|------|
| 6 | 窗口寄存项缩略图 | 暂不支持 | 开发成本 | 先实现图标+文字，V2考虑缩略图 |
| 7 | 对话列表滚动条样式 | 使用系统默认 | 视觉一致性 | 使用自定义细滚动条 |
| 8 | 连接状态刷新频率 | 手动+每30秒自动 | 性能 | 接受此方案 |
| 9 | 空状态引导 | "暂无窗口"+创建按钮 | 用户体验 | 接受此方案 |
| 10 | 错误重连机制 | 断开显示重连按钮 | 稳定性 | 接受此方案 |

---

**下一步：确认上述6-10号问题，或开始下一个组件（输入框）的设计？** 🎨
