'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const STAGE_0_DURATION = 700; // 0-0.7s: gray, move cancels
const STAGE_1_DURATION = 1500; // 0.7-1.5s: yellow-green, drag window
const DRAG_THRESHOLD = 5;
const PROGRESS_RING_RADIUS = 60;

export type InteractionMode = 
  | 'normal'      // 阶段0: 灰色进度环，移动取消
  | 'dragging'    // 阶段1: 黄绿色，拖移窗口
  | 'selecting'   // 阶段2: 蓝色，选择选项（顶置/透明度/取消）
  | 'opacity-slider' // 透明度滑块模式
  | 'canceled';   // 已取消

export interface LongPressState {
  isPressing: boolean;
  pressProgress: number;
  interactionMode: InteractionMode;
  opacityValue: number;
  showSlider: boolean;
  isAlwaysOnTop: boolean;
  isDocked: boolean;
  dockPosition: 'left' | 'right' | 'top' | 'bottom' | 'center' | null;
}

export interface LongPressActions {
  handleMouseDown: (e: React.MouseEvent) => void;
  handleClose: () => Promise<void>;
}

export function useLongPressInteraction(
  windowId: string | null,
  windowType: string | null,
  isContainerWindow: boolean
): [LongPressState, LongPressActions] {
  const [isHovering, setIsHovering] = useState(false);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const [pressProgress, setPressProgress] = useState(0);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('normal');
  const [opacityValue, setOpacityValue] = useState(100);
  const [showSlider, setShowSlider] = useState(false);
  const [isDocked, setIsDocked] = useState(false);
  const [dockPosition, setDockPosition] = useState<'left' | 'right' | 'top' | 'bottom' | 'center' | null>(null);
  
  // Refs
  const modeRef = useRef<InteractionMode>('normal');
  const pressStartRef = useRef({ x: 0, y: 0 });
  const windowPositionRef = useRef({ x: 0, y: 0 });
  const windowSizeRef = useRef({ width: 0, height: 0 });
  const mouseStartRef = useRef({ x: 0, y: 0 });
  const startTimeRef = useRef<number>(0);
  const originalOpacityRef = useRef(1);
  const wasPinnedRef = useRef(false);
  const opacityValueRef = useRef(100);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null); // 修复1: 用 ref 存储 timer
  const isMouseDownRef = useRef(false); // 修复2: 用 ref 存储 isMouseDown
  
  useEffect(() => {
    modeRef.current = interactionMode;
  }, [interactionMode]);
  
  useEffect(() => {
    opacityValueRef.current = opacityValue;
  }, [opacityValue]);
  
  // 监听停靠状态变化
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI?.dock) {
      const unsubscribe = window.electronAPI.dock.onStateChange((data: { isDocked: boolean; dockPosition?: string }) => {
        setIsDocked(data.isDocked);
        if (data.dockPosition) {
          setDockPosition(data.dockPosition as 'left' | 'right' | 'top' | 'bottom');
        } else {
          setDockPosition(null);
        }
      });
      return () => {
        if (window.electronAPI?.removeAllListeners) {
          window.electronAPI.removeAllListeners('dock:state');
        }
      };
    }
  }, []);
  
  const handleMouseDown = useCallback(async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    
    // 容器窗口不参与停靠拖拽，但可以有进度环
    if (isContainerWindow && !windowType?.startsWith('dock-container:')) return;
    
    // 记录起始位置
    pressStartRef.current = { x: e.clientX, y: e.clientY };
    mouseStartRef.current = { x: e.screenX, y: e.screenY };
    startTimeRef.current = Date.now();
    
    // 保存当前状态
    wasPinnedRef.current = isAlwaysOnTop;
    if (windowId && window.electronAPI) {
      try {
        const bounds = await window.electronAPI.window.getBounds(windowId);
        if (bounds) {
          windowPositionRef.current = { x: bounds.x, y: bounds.y };
          windowSizeRef.current = { width: bounds.width, height: bounds.height };
        }
      } catch (err) {
        console.error('Failed to get window state:', err);
      }
    }
    
    // 开始长按 - 阶段0
    setIsPressing(true);
    isMouseDownRef.current = true; // 修复2: 设置 isMouseDown 状态
    setPressProgress(0);
    setInteractionMode('normal');
    modeRef.current = 'normal';
    
    // 进度动画
    const startTime = Date.now();
    let hasEnteredStage1 = false;
    let hasEnteredStage2 = false;
    
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / STAGE_1_DURATION, 1);
      setPressProgress(progress);
      
      const currentMode = modeRef.current;
      
      // 0.7s: 进入阶段1（拖移模式）- 只有在还没有移动过的情况下
      if (elapsed >= STAGE_0_DURATION && !hasEnteredStage1 && currentMode === 'normal') {
        hasEnteredStage1 = true;
        setInteractionMode('dragging');
        modeRef.current = 'dragging';
      }
      
      // 1.5s: 进入阶段2（选择模式）
      if (elapsed >= STAGE_1_DURATION && !hasEnteredStage2 && currentMode === 'dragging') {
        hasEnteredStage2 = true;
        setInteractionMode('selecting');
        modeRef.current = 'selecting';
      }
      
      if (progress >= 1) {
        clearInterval(timer);
      }
    }, 16);
    
    progressTimerRef.current = timer;
  }, [isAlwaysOnTop, windowId, windowType, isContainerWindow]);
  
  useEffect(() => {
    let isMouseDown = false;
    let hasMoved = false;
    let hasStoppedProgress = false;
    let hasStartedDockDrag = false;
    let lastDockMoveTime = 0;
    const DOCK_MOVE_THROTTLE = 50;
    
    const handleMouseMove = async (e: MouseEvent) => {
      if (!isMouseDownRef.current) return;
      if (isContainerWindow) {
        // 容器窗口：只处理进度环取消逻辑
        const dx = e.clientX - pressStartRef.current.x;
        const dy = e.clientY - pressStartRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > DRAG_THRESHOLD) {
          hasMoved = true;
        }
        
        const mode = modeRef.current;
        
        // 阶段0移动取消
        if (mode === 'normal' && hasMoved) {
          if (progressTimerRef.current) {
            clearInterval(progressTimerRef.current);
          }
          setIsPressing(false);
          setPressProgress(0);
          modeRef.current = 'canceled';
        }
        return;
      }
      
      const dx = e.clientX - pressStartRef.current.x;
      const dy = e.clientY - pressStartRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > DRAG_THRESHOLD) {
        hasMoved = true;
      }
      
      const mode = modeRef.current;
      const elapsed = Date.now() - startTimeRef.current;
      
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const relX = e.clientX - centerX;
      const relY = e.clientY - centerY;
      
      // 阶段0: 移动取消选择
      if (mode === 'normal' && hasMoved) {
        if (progressTimerRef.current) {
          clearInterval(progressTimerRef.current);
        }
        setIsPressing(false);
        setPressProgress(0);
        modeRef.current = 'canceled';
        return;
      }
      
      // 阶段1: 拖移窗口 + 停靠检测
      if (mode === 'dragging') {
        if (windowId && window.electronAPI && hasMoved) {
          if (!hasStoppedProgress) {
            hasStoppedProgress = true;
            if (progressTimerRef.current) {
              clearInterval(progressTimerRef.current);
            }
            setIsPressing(false);
          }
          
          const moveX = e.screenX - mouseStartRef.current.x;
          const moveY = e.screenY - mouseStartRef.current.y;
          const newX = windowPositionRef.current.x + moveX;
          const newY = windowPositionRef.current.y + moveY;
          
          window.electronAPI.window.move(windowId, Math.round(newX), Math.round(newY));
          
          const dragBounds = {
            x: newX,
            y: newY,
            width: windowSizeRef.current.width,
            height: windowSizeRef.current.height
          };
          
          if (!hasStartedDockDrag) {
            hasStartedDockDrag = true;
            try {
              await window.electronAPI.dock.startDrag(windowId, dragBounds);
            } catch (err) {
              console.error('dock.startDrag failed:', err);
            }
          }
          
          const now = Date.now();
          if (now - lastDockMoveTime >= DOCK_MOVE_THROTTLE) {
            lastDockMoveTime = now;
            try {
              await window.electronAPI.dock.move(
                windowId, 
                e.screenX, 
                e.screenY, 
                dragBounds,
                { width: windowSizeRef.current.width, height: windowSizeRef.current.height }
              );
            } catch (err) {
              console.error('dock.move failed:', err);
            }
          }
        }
        return;
      }
      
      // 阶段2: 选择选项
      if (mode === 'selecting') {
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
      
      // 透明度滑块模式
      if (mode === 'opacity-slider') {
        if (relY <= PROGRESS_RING_RADIUS) {
          setInteractionMode('selecting');
          modeRef.current = 'selecting';
          setShowSlider(false);
          setOpacityValue(Math.round(originalOpacityRef.current * 100));
          if (windowId && window.electronAPI) {
            window.electronAPI.window.setOpacity(windowId, originalOpacityRef.current);
          }
          return;
        }
        
        const sliderHalfWidth = Math.min(centerX - 50, 200);
        const normalizedX = (relX + sliderHalfWidth) / (sliderHalfWidth * 2);
        const clampedX = Math.max(0, Math.min(1, normalizedX));
        const newOpacity = Math.round(clampedX * 100);
        
        setOpacityValue(newOpacity);
        
        if (windowId && window.electronAPI) {
          window.electronAPI.window.setOpacity(windowId, newOpacity / 100);
        }
        return;
      }
      
      // 取消模式
      if (mode === 'canceled') {
        if (relY >= -PROGRESS_RING_RADIUS && relY <= PROGRESS_RING_RADIUS) {
          setInteractionMode('selecting');
          modeRef.current = 'selecting';
        }
        return;
      }
    };
    
    const handleMouseUp = async () => {
      isMouseDownRef.current = false;
      const mode = modeRef.current;
      const elapsed = Date.now() - startTimeRef.current;
      
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
      
      // 只有在阶段2并且按住时间足够长才执行顶置
      if (mode === 'selecting' && elapsed >= STAGE_1_DURATION) {
        if (windowId && window.electronAPI) {
          const newPinState = !isAlwaysOnTop;
          await window.electronAPI.window.setAlwaysOnTop(windowId, newPinState);
          setIsAlwaysOnTop(newPinState);
        }
      } else if (mode === 'opacity-slider') {
        setShowSlider(false);
      } else if (mode === 'canceled') {
        if (windowId && window.electronAPI) {
          await window.electronAPI.window.setOpacity(windowId, originalOpacityRef.current);
          setOpacityValue(Math.round(originalOpacityRef.current * 100));
        }
      } else if (mode === 'dragging' && hasStartedDockDrag) {
        if (windowId && window.electronAPI) {
          try {
            await window.electronAPI.dock.endDrag(windowId);
          } catch (err) {
            console.error('dock.endDrag failed:', err);
          }
        }
      }
      // normal 模式：不做任何操作
      
      // 重置状态
      setIsPressing(false);
      setPressProgress(0);
      setInteractionMode('normal');
      modeRef.current = 'normal';
      setShowSlider(false);
      hasMoved = false;
      hasStoppedProgress = false;
      hasStartedDockDrag = false;
    };
    
    // 修复2: 删除 handleGlobalMouseDown，避免竞态条件
    // isMouseDown 现在只在 handleMouseDown 中设置
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      // 修复1: 清理 progress timer
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [windowId, isAlwaysOnTop, isContainerWindow]);
  
  const handleClose = useCallback(async () => {
    if (windowId && window.electronAPI) {
      await window.electronAPI.window.close(windowId);
    }
  }, [windowId]);
  
  return [
    {
      isPressing,
      pressProgress,
      interactionMode,
      opacityValue,
      showSlider,
      isAlwaysOnTop,
      isDocked,
      dockPosition,
    },
    {
      handleMouseDown,
      handleClose,
    }
  ];
}
