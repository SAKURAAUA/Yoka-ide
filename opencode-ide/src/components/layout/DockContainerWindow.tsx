'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAppStore } from '@/store';
import { SplitPane } from './SplitPane';
import { ChatInputPanel } from '@/components/chat/ChatInputPanel';
import { ChatHistoryPanel } from '@/components/chat/ChatHistoryPanel';
import { ChatWorkspacePanel } from '@/components/chat/ChatWorkspacePanel';
import { EditorPanel } from '@/components/editor';
import { GitPanel } from '@/components/git';
import { RepositoryPanel } from '@/components/repository';
import { ExplorerPanel } from '@/components/explorer';
import { AILogPanel } from '@/components/ai';
import { ProgressRing, DragMode } from './ProgressRing';
import { X, Pin } from 'lucide-react';

// ============================================
// 树形分栏数据结构
// ============================================

interface WindowNode {
  type: 'window';
  windowType: string;
  size: { width: number; height: number };
}

interface SplitNode {
  type: 'split';
  direction: 'horizontal' | 'vertical';
  children: DockNode[];
}

type DockNode = WindowNode | SplitNode;

interface DockedWindow {
  id: string;
  type: string;
  dockPosition: 'left' | 'right' | 'top' | 'bottom';
  size?: { width: number; height: number };
}

type InteractionMode = 'normal' | 'dragging' | 'selecting' | 'opacity-slider' | 'canceled';

const STAGE_0_DURATION = 700;
const STAGE_1_DURATION = 1500;
const DRAG_THRESHOLD = 5;
const PROGRESS_RING_RADIUS = 60;
const EDGE_THRESHOLD = 30;

// 解析树形结构
function parseDockTree(typeStr: string): DockNode | null {
  if (!typeStr || !typeStr.startsWith('dock-tree:')) {
    console.log('[parseDockTree] Not a dock-tree format:', typeStr?.substring(0, 50));
    return null;
  }
  try {
    const base64 = typeStr.substring('dock-tree:'.length);
    console.log('[parseDockTree] Decoding base64:', base64.substring(0, 50) + '...');
    const json = atob(base64);
    console.log('[parseDockTree] Decoded JSON:', json);
    const tree = JSON.parse(json);
    console.log('[parseDockTree] Parsed tree:', tree);
    return tree;
  } catch (e) {
    console.error('[parseDockTree] Failed to parse dock tree:', e, 'Input:', typeStr?.substring(0, 100));
    return null;
  }
}

// 计算树的尺寸
function calculateTreeSize(node: DockNode): { width: number; height: number } {
  if (node.type === 'window') {
    return { ...node.size };
  }
  
  if (node.type === 'split') {
    let totalWidth = 0;
    let totalHeight = 0;
    
    for (const child of node.children) {
      const childSize = calculateTreeSize(child);
      if (node.direction === 'horizontal') {
        totalWidth += childSize.width;
        totalHeight = Math.max(totalHeight, childSize.height);
      } else {
        totalWidth = Math.max(totalWidth, childSize.width);
        totalHeight += childSize.height;
      }
    }
    
    return { width: totalWidth || 500, height: totalHeight || 400 };
  }
  
  return { width: 500, height: 400 };
}

// 计算分割比例
function calculateSplitRatio(node: SplitNode): number[] {
  const sizes = node.children.map(child => {
    const size = calculateTreeSize(child);
    return node.direction === 'horizontal' ? size.width : size.height;
  });
  
  const total = sizes.reduce((a, b) => a + b, 0);
  if (total === 0) return sizes.map(() => 1 / sizes.length);
  
  return sizes.map(s => s / total);
}

// 从树中提取所有窗口（用于兼容旧的分离逻辑）
function extractWindowsFromTree(node: DockNode, position: 'left' | 'right' | 'top' | 'bottom' = 'left'): DockedWindow[] {
  if (node.type === 'window') {
    return [{ id: `win-${node.windowType}`, type: node.windowType, dockPosition: position, size: node.size }];
  }
  
  if (node.type === 'split') {
    const windows: DockedWindow[] = [];
    node.children.forEach((child, index) => {
      let pos: 'left' | 'right' | 'top' | 'bottom';
      if (node.direction === 'horizontal') {
        pos = index === 0 ? 'left' : 'right';
      } else {
        pos = index === 0 ? 'top' : 'bottom';
      }
      windows.push(...extractWindowsFromTree(child, pos));
    });
    return windows;
  }
  
  return [];
}

