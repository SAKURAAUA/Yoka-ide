# 窗口停靠系统实现方案

## 1. 系统概述

### 1.1 目标
实现类似 Photoshop/Unity 的面板停靠系统，支持：
- 窗口停靠在其他窗口的上/下/左/右
- 停靠时自动调整大小（平均分配空间）
- 支持多层/多列停靠
- 拖拽时显示停靠预览（虚线/斜线）
- 支持取消停靠（拖出停靠区域）

### 1.2 核心特性
- **输入框窗口特殊处理**：
  - 竖条样式（宽度固定，高度自动）
  - 隐藏提示信息

- **停靠区域检测**：
  - 拖动窗口时检测目标窗口边缘
  - 显示预览效果（虚线框）
  - 显示挤占预览（斜线填充）

- **自动布局调整**：
  - 停靠时平均分配空间
  - 取消停靠时恢复原尺寸
  - 支持多排/多列布局

---

## 2. 核心概念定义

### 2.1 窗口类型
```typescript
type WindowType = 
  | 'chat-input'
  | 'chat-history'
  | 'editor'
  | 'git'
  | 'repository'
  | 'explorer';
```

### 2.2 停靠位置
```typescript
type DockPosition = 
  | 'top'     // 顶部
  | 'bottom'  // 底部
  | 'left'    // 左侧
  | 'right'   // 右侧
  | 'center'; // 独立（未停靠）
```

### 2.3 停靠关系
```typescript
// 停靠节点（单个窗口或停靠组）
interface DockNode {
  id: string;
  type: 'window' | 'group';
  orientation: 'horizontal' | 'vertical'; // 布局方向
  
  // 窗口节点
  windowId?: string;
  
  // 组节点
  children?: DockNode[];
  sizes?: number[]; // 子节点大小比例（0-1）
}

// 停靠容器（一个窗口或一组窗口）
interface DockContainer {
  root: DockNode;
  bounds: { x: number; y: number; width: number; height: number };
}
```

---

## 3. 状态管理设计

### 3.1 Zustand Store 扩展
```typescript
interface AppState {
  // === 停靠状态 ===
  dockNodes: Map<string, DockNode>; // 所有窗口的停靠关系
  dockContainers: DockContainer[]; // 所有停靠容器
  
  // 拖拽状态
  draggingWindowId: string | null;
  dragStartBounds: { x: number; y: number; width: number; height: number } | null;
  dragPosition: { x: number; y: number } | null;
  
  // 预览状态
  previewDock: {
    targetNodeId: string;
    position: DockPosition;
    type: 'dock' | 'squeeze'; // 停靠 vs 挤占
  } | null;
  
  // === 停靠操作 ===
  dockWindow: (sourceId: string, targetId: string, position: DockPosition) => void;
  undockWindow: (windowId: string) => void;
  updateDockSizes: (containerId: string, sizes: number[]) => void;
  
  // === 拖拽操作 ===
  startDrag: (windowId: string, bounds: any) => void;
  updateDrag: (x: number, y: number) => void;
  endDrag: () => void;
}
```

### 3.2 停靠关系数据示例
```typescript
// 示例：两个窗口左右并排
const dockContainer: DockContainer = {
  root: {
    id: 'group1',
    type: 'group',
    orientation: 'horizontal',
    children: [
      { id: 'window1', type: 'window', windowId: 'win1' },
      { id: 'window2', type: 'window', windowId: 'win2' }
    ],
    sizes: [0.5, 0.5] // 各占 50%
  },
  bounds: { x: 100, y: 100, width: 600, height: 400 }
};
```

---

## 4. 停靠位置检测算法

### 4.1 检测区域划分
```
           Top (50px)
    ┌───────────────────┐
    │  ┌─────────────┐  │
Left│  │   Target    │  │ Right
(50px)│  │   Window    │  │ (50px)
    │  └─────────────┘  │
    └───────────────────┘
         Bottom (50px)
```

