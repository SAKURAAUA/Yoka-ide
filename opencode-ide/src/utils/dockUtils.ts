'use client';

import { DockPosition, DockNode, DockContainer, DockPreview } from '@/types';

const DOCK_THRESHOLD = 50; // 停靠检测阈值（像素）

export function detectDockPosition(
  dragBounds: { x: number; y: number; width: number; height: number },
  targetBounds: { x: number; y: number; width: number; height: number },
  threshold = DOCK_THRESHOLD
): DockPreview | null {
  const dragCenterX = dragBounds.x + dragBounds.width / 2;
  const dragCenterY = dragBounds.y + dragBounds.height / 2;
  
  const targetLeft = targetBounds.x;
  const targetRight = targetBounds.x + targetBounds.width;
  const targetTop = targetBounds.y;
  const targetBottom = targetBounds.y + targetBounds.height;
  
  // 首先检查拖动窗口是否与目标窗口有重叠
  const hasOverlap = 
    dragBounds.x < targetRight &&
    dragBounds.x + dragBounds.width > targetLeft &&
    dragBounds.y < targetBottom &&
    dragBounds.y + dragBounds.height > targetTop;
  
  if (!hasOverlap) {
    return null;
  }
  
  // 计算拖动窗口中心相对于目标窗口的位置
  const relativeX = dragCenterX - targetLeft;
  const relativeY = dragCenterY - targetTop;
  const targetWidth = targetBounds.width;
  const targetHeight = targetBounds.height;
  
  // 检测左边缘
  if (relativeX < threshold) {
    return {
      targetNodeId: '',
      position: 'left',
      type: 'squeeze',
      bounds: { x: targetBounds.x, y: targetBounds.y, width: targetWidth / 2, height: targetHeight }
    };
  }
  
  // 检测右边缘
  if (relativeX > targetWidth - threshold) {
    return {
      targetNodeId: '',
      position: 'right',
      type: 'squeeze',
      bounds: { x: targetBounds.x + targetWidth / 2, y: targetBounds.y, width: targetWidth / 2, height: targetHeight }
    };
  }
  
  // 检测上边缘
  if (relativeY < threshold) {
    return {
      targetNodeId: '',
      position: 'top',
      type: 'squeeze',
      bounds: { x: targetBounds.x, y: targetBounds.y, width: targetWidth, height: targetHeight / 2 }
    };
  }
  
  // 检测下边缘
  if (relativeY > targetHeight - threshold) {
    return {
      targetNodeId: '',
      position: 'bottom',
      type: 'squeeze',
      bounds: { x: targetBounds.x, y: targetBounds.y + targetHeight / 2, width: targetWidth, height: targetHeight / 2 }
    };
  }
  
  return null;
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function createDockNode(windowId: string): DockNode {
  return {
    id: windowId,
    type: 'window',
    windowId
  };
}

export function createDockGroup(
  nodes: DockNode[],
  orientation: 'horizontal' | 'vertical'
): DockNode {
  const groupId = generateId();
  const size = 1 / nodes.length;
  
  return {
    id: groupId,
    type: 'group',
    orientation,
    children: nodes,
    sizes: Array(nodes.length).fill(size)
  };
}