// 获取第一个窗口类型（用于分离）
function getFirstWindowType(node: DockNode): string | null {
  if (node.type === 'window') {
    return node.windowType;
  }
  if (node.type === 'split' && node.children.length > 0) {
    return getFirstWindowType(node.children[0]);
  }
  return null;
}

export function DockContainerWindow() {
  const [isHovering, setIsHovering] = useState(false);
  const [dockTree, setDockTree] = useState<DockNode | null>(null);
  const [containerId, setContainerId] = useState<string>('');
  
  // 长按交互状态
  const [isPressing, setIsPressing] = useState(false);
  const [pressProgress, setPressProgress] = useState(0);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('normal');
  const [opacityValue, setOpacityValue] = useState(100);
  const [showSlider, setShowSlider] = useState(false);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
  const [isAlwaysTransparent, setIsAlwaysTransparent] = useState(false); // 始终虚化状态
  const [ringPosition, setRingPosition] = useState({ x: 0, y: 0 });
  const [dragMode, setDragMode] = useState<DragMode>('whole'); // 拖移模式：整体/局部
  
  // 分离预览状态
  const [separatingPosition, setSeparatingPosition] = useState<'left' | 'right' | 'top' | 'bottom' | null>(null);
  const [dragWindowBounds, setDragWindowBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  
  // Refs
  const modeRef = useRef<InteractionMode>('normal');
  const pressProgressRef = useRef(0); // 用于在 handleContextMenu 中获取最新进度
  const pressStartRef = useRef({ x: 0, y: 0 });
  const startTimeRef = useRef<number>(0);
  const originalOpacityRef = useRef(1);
  const opacityValueRef = useRef(100);
  const isEdgeAreaRef = useRef(false);
  const dragModeRef = useRef<DragMode>('whole');
  const windowPositionRef = useRef({ x: 0, y: 0 });
  const windowSizeRef = useRef({ width: 0, height: 0 });
  const mouseStartRef = useRef({ x: 0, y: 0 });
  const hasEnteredStage2Ref = useRef(false);
  const localWindowTypeRef = useRef<string>('');
  const localWindowPositionRef = useRef<'left' | 'right' | 'top' | 'bottom'>('left');
  const hasStartedDragRef = useRef(false);
  const lastDragPositionRef = useRef({ x: 0, y: 0 });
  const isAlwaysOnTopRef = useRef(false); // 用于在 handleContextMenu 中获取最新值
  
  // 从树中提取的窗口列表（用于兼容旧逻辑）
  const windows = useMemo(() => {
    if (!dockTree) return [];
    return extractWindowsFromTree(dockTree);
  }, [dockTree]);
  
  // 根节点方向
  const direction = useMemo(() => {
    if (dockTree?.type === 'split') {
      return dockTree.direction;
    }
    return 'horizontal';
  }, [dockTree]);
  
  useEffect(() => {
    modeRef.current = interactionMode;
  }, [interactionMode]);
  
  useEffect(() => {
    opacityValueRef.current = opacityValue;
  }, [opacityValue]);
  
  useEffect(() => {
    pressProgressRef.current = pressProgress;
  }, [pressProgress]);
  
  useEffect(() => {
    isAlwaysOnTopRef.current = isAlwaysOnTop;
  }, [isAlwaysOnTop]);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const type = window.electronAPI.app.getWindowType();
      const id = window.electronAPI.app.getWindowId();
      setContainerId(id);
      
      console.log('[DockContainer] Window type:', type);
      
      // 尝试解析新格式 (dock-tree:)
      const tree = parseDockTree(type);
      if (tree) {
        console.log('[DockContainer] Parsed dock tree:', tree);
        setDockTree(tree);
      } else {
        console.log('[DockContainer] Failed to parse dock tree, type was:', type);
      }
      
      // 监听树结构更新事件
      const handleTreeUpdated = (data: { tree: any; type: string }) => {
        console.log('[DockContainer] Tree updated:', data.tree);
        setDockTree(data.tree);
      };
      
      window.electronAPI.dock.onTreeUpdated(handleTreeUpdated);
    }
  }, []);
  
  // Alt 键穿透窗口功能 - 由主进程全局钩子控制
  useEffect(() => {
    if (!containerId || !window.electronAPI) return;
    
    // 监听主进程的穿透状态通知（仅用于 UI 更新，穿透由主进程直接设置）
    const handleAltStateChanged = (data: { pressed: boolean; cancelOthers?: boolean; suspended?: boolean }) => {
      console.log('[Alt] State changed:', data);
      // 主进程已经直接设置了窗口穿透，这里不需要再调用 setClickThrough
    };
    
    window.electronAPI.alt.onStateChanged(handleAltStateChanged);
    
    return () => {
      // 恢复状态
      window.electronAPI?.window.setClickThrough(containerId, false, opacityValueRef.current / 100);
    };
  }, [containerId]);
  
  // 监听始终虚化状态变化
  useEffect(() => {
    if (!containerId || !window.electronAPI) return;
    
    const handleAlwaysTransparentChanged = (data: { enabled: boolean }) => {
      console.log('[Alt] Always transparent changed:', data);
      setIsAlwaysTransparent(data.enabled);
    };
    
    window.electronAPI.alt.onAlwaysTransparentChanged(handleAlwaysTransparentChanged);
    
    // 获取初始状态
    window.electronAPI.alt.getAlwaysTransparent(containerId).then((result) => {
      if (result.alwaysTransparent) {
        setIsAlwaysTransparent(true);
      }
    }).catch(console.error);
    
    return () => {
      window.electronAPI?.removeAllListeners('alt:alwaysTransparentChanged');
    };
  }, [containerId]);
  
  // 长按事件处理
  useEffect(() => {
    let isMouseDown = false;
    let hasMoved = false;
    let hasStoppedProgress = false;
    
    const handleMouseMove = async (e: MouseEvent) => {
      if (!isMouseDown) return;
      
      const dx = e.clientX - pressStartRef.current.x;
      const dy = e.clientY - pressStartRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > DRAG_THRESHOLD) {
        hasMoved = true;
      }
      
      const mode = modeRef.current;
      const relX = e.clientX - pressStartRef.current.x;
      const relY = e.clientY - pressStartRef.current.y;
      
      // 阶段0移动取消
      if (mode === 'normal' && hasMoved) {
        if ((window as any).progressTimer) {
          clearInterval((window as any).progressTimer);
        }
        setIsPressing(false);
        setPressProgress(0);
        modeRef.current = 'canceled';
        return;
      }
      
      // 阶段1: 拖移 - 区分边缘区域和中心区域的不同行为
      if (mode === 'dragging' && hasMoved) {
        // 第一次拖移时停止进度环
        if (!hasStoppedProgress) {
          hasStoppedProgress = true;
          if ((window as any).progressTimer) {
            clearInterval((window as any).progressTimer);
          }
          setIsPressing(false);
          setPressProgress(0);
        }
        
        if (containerId && window.electronAPI) {
          const moveX = e.screenX - mouseStartRef.current.x;
          const moveY = e.screenY - mouseStartRef.current.y;
          const newX = windowPositionRef.current.x + moveX;
          const newY = windowPositionRef.current.y + moveY;
          
          // 记录拖移位置（用于松开时分离）
          lastDragPositionRef.current = { x: newX, y: newY };
          
          // 开始拖移时隐藏模式切换预览
          if (!hasStartedDragRef.current && window.electronAPI?.modeSwitchPreview) {
            window.electronAPI.modeSwitchPreview.hide();
          }
          
          // ===== 整体拖移模式：拖移整个容器窗口 =====
          if (dragModeRef.current === 'whole') {
            window.electronAPI.window.move(containerId, Math.round(newX), Math.round(newY));
            
            // 停靠检测
            const dragBounds = {
              x: newX,
              y: newY,
              width: windowSizeRef.current.width,
              height: windowSizeRef.current.height
            };
            
            // 首次调用 startDrag
            if (!hasStartedDragRef.current) {
              hasStartedDragRef.current = true;
              try {
                await window.electronAPI.dock.startDrag(containerId, dragBounds);
              } catch (err) {
                console.error('dock.startDrag failed:', err);
              }
            }
            
            // 定期更新 dock.move
            try {
              await window.electronAPI.dock.move(
                containerId, 
                e.screenX, 
                e.screenY, 
                dragBounds,
                { width: windowSizeRef.current.width, height: windowSizeRef.current.height }
              );
            } catch (err) {
              console.error('dock.move failed:', err);
            }
          } 
          // ===== 局部拖移模式：局部窗口分离模式 =====
          else {
            // 显示分离预览状态（虚化层）
            setSeparatingPosition(localWindowPositionRef.current);
            
            // 计算分离窗口的尺寸
            const halfWidth = windowSizeRef.current.width / 2;
            const halfHeight = windowSizeRef.current.height / 2;
            
            // 设置分离窗口预览的尺寸
            let sepWidth, sepHeight;
            
            if (direction === 'horizontal') {
              sepWidth = halfWidth;
              sepHeight = windowSizeRef.current.height;
            } else {
              sepWidth = windowSizeRef.current.width;
              sepHeight = halfHeight;
            }
            
            // 绿色跟随预览（分离时只需要绿色跟随预览，不需要蓝色虚线框）
            const mouseScreenX = e.screenX;
            const mouseScreenY = e.screenY;
            
            // 计算跟随窗口的位置（居中于鼠标，屏幕坐标）
            const followX = mouseScreenX - sepWidth / 2;
            const followY = mouseScreenY - sepHeight / 2;
            
            // 使用独立的透明窗口显示绿色分离预览
            if (window.electronAPI?.separatePreview) {
              try {
                await window.electronAPI.separatePreview.show({
                  x: followX,
                  y: followY,
                  width: sepWidth,
                  height: sepHeight
                });
              } catch (err) {
                console.error('separatePreview.show failed:', err);
              }
            }
            
            // 停靠检测：使用跟随窗口的边界
            const dragBounds = {
              x: followX,
              y: followY,
              width: sepWidth,
              height: sepHeight
            };
            
            // 首次调用 startDrag
            if (!hasStartedDragRef.current) {
              hasStartedDragRef.current = true;
              try {
                await window.electronAPI.dock.startDrag(containerId, dragBounds);
              } catch (err) {
                console.error('dock.startDrag failed:', err);
              }
            }
            
            // 定期更新 dock.move
            try {
              await window.electronAPI.dock.move(
                containerId, 
                e.screenX, 
                e.screenY, 
                dragBounds,
                { width: sepWidth, height: sepHeight }
              );
            } catch (err) {
              console.error('dock.move failed:', err);
            }
            
             // 注意：半透明跟随窗口的渲染需要在渲染部分添加
             // 这里我们只是计算了位置，实际渲染需要在组件的 return 语句中添加
           }
        }
        return;
      }
      
      // 阶段2: 选择选项
      if (mode === 'selecting' && hasEnteredStage2Ref.current) {
        if (relY > PROGRESS_RING_RADIUS) {
          setInteractionMode('opacity-slider');
          modeRef.current = 'opacity-slider';
          setShowSlider(true);
          originalOpacityRef.current = opacityValueRef.current / 100;
          return;
        }
        if (relY < -PROGRESS_RING_RADIUS) {
          setInteractionMode('canceled');
          modeRef.current = 'canceled';
          return;
        }
        return;
      }
      
      // 透明度滑块
      if (mode === 'opacity-slider') {
        if (relY <= PROGRESS_RING_RADIUS) {
          setInteractionMode('selecting');
          modeRef.current = 'selecting';
          setShowSlider(false);
          setOpacityValue(Math.round(originalOpacityRef.current * 100));
          if (containerId && window.electronAPI) {
            window.electronAPI.window.setOpacity(containerId, originalOpacityRef.current);
          }
          return;
        }
        const sliderHalfWidth = 200;
        const normalizedX = (relX + sliderHalfWidth) / (sliderHalfWidth * 2);
        const clampedX = Math.max(0, Math.min(1, normalizedX));
        const newOpacity = Math.round(clampedX * 100);
        setOpacityValue(newOpacity);
        if (containerId && window.electronAPI) {
          window.electronAPI.window.setOpacity(containerId, newOpacity / 100);
        }
        return;
      }
      
      // 取消模式返回
      if (mode === 'canceled' && hasEnteredStage2Ref.current) {
        if (relY >= -PROGRESS_RING_RADIUS && relY <= PROGRESS_RING_RADIUS) {
          setInteractionMode('selecting');
          modeRef.current = 'selecting';
        }
      }
    };
    
    const handleMouseUp = async () => {
       isMouseDown = false;
       const mode = modeRef.current;
       
       if ((window as any).progressTimer) {
         clearInterval((window as any).progressTimer);
       }
       
        // ===== 阶段1拖移结束：根据拖移模式执行不同逻辑 =====
        if (mode === 'dragging' && hasStartedDragRef.current) {
          // 隐藏所有预览窗口
          if (window.electronAPI?.separatePreview) {
            window.electronAPI.separatePreview.hide();
          }
          if (window.electronAPI?.localPreview) {
            window.electronAPI.localPreview.hide();
          }
          if (window.electronAPI?.modeSwitchPreview) {
            window.electronAPI.modeSwitchPreview.hide();
          }
          
          // ===== 整体拖移模式：执行普通停靠逻辑 =====
          if (dragModeRef.current === 'whole') {
            try {
              await window.electronAPI.dock.endDrag(containerId);
            } catch (err) {
              console.error('dock.endDrag failed:', err);
            }
          }
          // ===== 局部拖移模式：执行停靠或分离逻辑 =====
          else {
           // 调用 dock.endDrag，如果有停靠预览，主进程会执行 performDock
           // 返回 { docked: boolean } 指示是否执行了停靠
           let docked = false;
           try {
             const result = await window.electronAPI.dock.endDrag(containerId);
             docked = result?.docked || false;
           } catch (err) {
             console.error('dock.endDrag failed:', err);
           }
           
           // 如果没有执行停靠，执行分离
           if (!docked && containerId && window.electronAPI) {
             try {
               const windowType = localWindowTypeRef.current as 
                 | 'chat' | 'chat-input' | 'chat-history' | 'editor' | 'git' | 'repository' | 'explorer';
               
               const targetBounds = dragWindowBounds || {
                 x: Math.round(lastDragPositionRef.current.x),
                 y: Math.round(lastDragPositionRef.current.y),
                 width: direction === 'horizontal' 
                   ? windowSizeRef.current.width / 2 
                   : windowSizeRef.current.width,
                 height: direction === 'horizontal'
                   ? windowSizeRef.current.height
                   : windowSizeRef.current.height / 2
               };
               
               await window.electronAPI.window.separateFromContainer(containerId, windowType, targetBounds);
             } catch (err) {
               console.error('Failed to separate window:', err);
             }
           }
         }
       }
      
      // 阶段2顶置
      if (mode === 'selecting' && hasEnteredStage2Ref.current) {
        if (containerId && window.electronAPI) {
          const newPinState = !isAlwaysOnTop;
          await window.electronAPI.window.setAlwaysOnTop(containerId, newPinState);
          setIsAlwaysOnTop(newPinState);
        }
      } else if (mode === 'opacity-slider') {
        setShowSlider(false);
      } else if (mode === 'canceled') {
        if (containerId && window.electronAPI) {
          await window.electronAPI.window.setOpacity(containerId, originalOpacityRef.current);
          setOpacityValue(Math.round(originalOpacityRef.current * 100));
        }
      }
      
        // 重置所有状态
        setIsPressing(false);
        setPressProgress(0);
        setInteractionMode('normal');
        modeRef.current = 'normal';
        setShowSlider(false);
        setSeparatingPosition(null);
        setDragWindowBounds(null);
        // 隐藏所有预览窗口
        if (window.electronAPI?.separatePreview) {
          window.electronAPI.separatePreview.hide();
        }
        if (window.electronAPI?.localPreview) {
          window.electronAPI.localPreview.hide();
        }
        if (window.electronAPI?.modeSwitchPreview) {
          window.electronAPI.modeSwitchPreview.hide();
        }
        hasMoved = false;
        hasStoppedProgress = false;
        hasEnteredStage2Ref.current = false;
        hasStartedDragRef.current = false;
    };
    
    const handleGlobalMouseDown = () => {
      isMouseDown = true;
      hasMoved = false;
      hasStoppedProgress = false;
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousedown', handleGlobalMouseDown);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousedown', handleGlobalMouseDown);
    };
  }, [containerId, isAlwaysOnTop, direction]);
  
  const handleMouseDown = useCallback(async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    
    pressStartRef.current = { x: e.clientX, y: e.clientY };
    mouseStartRef.current = { x: e.screenX, y: e.screenY };
    startTimeRef.current = Date.now();
    setRingPosition({ x: e.clientX, y: e.clientY });
    hasEnteredStage2Ref.current = false;
    hasStartedDragRef.current = false;
    
    // 检测是否在边缘区域
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;
    const isEdge = 
      e.clientX < EDGE_THRESHOLD || 
      e.clientX > winWidth - EDGE_THRESHOLD ||
      e.clientY < EDGE_THRESHOLD || 
      e.clientY > winHeight - EDGE_THRESHOLD;
    isEdgeAreaRef.current = isEdge;
    
    // 中心区域：确定要分离的窗口
    if (!isEdge) {
      const leftWin = windows.find(w => w.dockPosition === 'left' || w.dockPosition === 'top');
      const rightWin = windows.find(w => w.dockPosition === 'right' || w.dockPosition === 'bottom');
      
      if (direction === 'horizontal') {
        const isLeft = e.clientX < winWidth / 2;
        localWindowTypeRef.current = isLeft ? (leftWin?.type || '') : (rightWin?.type || '');
        localWindowPositionRef.current = isLeft ? 'left' : 'right';
      } else {
        const isTop = e.clientY < winHeight / 2;
        localWindowTypeRef.current = isTop ? (leftWin?.type || '') : (rightWin?.type || '');
        localWindowPositionRef.current = isTop ? 'top' : 'bottom';
      }
    }
    
    // 获取窗口位置和大小
    if (containerId && window.electronAPI) {
      try {
        const bounds = await window.electronAPI.window.getBounds(containerId);
        if (bounds) {
          windowPositionRef.current = { x: bounds.x, y: bounds.y };
          windowSizeRef.current = { width: bounds.width, height: bounds.height };
          lastDragPositionRef.current = { x: bounds.x, y: bounds.y };
        }
      } catch (err) {
        console.error('Failed to get window bounds:', err);
      }
    }
    
    setIsPressing(true);
    setPressProgress(0);
    setInteractionMode('normal');
    modeRef.current = 'normal';
    
    // 根据初始位置设置拖移模式
    // 边缘区域默认整体拖移，中心区域默认局部拖移
    const initialDragMode = isEdge ? 'whole' : 'partial';
    setDragMode(initialDragMode);
    dragModeRef.current = initialDragMode;
    
    const startTime = Date.now();
    let hasEnteredStage1 = false;
    let hasEnteredStage2 = false;
    
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / STAGE_1_DURATION, 1);
      setPressProgress(progress);
      
      const currentMode = modeRef.current;
      
      if (elapsed >= STAGE_0_DURATION && !hasEnteredStage1 && currentMode === 'normal') {
        hasEnteredStage1 = true;
        setInteractionMode('dragging');
        modeRef.current = 'dragging';
      }
      
      if (elapsed >= STAGE_1_DURATION && !hasEnteredStage2 && currentMode === 'dragging') {
        hasEnteredStage2 = true;
        hasEnteredStage2Ref.current = true;
        setInteractionMode('selecting');
        modeRef.current = 'selecting';
      }
      
      if (progress >= 1) {
        clearInterval(timer);
      }
    }, 16);
    
    (window as any).progressTimer = timer;
  }, [containerId, windows, direction]);
  
  // 右键处理：alt+右键切换始终虚化，阶段1切换模式并停止进度，拖移中取消拖移
  const handleContextMenu = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Alt+右键：切换始终虚化状态
    if (e.altKey && containerId && window.electronAPI) {
      // 只允许顶置窗口切换始终虚化状态
      if (isAlwaysOnTopRef.current) {
        try {
          const result = await window.electronAPI.alt.toggleAlwaysTransparent(containerId);
          console.log('[Alt] Toggle always transparent:', result);
          
          if (result.success) {
            setIsAlwaysTransparent(result.alwaysTransparent);
          } else if (result.reason === 'not_always_on_top') {
            console.log('[Alt] Window is not always on top, cannot enable always transparent');
          }
        } catch (err) {
          console.error('[Alt] Failed to toggle always transparent:', err);
        }
      }
      return;
    }
    
    const mode = modeRef.current;
    const progress = pressProgressRef.current; // 使用 ref 获取最新进度
    
    console.log('[DockContainer] Right click - mode:', mode, 'progress:', progress, 'hasEnteredStage2:', hasEnteredStage2Ref.current);
    
    // 阶段1（绿色/紫色，0.47 <= progress < 1）且未进入阶段2：切换模式并停止进度
    if (progress >= 0.47 && progress < 1 && !hasEnteredStage2Ref.current) {
      // 停止进度计时器
      if ((window as any).progressTimer) {
        clearInterval((window as any).progressTimer);
      }
      
      // 切换拖移模式
      const newMode = dragModeRef.current === 'whole' ? 'partial' : 'whole';
      setDragMode(newMode);
      dragModeRef.current = newMode;
      console.log('[DockContainer] Toggled drag mode to:', newMode);
      
      // 保持阶段1状态，不再推进进度
      setInteractionMode('dragging');
      modeRef.current = 'dragging';
      return;
    }
    
    // 拖移中（已开始拖移）：右键取消拖移
    if (mode === 'dragging' && hasStartedDragRef.current) {
      console.log('[DockContainer] Canceling drag');
      
      // 停止所有交互
      if ((window as any).progressTimer) {
        clearInterval((window as any).progressTimer);
      }
      
      // 隐藏所有预览
      if (window.electronAPI?.separatePreview) {
        window.electronAPI.separatePreview.hide();
      }
      if (window.electronAPI?.localPreview) {
        window.electronAPI.localPreview.hide();
      }
      if (window.electronAPI?.modeSwitchPreview) {
        window.electronAPI.modeSwitchPreview.hide();
      }
      if (window.electronAPI?.dock) {
        // 通知主进程清除停靠预览
        try {
          await window.electronAPI.dock.endDrag(containerId);
        } catch (err) {}
      }
      
      // 重置所有状态
      setIsPressing(false);
      setPressProgress(0);
      setInteractionMode('normal');
      modeRef.current = 'normal';
      setSeparatingPosition(null);
      setDragWindowBounds(null);
      hasStartedDragRef.current = false;
      
      console.log('[DockContainer] Drag canceled by right-click');
    }
  }, [containerId]);
  
  const handleClose = async () => {
    if (containerId && window.electronAPI) {
      await window.electronAPI.window.close(containerId);
    }
  };
  
  const renderWindow = (type: string, position: 'left' | 'right' | 'top' | 'bottom') => {
    switch (type) {
      case 'chat-input':
        return <ChatWorkspacePanel isDocked={true} dockPosition={position} />;
      case 'chat-history':
        return <ChatWorkspacePanel isDocked={true} dockPosition={position} />;
      case 'chat':
        return <ChatWorkspacePanel isDocked={true} dockPosition={position} />;
      case 'editor':
        return <EditorPanel />;
      case 'git':
        return <GitPanel />;
      case 'repository':
        return <RepositoryPanel />;
      case 'explorer':
        return <ExplorerPanel />;
      case 'logs':
        return <AILogPanel />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-400 bg-white">
            <p>未知窗口: {type}</p>
          </div>
        );
    }
  };
  
  // 递归渲染树形分栏
  const renderTreeNode = (node: DockNode, index: number = 0): React.ReactNode => {
    if (node.type === 'window') {
      // 渲染窗口
      const pos = index === 0 ? 'left' : 'right';
      return renderWindow(node.windowType, pos);
    }
    
    if (node.type === 'split') {
      // 计算分割比例
      const ratios = calculateSplitRatio(node);
      
      // 渲染分栏
      if (node.children.length === 2) {
        const initialSplit = ratios[0];
        return (
          <SplitPane
            left={renderTreeNode(node.children[0], 0)}
            right={renderTreeNode(node.children[1], 1)}
            direction={node.direction}
            initialSplit={initialSplit}
            minSize={0.15}
          />
        );
      }
      
      // 如果有超过2个子节点，递归处理
      if (node.children.length > 2) {
        const [first, ...rest] = node.children;
        const restNode: SplitNode = { ...node, children: rest };
        const firstRatio = ratios[0];
        return (
          <SplitPane
            left={renderTreeNode(first, 0)}
            right={renderTreeNode(restNode, 1)}
            direction={node.direction}
            initialSplit={firstRatio}
            minSize={0.15}
          />
        );
      }
      
      // 单个子节点
      if (node.children.length === 1) {
        return renderTreeNode(node.children[0], 0);
      }
    }
    
    return (
      <div className="flex items-center justify-center h-full text-gray-400 bg-white">
        <p>空分栏</p>
      </div>
    );
  };
  
  // 检查树是否有效
  if (!dockTree) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <p className="text-gray-400">停靠容器加载中...</p>
      </div>
    );
  }
  
  return (
    <div 
      className="h-screen w-screen bg-white overflow-hidden relative"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
    >
      {/* 递归渲染树形分栏 */}
      {renderTreeNode(dockTree)}
      
      {/* 分离预览：虚化覆盖层 */}
      {separatingPosition && (
        <>
          {/* 要分离的面板：虚化覆盖 */}
          <div 
            className="fixed bg-gray-200/60 backdrop-blur-sm z-30 pointer-events-none"
            style={
              direction === 'horizontal' 
                ? separatingPosition === 'left'
                  ? { left: 0, top: 0, width: '50%', height: '100%' }
                  : { right: 0, top: 0, width: '50%', height: '100%' }
                : separatingPosition === 'top'
                  ? { left: 0, top: 0, width: '100%', height: '50%' }
                  : { left: 0, bottom: 0, width: '100%', height: '50%' }
            }
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-gray-500 text-sm bg-white/80 px-3 py-1 rounded-full shadow">
                拖移以分离
              </span>
            </div>
          </div>
           
           {/* 蓝色虚线框和绿色分离预览现在使用独立的透明窗口，在窗口外显示 */}
        </>
      )}
      
      {/* Event blocker */}
      {(interactionMode === 'selecting' || interactionMode === 'opacity-slider' || interactionMode === 'canceled') && (
        <div 
          className="fixed inset-0 z-40" 
          style={{ 
            cursor: interactionMode === 'selecting' ? 'default' : 
                    interactionMode === 'opacity-slider' ? 'ew-resize' : 'not-allowed'
          }}
        />
      )}
      
      {/* Progress Ring */}
      <ProgressRing
        isPressing={isPressing}
        pressProgress={pressProgress}
        interactionMode={interactionMode}
        opacityValue={opacityValue}
        showSlider={showSlider}
        position={ringPosition}
        dragMode={dragMode}
      />
      
      {/* 置顶指示器 */}
      {isAlwaysOnTop && !isPressing && (
        <div className="fixed top-2 left-2 pointer-events-none z-30">
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-500 rounded text-xs border border-blue-200">
            <Pin size={12} />
            <span>置顶</span>
          </div>
        </div>
      )}
      
      {/* 始终虚化指示器 */}
      {isAlwaysTransparent && !isPressing && (
        <div className="fixed top-2 left-16 pointer-events-none z-30">
          <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-500 rounded text-xs border border-purple-200">
            <span>始终穿透</span>
            <span className="text-purple-400 ml-1">(Alt+T或点击取消按钮)</span>
          </div>
        </div>
      )}
      
      {/* 关闭按钮 */}
      {isHovering && !isPressing && (
        <button
          className="fixed top-3 right-3 w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-lg z-50"
          onClick={handleClose}
          title="关闭窗口"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