### 4.2 检测逻辑
```typescript
function detectDockPosition(
  dragBounds: { x: number; y: number; width: number; height: number },
  targetBounds: { x: number; y: number; width: number; height: number },
  threshold = 50 // 检测阈值（像素）
): {
  position: DockPosition;
  type: 'dock' | 'squeeze';
  bounds: { x: number; y: number; width: number; height: number };
} | null {
  const dragCenterX = dragBounds.x + dragBounds.width / 2;
  const dragCenterY = dragBounds.y + dragBounds.height / 2;
  
  const targetLeft = targetBounds.x;
  const targetRight = targetBounds.x + targetBounds.width;
  const targetTop = targetBounds.y;
  const targetBottom = targetBounds.y + targetBounds.height;
  
  // 检测顶部
  if (dragCenterY < targetTop + threshold) {
    return {
      position: 'top',
      type: 'squeeze',
      bounds: { x: targetBounds.x, y: targetBounds.y, width: targetBounds.width, height: targetBounds.height / 2 }
    };
  }
  
  // 检测底部
  if (dragCenterY > targetBottom - threshold) {
    return {
      position: 'bottom',
      type: 'squeeze',
      bounds: { x: targetBounds.x, y: targetBounds.y + targetBounds.height / 2, width: targetBounds.width, height: targetBounds.height / 2 }
    };
  }
  
  // 检测左侧
  if (dragCenterX < targetLeft + threshold) {
    return {
      position: 'left',
      type: 'squeeze',
      bounds: { x: targetBounds.x, y: targetBounds.y, width: targetBounds.width / 2, height: targetBounds.height }
    };
  }
  
  // 检测右侧
  if (dragCenterX > targetRight - threshold) {
    return {
      position: 'right',
      type: 'squeeze',
      bounds: { x: targetBounds.x + targetBounds.width / 2, y: targetBounds.y, width: targetBounds.width / 2, height: targetBounds.height }
    };
  }
  
  return null; // 没有检测到停靠位置
}
```

---

## 5. 停靠预览系统

### 5.1 预览样式
```typescript
// 预览层组件
function DockPreview() {
  const { previewDock } = useAppStore();
  
  if (!previewDock) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {previewDock.type === 'dock' && (
        <div 
          className="absolute border-2 border-dashed border-blue-500"
          style={{
            left: previewDock.bounds.x,
            top: previewDock.bounds.y,
            width: previewDock.bounds.width,
            height: previewDock.bounds.height
          }}
        />
      )}
      
      {previewDock.type === 'squeeze' && (
        <div 
          className="absolute"
          style={{
            left: previewDock.bounds.x,
            top: previewDock.bounds.y,
            width: previewDock.bounds.width,
            height: previewDock.bounds.height,
            background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,120,212,0.2) 10px, rgba(0,120,212,0.2) 20px)'
          }}
        />
      )}
    </div>
  );
}
```

### 5.2 停靠预览效果
- **停靠预览**：蓝色虚线框（2px dashed）
- **挤占预览**：蓝色斜线填充（45度斜纹）

---

## 6. 停靠与挤占逻辑

### 6.1 停靠（Dock）
```typescript
function dockWindow(
  sourceId: string,
  targetId: string,
  position: DockPosition
) {
  // 创建新的停靠组
  const newGroup: DockNode = {
    id: generateId(),
    type: 'group',
    orientation: position === 'left' || position === 'right' ? 'horizontal' : 'vertical',
    children: [
      { id: sourceId, type: 'window', windowId: sourceId },
      { id: targetId, type: 'window', windowId: targetId }
    ],
    sizes: [0.5, 0.5] // 初始平均分配
  };
  
  // 替换原来的窗口为新组
  setDockNodes(prev => {
    const newNodes = new Map(prev);
    newNodes.set(newGroup.id, newGroup);
    newNodes.delete(sourceId);
    newNodes.delete(targetId);
    return newNodes;
  });
}
```

### 6.2 挤占（Squeeze）
```typescript
function squeezeDock(
  sourceId: string,
  targetGroupId: string,
  position: DockPosition
) {
  const targetGroup = dockNodes.get(targetGroupId);
  if (!targetGroup || targetGroup.type !== 'group') return;
  
  // 插入到目标组
  const newChildren = [...targetGroup.children];
  const insertIndex = position === 'top' || position === 'left' ? 0 : newChildren.length;
  
  newChildren.splice(insertIndex, 0, {
    id: sourceId,
    type: 'window',
    windowId: sourceId
  });
  
  // 重新平均分配尺寸
  const newSize = 1 / newChildren.length;
  const newSizes = Array(newChildren.length).fill(newSize);
  
  // 更新组
  setDockNodes(prev => {
    const newNodes = new Map(prev);
    newNodes.set(targetGroupId, {
      ...targetGroup,
      children: newChildren,
      sizes: newSizes
    });
    newNodes.delete(sourceId);
    return newNodes;
  });
}
```

### 6.3 取消停靠（Undock）
```typescript
function undockWindow(windowId: string) {
  // 查找包含该窗口的组
  for (const [nodeId, node] of dockNodes) {
    if (node.type === 'group') {
      const childIndex = node.children?.findIndex(
        c => c.type === 'window' && c.windowId === windowId
      );
      
      if (childIndex !== undefined && childIndex >= 0) {
        // 从组中移除
        const newChildren = [...node.children!];
        newChildren.splice(childIndex, 1);
        
        if (newChildren.length === 1) {
          // 只剩一个窗口，组解散
          setDockNodes(prev => {
            const newNodes = new Map(prev);
            newNodes.set(newChildren[0].id, newChildren[0]);
            newNodes.delete(nodeId);
            newNodes.delete(windowId);
            return newNodes;
          });
        } else {
          // 重新平均分配尺寸
          const newSize = 1 / newChildren.length;
          const newSizes = Array(newChildren.length).fill(newSize);
          
          setDockNodes(prev => {
            const newNodes = new Map(prev);
            newNodes.set(nodeId, {
              ...node,
              children: newChildren,
              sizes: newSizes
            });
            newNodes.delete(windowId);
            return newNodes;
          });
        }
        
        break;
      }
    }
  }
}
```

---

## 7. 输入框窗口特殊处理

### 7.1 竖条样式
```typescript
interface InputPanelOptions {
  isDocked: boolean;
  dockPosition?: DockPosition;
}

function ChatInputPanel({ isDocked, dockPosition }: InputPanelOptions) {
  // 竖条模式时隐藏提示
  const hidePlaceholder = isDocked && (dockPosition === 'left' || dockPosition === 'right');
  
  return (
    <div className="flex flex-col h-full w-full">
      {/* 输入区域 */}
      <div className="flex-1 relative">
        <textarea
          placeholder={hidePlaceholder ? "" : "输入消息..."}
          className="flex-1 w-full h-full p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm resize-none"
        />
        
        {/* 右下角按钮组 */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1">
          {/* 按钮... */}
        </div>
      </div>
    </div>
  );
}
```

---

## 8. 拖拽流程

### 8.1 开始拖拽
```typescript
function startDrag(windowId: string, bounds: any) {
  setDraggingWindowId(windowId);
  setDragStartBounds(bounds);
  
  // 检查是否是停靠状态
  const isDocked = checkIsDocked(windowId);
  if (isDocked) {
    undockWindow(windowId);
  }
}
```

### 8.2 拖拽中（更新预览）
```typescript
function updateDrag(x: number, y: number) {
  setDragPosition({ x, y });
  
  // 检测停靠位置
  const dragBounds = calculateDragBounds(x, y);
  let foundPreview = null;
  
  for (const window of otherWindows) {
    const preview = detectDockPosition(dragBounds, window.bounds);
    if (preview) {
      foundPreview = { targetNodeId: window.id, ...preview };
      break;
    }
  }
  
  setPreviewDock(foundPreview);
}
```

### 8.3 结束拖拽（执行停靠）
```typescript
function endDrag() {
  if (previewDock) {
    // 执行停靠
    dockWindow(
      draggingWindowId!,
      previewDock.targetNodeId,
      previewDock.position
    );
  } else {
    // 独立窗口
    updateWindowPosition(draggingWindowId!, dragPosition!);
  }
  
  // 清除状态
  setDraggingWindowId(null);
  setDragStartBounds(null);
  setDragPosition(null);
  setPreviewDock(null);
}
```

---

## 9. 实现步骤

### 阶段 1：基础结构（1-2天）
1. 扩展 Zustand Store，添加停靠相关状态
2. 定义 DockNode/DockContainer 类型
3. 实现基础的窗口创建和显示

### 阶段 2：停靠检测（1-2天）
1. 实现 detectDockPosition 函数
2. 添加预览层组件
3. 实现虚线和斜线样式

### 阶段 3：停靠逻辑（2-3天）
1. 实现 dockWindow 函数（创建组）
2. 实现 squeezeDock 函数（插入组）
3. 实现 undockWindow 函数（退出组）
4. 实现尺寸自动平均分配

### 阶段 4：输入框特殊处理（1天）
1. 竖条样式实现
2. 隐藏提示逻辑
3. 停靠时自动调整宽度

### 阶段 5：集成测试（1天）
1. 完整流程测试
2. 边界情况处理
3. 性能优化

---

## 10. 关键技术点

### 10.1 性能优化
- 使用 requestAnimationFrame 节流拖拽更新
- 虚拟列表处理大量窗口
- 避免频繁的 DOM 重排

### 10.2 状态持久化
- 停靠关系存储到 localStorage
- 窗口大小比例持久化
- 应用启动时恢复布局

### 10.3 动画效果
- 平滑的停靠过渡动画
- 预览显示/隐藏动画
- 窗口移动动画

---

## 11. 文件结构
```
src/
├── store/
│   └── index.ts          # 扩展停靠状态
├── components/
│   ├── layout/
│   │   ├── DockPreview.tsx  # 停靠预览组件
│   │   └── DockManager.tsx  # 停靠管理器
│   ├── chat/
│   │   └── ChatInputPanel.tsx  # 输入框（竖条模式）
│   └── ...
├── utils/
│   ├── dockDetection.ts  # 停靠位置检测
│   ├── dockOperations.ts  # 停靠操作函数
│   └── types.ts          # 停靠相关类型
```

---

## 12. 总结

这个实现方案提供了：
- ✅ 完整的停靠系统架构
- ✅ 类似 PS/Unity 的停靠逻辑
- ✅ 停靠预览和挤占预览
- ✅ 输入框特殊处理
- ✅ 完整的实现步骤和技术要点

可以直接按照本方案逐步实现！
