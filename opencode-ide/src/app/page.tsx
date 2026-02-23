'use client';

import { useAppStore } from '@/store';
import { ActivityBar } from '@/components/layout';
import { DockPreview } from '@/components/layout/DockPreview';
import { DockContainerWindow } from '@/components/layout/DockContainerWindow';
import { ProgressRing } from '@/components/layout/ProgressRing';
import { GearPanel } from '@/components/layout/GearPanel';
import { HorizontalTrayPopup } from '@/components/layout/HorizontalTrayPopup';
import { VerticalTrayPopup } from '@/components/layout/VerticalTrayPopup';
import { ChatPanel } from '@/components/chat';
import { ChatInputPanel } from '@/components/chat/ChatInputPanel';
import { ChatHistoryPanel } from '@/components/chat/ChatHistoryPanel';
import { ChatWorkspacePanel } from '@/components/chat/ChatWorkspacePanel';
import { ConversationListMenu } from '@/components/chat/ConversationListMenu';
import { EditorPanel } from '@/components/editor';
import { RepositoryPanel } from '@/components/repository';
import { GitPanel } from '@/components/git';
import { ExplorerPanel } from '@/components/explorer';
import { ServerManagerPanel } from '@/components/ai';
import { AILogPanel } from '@/components/ai';
import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Pin } from 'lucide-react';
import { detectDockPosition } from '@/utils/dockUtils';

function ActivityBarWindow() {
  const refreshBackendStatus = useAppStore((state) => state.refreshBackendStatus);

  useEffect(() => {
    refreshBackendStatus();
  }, [refreshBackendStatus]);

  useEffect(() => {
    const cleanupLegacyChatWindows = async () => {
      if (!window.electronAPI?.dock || !window.electronAPI?.window) return;

      try {
        const all = await window.electronAPI.dock.getAllWindows();
        const legacy = (all || []).filter(
          (w) => w.type === 'chat-input' || w.type === 'chat-history'
        );

        await Promise.all(
          legacy.map(async (w) => {
            try {
              await window.electronAPI.window.close(w.id);
            } catch {
            }
          })
        );
      } catch {
      }
    };

    cleanupLegacyChatWindows();
  }, []);

  return (
    <div className="h-screen w-screen bg-white">
      <ActivityBar />
    </div>
  );
}

const STAGE_0_DURATION = 700; // 0-0.7s: gray, move cancels selection
const STAGE_1_DURATION = 1500; // 0.7-1.5s: yellow-green, move triggers window drag
// STAGE_2: 1.5s+: blue, no drag, options: pin/opacity/cancel
const DRAG_THRESHOLD = 5;
const PROGRESS_RING_RADIUS = 60; // 进度环半径（像素）

type InteractionMode = 
  | 'normal'      // 阶段0: 灰色进度环，移动取消
  | 'dragging'    // 阶段1: 黄绿色，拖移窗口
  | 'selecting'   // 阶段2: 蓝色，选择选项（顶置/透明度/取消）
  | 'opacity-slider' // 透明度滑块模式
  | 'canceled';   // 已取消

function FloatingWindowContent() {
  const [windowType, setWindowType] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        return window.electronAPI.app.getWindowType();
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isHovering, setIsHovering] = useState(false);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
  const [isAlwaysTransparent, setIsAlwaysTransparent] = useState(false); // 始终虚化状态
  const [isPressing, setIsPressing] = useState(false);
  const [pressProgress, setPressProgress] = useState(0);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('normal');
  const [opacityValue, setOpacityValue] = useState(100);
  const [showSlider, setShowSlider] = useState(false);
  const [ringPosition, setRingPosition] = useState({ x: 0, y: 0 }); // 进度环位置（鼠标按下位置）
  
  // Refs for interaction state
  const modeRef = useRef<InteractionMode>('normal');
  const pressStartRef = useRef({ x: 0, y: 0 });
  const windowPositionRef = useRef({ x: 0, y: 0 });
  const windowSizeRef = useRef({ width: 0, height: 0 });
  const mouseStartRef = useRef({ x: 0, y: 0 });
  const startTimeRef = useRef<number>(0);
  const originalOpacityRef = useRef(1);
  const wasPinnedRef = useRef(false);
  const opacityValueRef = useRef(100); // 用于事件处理中读取最新值
  const isAlwaysOnTopRef = useRef(false); // 用于在 handleContextMenu 中获取最新值
  
  useEffect(() => {
    modeRef.current = interactionMode;
  }, [interactionMode]);
  
  useEffect(() => {
    opacityValueRef.current = opacityValue;
  }, [opacityValue]);
  
  useEffect(() => {
    isAlwaysOnTopRef.current = isAlwaysOnTop;
  }, [isAlwaysOnTop]);
  
  const [isDocked, setIsDocked] = useState(false);
  const [dockPosition, setDockPosition] = useState<'left' | 'right' | 'top' | 'bottom' | 'center' | null>(null);
  
  const getWindowId = () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      return window.electronAPI.app.getWindowId();
    }
    return null;
  };
  
  // 监听停靠状态变化
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI?.dock) {
      const unsubscribe = window.electronAPI.dock.onStateChange((data: { isDocked: boolean; dockPosition?: string; dockGroupId?: string }) => {
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
  
  // Alt 键穿透窗口功能 - 由主进程全局钩子控制
  useEffect(() => {
    const windowId = getWindowId();
    if (!windowId || !window.electronAPI) return;
    
    // 监听主进程的穿透状态通知（仅用于 UI 更新，穿透由主进程直接设置）
    const handleAltStateChanged = (data: { pressed: boolean; cancelOthers?: boolean; suspended?: boolean }) => {
      console.log('[Alt] State changed:', data);
      // 主进程已经直接设置了窗口穿透，这里不需要再调用 setClickThrough
    };
    
    window.electronAPI.alt.onStateChanged(handleAltStateChanged);
    
    return () => {
      // 恢复状态
      window.electronAPI?.window.setClickThrough(windowId, false, opacityValueRef.current / 100);
    };
  }, []);
  
  // 监听始终虚化状态变化
  useEffect(() => {
    const windowId = getWindowId();
    if (!windowId || !window.electronAPI) return;
    
    const handleAlwaysTransparentChanged = (data: { enabled: boolean }) => {
      console.log('[Alt] Always transparent changed:', data);
      setIsAlwaysTransparent(data.enabled);
    };
    
    window.electronAPI.alt.onAlwaysTransparentChanged(handleAlwaysTransparentChanged);
    
    // 获取初始状态
    window.electronAPI.alt.getAlwaysTransparent(windowId).then((result) => {
      if (result.alwaysTransparent) {
        setIsAlwaysTransparent(true);
      }
    }).catch(console.error);
    
    return () => {
      window.electronAPI?.removeAllListeners('alt:alwaysTransparentChanged');
    };
  }, []);
  
  // 检查点击目标是否为交互元素（不启动进度环）
  // 阶段0明确为：文件拖拽、搜索框文本编辑等常规操作
  const isInteractiveElement = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    // 不启动进度环的元素
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return true;
    if (tagName === 'button' || tagName === 'a') return true;
    if (target.closest('button, a, input, textarea, select, [role="button"]')) return true;
    // 文件树项等交互元素（阶段0：文件拖拽不启动进度环）
    if (target.closest('[data-file-item], [data-tree-item], [draggable]')) return true;
    // 搜索框（阶段0：搜索框输入不启动进度环）
    if (target.closest('[data-search-input]')) return true;
    return false;
  };
  
  const handleMouseDown = useCallback(async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    
    // 容器窗口不参与停靠拖拽
    if (windowType?.startsWith('dock-container:') || windowType?.startsWith('dock-tree:')) return;
    
    // 点击交互元素不启动进度环
    if (isInteractiveElement(e)) return;
    
    // 记录起始位置
    pressStartRef.current = { x: e.clientX, y: e.clientY };
    mouseStartRef.current = { x: e.screenX, y: e.screenY };
    startTimeRef.current = Date.now();
    setRingPosition({ x: e.clientX, y: e.clientY }); // 设置进度环位置
    
    // 保存当前状态
    wasPinnedRef.current = isAlwaysOnTop;
    const windowId = getWindowId();
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
    
    (window as any).progressTimer = timer;
  }, [isAlwaysOnTop, windowType]);
  
  useEffect(() => {
    // 容器窗口不参与停靠拖拽
    const isContainerWindow = windowType?.startsWith('dock-container:') || windowType?.startsWith('dock-tree:');
    
    let isMouseDown = false;
    let hasMoved = false;
    let hasStoppedProgress = false; // 跟踪是否已停止进度动画
    let hasStartedDockDrag = false; // 跟踪是否已调用 dock.startDrag
    let lastDockMoveTime = 0; // 节流：限制 dock.move 调用频率
    const DOCK_MOVE_THROTTLE = 50; // 50ms 节流
    
    const handleMouseMove = async (e: MouseEvent) => {
      if (!isMouseDown) return;
      
      // 容器窗口只支持移动，不参与停靠检测
      if (isContainerWindow) {
        return;
      }
      
      const dx = e.clientX - pressStartRef.current.x;
      const dy = e.clientY - pressStartRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > DRAG_THRESHOLD) {
        hasMoved = true;
      }
      
      const mode = modeRef.current;
      const windowId = getWindowId();
      
      // 计算相对于进度环中心（鼠标按下位置）的位置
      const relX = e.clientX - pressStartRef.current.x;
      const relY = e.clientY - pressStartRef.current.y;
      
      // ===== 阶段0 (normal, 0-0.7s): 移动取消选择 =====
      if (mode === 'normal' && hasMoved) {
        // 停止进度动画，取消选择
        if ((window as any).progressTimer) {
          clearInterval((window as any).progressTimer);
        }
        setIsPressing(false);
        setPressProgress(0);
        modeRef.current = 'canceled';
        return;
      }
      
      // ===== 阶段1 (dragging, 0.7-1.5s): 拖移窗口 + 停靠检测 =====
      if (mode === 'dragging') {
        if (windowId && window.electronAPI && hasMoved) {
          // 第一次拖移时停止进度动画和进度环显示
          if (!hasStoppedProgress) {
            hasStoppedProgress = true;
            if ((window as any).progressTimer) {
              clearInterval((window as any).progressTimer);
            }
            setIsPressing(false);
          }
          
          // 计算新窗口位置
          const moveX = e.screenX - mouseStartRef.current.x;
          const moveY = e.screenY - mouseStartRef.current.y;
          const newX = windowPositionRef.current.x + moveX;
          const newY = windowPositionRef.current.y + moveY;
          
          // 拖移窗口
          window.electronAPI.window.move(windowId, Math.round(newX), Math.round(newY));
          
          // 停靠检测逻辑
          const dragBounds = {
            x: newX,
            y: newY,
            width: windowSizeRef.current.width,
            height: windowSizeRef.current.height
          };
          
          // 第一次调用 dock.startDrag
          if (!hasStartedDockDrag) {
            hasStartedDockDrag = true;
            try {
              await window.electronAPI.dock.startDrag(windowId, dragBounds);
            } catch (err) {
              console.error('dock.startDrag failed:', err);
            }
          }
          
          // 节流调用 dock.move
          const now = Date.now();
          if (now - lastDockMoveTime >= DOCK_MOVE_THROTTLE) {
            lastDockMoveTime = now;
            try {
              // 传入鼠标位置用于检测
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
      
      // ===== 阶段2 (selecting, 1.5s+): 选择选项 =====
      if (mode === 'selecting') {
        // 下移出进度环: 显示透明度滑块
        if (relY > PROGRESS_RING_RADIUS) {
          setInteractionMode('opacity-slider');
          modeRef.current = 'opacity-slider';
          setShowSlider(true);
          // 记录原始透明度用于取消时恢复
          originalOpacityRef.current = opacityValueRef.current / 100;
          return;
        }
        
        // 上移出进度环: 取消操作
        if (relY < -PROGRESS_RING_RADIUS) {
          setInteractionMode('canceled');
          modeRef.current = 'canceled';
          return;
        }
        
        // 在进度环内：显示顶置选项
        return;
      }
      
      // ===== 透明度滑块模式 =====
      if (mode === 'opacity-slider') {
        // 上移回进度环区域: 隐藏滑块，恢复原透明度，回到顶置选项
        if (relY <= PROGRESS_RING_RADIUS) {
          setInteractionMode('selecting');
          modeRef.current = 'selecting';
          setShowSlider(false);
          // 恢复原透明度
          setOpacityValue(Math.round(originalOpacityRef.current * 100));
          if (windowId && window.electronAPI) {
            window.electronAPI.window.setOpacity(windowId, originalOpacityRef.current);
          }
          return;
        }
        
        // 滑块范围: 固定200像素半宽
        const sliderHalfWidth = 200; // 200像素半宽
        const normalizedX = (relX + sliderHalfWidth) / (sliderHalfWidth * 2);
        const clampedX = Math.max(0, Math.min(1, normalizedX));
        const newOpacity = Math.round(clampedX * 100);
        
        setOpacityValue(newOpacity);
        
        // 应用透明度到窗口
        if (windowId && window.electronAPI) {
          window.electronAPI.window.setOpacity(windowId, newOpacity / 100);
        }
        return;
      }
      
      // ===== 取消模式: 返回进度环恢复顶置选项 =====
      if (mode === 'canceled') {
        if (relY >= -PROGRESS_RING_RADIUS && relY <= PROGRESS_RING_RADIUS) {
          setInteractionMode('selecting');
          modeRef.current = 'selecting';
        }
        return;
      }
    };
    
    const handleMouseUp = async () => {
      isMouseDown = false;
      const mode = modeRef.current;
      const elapsed = Date.now() - startTimeRef.current;
      
      // 停止进度动画
      if ((window as any).progressTimer) {
        clearInterval((window as any).progressTimer);
      }
      
      const windowId = getWindowId();
      
      // 根据模式处理释放 - 只有在阶段2并且按住时间足够才执行顶置
      if (mode === 'selecting' && elapsed >= STAGE_1_DURATION) {
        // 阶段2原地释放: 顶置
        if (windowId && window.electronAPI) {
          const newPinState = !isAlwaysOnTop;
          await window.electronAPI.window.setAlwaysOnTop(windowId, newPinState);
          setIsAlwaysOnTop(newPinState);
        }
      } else if (mode === 'opacity-slider') {
        // 透明度模式释放: 保持当前透明度
        setShowSlider(false);
      } else if (mode === 'canceled') {
        // 已取消: 恢复透明度
        if (windowId && window.electronAPI) {
          await window.electronAPI.window.setOpacity(windowId, originalOpacityRef.current);
          setOpacityValue(Math.round(originalOpacityRef.current * 100));
        }
      } else if (mode === 'dragging' && hasStartedDockDrag) {
        // 拖移模式释放: 执行停靠检测
        if (windowId && window.electronAPI) {
          try {
            await window.electronAPI.dock.endDrag(windowId);
          } catch (err) {
            console.error('dock.endDrag failed:', err);
          }
        }
      }
      // normal 模式和其他情况：不做任何操作
      
      // 重置所有状态
      setIsPressing(false);
      setPressProgress(0);
      setInteractionMode('normal');
      modeRef.current = 'normal';
      setShowSlider(false);
      hasMoved = false;
      hasStoppedProgress = false;
      hasStartedDockDrag = false;
    };
    
    const handleGlobalMouseDown = () => {
      isMouseDown = true;
      hasMoved = false;
      hasStoppedProgress = false;
      hasStartedDockDrag = false;
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousedown', handleGlobalMouseDown);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousedown', handleGlobalMouseDown);
    };
  }, [windowType, isAlwaysOnTop]);
  
  // Window type is now initialized via lazy useState, no effect needed
  
  const handleClose = async () => {
    const windowId = getWindowId();
    if (windowId && window.electronAPI) {
      await window.electronAPI.window.close(windowId);
    }
  };
  
  // Alt+右键处理：切换始终虚化状态
  const handleContextMenu = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    
    const windowId = getWindowId();
    if (!windowId || !window.electronAPI) return;
    
    // 检查是否按住 Alt 键
    if (e.altKey) {
      // 只允许顶置窗口切换始终虚化状态
      if (isAlwaysOnTopRef.current) {
        try {
          const result = await window.electronAPI.alt.toggleAlwaysTransparent(windowId);
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
    }
  }, []);
  
  if (!windowType) return null;
  
  const renderContent = () => {
    // 处理停靠容器窗口
    if (windowType?.startsWith('dock-container:') || windowType?.startsWith('dock-tree:')) {
      return <DockContainerWindow />;
    }

    // popup:project-menu:<projectId>
    if (windowType.startsWith('popup:project-menu:')) {
      const projectId = windowType.replace('popup:project-menu:', '');
      const projectName = projectId === 'proj1' ? '项目' : projectId === 'proj2' ? '演示' : '项目名称';
      return <ConversationListMenu projectId={projectId} projectName={projectName} />;
    }
    
    switch (windowType) {
      case 'gear':
        return <GearPanel />;
      case 'popup:horizontal-tray':
        return <HorizontalTrayPopup />;
      case 'popup:vertical-tray':
        return <VerticalTrayPopup />;
      case 'popup:server-manager':
        return <ServerManagerPanel />;
      case 'chat':
        return <ChatWorkspacePanel isDocked={isDocked} dockPosition={dockPosition ?? undefined} />;
      case 'chat-input':
        return <ChatInputPanel isDocked={isDocked} dockPosition={dockPosition ?? undefined} />;
      case 'chat-history':
        return <ChatHistoryPanel />;
      case 'editor':
        return <EditorPanel />;
      case 'git':
        return <GitPanel />;
      case 'repository':
        return <RepositoryPanel />;
      case 'explorer':
        return <ExplorerPanel />;
      case 'server-manager':
        return <ServerManagerPanel />;
      case 'logs':
        return <AILogPanel />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>未知窗口类型: {windowType}</p>
          </div>
        );
    }
  };
  
  return (
    <div 
      className="h-screen w-screen bg-white overflow-hidden relative"
      style={{ 
        backgroundColor: 'white', 
        border: 'none', 
        boxShadow: 'none',
        margin: 0,
        padding: 0
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
    >
      {renderContent()}
      
      {/* Event blocker overlay - prevents interaction with window content in selecting mode */}
      {(interactionMode === 'selecting' || interactionMode === 'opacity-slider' || interactionMode === 'canceled') && (
        <div 
          className="fixed inset-0 z-40" 
          style={{ 
            cursor: interactionMode === 'selecting' ? 'default' : 
                    interactionMode === 'opacity-slider' ? 'ew-resize' : 
                    interactionMode === 'canceled' ? 'not-allowed' : 'default'
          }}
        />
      )}
      
      {/* Long press progress indicator */}
      <ProgressRing
        isPressing={isPressing}
        pressProgress={pressProgress}
        interactionMode={interactionMode}
        opacityValue={opacityValue}
        showSlider={showSlider}
        position={ringPosition}
      />
      
      {/* 置顶指示器 */}
      {isAlwaysOnTop && !isPressing && (
        <div className="fixed top-2 left-2 pointer-events-none">
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-500 rounded text-xs border border-blue-200">
            <Pin size={12} />
            <span>置顶</span>
          </div>
        </div>
      )}
      
      {/* 始终虚化指示器 */}
      {isAlwaysTransparent && !isPressing && (
        <div className="fixed top-2 left-16 pointer-events-none">
          <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-500 rounded text-xs border border-purple-200">
            <span>始终穿透</span>
            <span className="text-purple-400 ml-1">(Alt+T或点击取消按钮)</span>
          </div>
        </div>
      )}
      
      {/* 停靠指示器 */}
      {isDocked && !isPressing && (
        <div className="fixed top-2 right-12 pointer-events-none">
          <div className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 rounded text-xs border border-green-200">
            <span>已停靠 ({dockPosition})</span>
          </div>
        </div>
      )}
      
      {/* 悬浮关闭按钮 */}
      {isHovering && (
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

export default function Home() {
  const [windowType, setWindowType] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [webWindows, setWebWindows] = useState<{id: string, type: string, x: number, y: number, width: number, height: number, isDocked?: boolean, dockGroup?: string}[]>([]);
  const [dockGroups, setDockGroups] = useState<{id: string, windows: string[], position: 'left' | 'right' | 'top' | 'bottom' | 'center', x: number, y: number, width: number, height: number}[]>([]);
  const [draggingWindow, setDraggingWindow] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({x: 0, y: 0});
  const { previewDock, setPreviewDock, clearPreviewDock } = useAppStore();
  
  
  useEffect(() => {
    let type: string | null = null;

    if (window.electronAPI) {
      try {
        type = window.electronAPI.app.getWindowType();
      } catch {
        type = null;
      }
    }

    setWindowType(type);
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return <div className="h-screen w-screen bg-white" />;
  }
  
  // Web 模式下创建模拟窗口
  const createWebWindow = (type: string, options: {width: number, height: number}) => {
    const id = Math.random().toString(36).substr(2, 9);
    const x = 100 + webWindows.length * 30;
    const y = 100 + webWindows.length * 30;
    setWebWindows([...webWindows, { id, type, x, y, width: options.width, height: options.height }]);
  };
  
  const closeWebWindow = (id: string) => {
    setWebWindows(webWindows.filter(w => w.id !== id));
  };
  
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    const win = webWindows.find(w => w.id === id);
    if (win) {
      setDraggingWindow(id);
      setDragOffset({ x: e.clientX - win.x, y: e.clientY - win.y });
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingWindow) {
      const dragWin = webWindows.find(w => w.id === draggingWindow);
      if (dragWin) {
        const dragBounds = {
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
          width: dragWin.width,
          height: dragWin.height
        };
        
        // 检测其他窗口的停靠位置
        let foundPreview = null;
        for (const win of webWindows) {
          if (win.id !== draggingWindow) {
            const targetBounds = { x: win.x, y: win.y, width: win.width, height: win.height };
            const preview = detectDockPosition(dragBounds, targetBounds);
            if (preview) {
              foundPreview = { ...preview, targetNodeId: win.id };
              break;
            }
          }
        }
        
        // 更新预览
        if (foundPreview) {
          setPreviewDock(foundPreview);
        } else {
          clearPreviewDock();
        }
        
        // 更新窗口位置
        setWebWindows(webWindows.map(w => 
          w.id === draggingWindow 
            ? { ...w, x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y }
            : w
        ));
      }
    }
  };
  
  const handleMouseUp = () => {
    // 执行停靠操作
    if (draggingWindow && previewDock) {
      const dragWin = webWindows.find(w => w.id === draggingWindow);
      const targetWin = webWindows.find(w => w.id === previewDock.targetNodeId);
      
      if (dragWin && targetWin) {
        // 创建停靠组
        const dockGroupId = `dock-${Date.now()}`;
        const isHorizontal = previewDock.position === 'left' || previewDock.position === 'right';
        
        // 计算新的窗口尺寸
        const newWidth = isHorizontal ? targetWin.width / 2 : targetWin.width;
        const newHeight = isHorizontal ? targetWin.height : targetWin.height / 2;
        
        // 根据停靠位置计算新坐标
        let dragNewX = targetWin.x;
        let dragNewY = targetWin.y;
        let targetNewX = targetWin.x;
        let targetNewY = targetWin.y;
        
        switch (previewDock.position) {
          case 'left':
            targetNewX = targetWin.x + targetWin.width / 2;
            break;
          case 'right':
            dragNewX = targetWin.x + targetWin.width / 2;
            break;
          case 'top':
            targetNewY = targetWin.y + targetWin.height / 2;
            break;
          case 'bottom':
            dragNewY = targetWin.y + targetWin.height / 2;
            break;
        }
        
        // 更新窗口状态
        setWebWindows(webWindows.map(w => {
          if (w.id === draggingWindow) {
            return {
              ...w,
              x: dragNewX,
              y: dragNewY,
              width: newWidth,
              height: newHeight,
              isDocked: true,
              dockGroup: dockGroupId
            };
          }
          if (w.id === previewDock.targetNodeId) {
            return {
              ...w,
              x: targetNewX,
              y: targetNewY,
              width: newWidth,
              height: newHeight,
              isDocked: true,
              dockGroup: dockGroupId
            };
          }
          return w;
        }));
        
        // 创建停靠组
        setDockGroups([...dockGroups, {
          id: dockGroupId,
          windows: [draggingWindow, previewDock.targetNodeId],
          position: previewDock.position,
          x: targetWin.x,
          y: targetWin.y,
          width: targetWin.width,
          height: targetWin.height
        }]);
      }
    }
    
    setDraggingWindow(null);
    clearPreviewDock();
  };
  
  const renderWebWindowContent = (win: {id: string, type: string, isDocked?: boolean, dockGroup?: string}) => {
    // 获取停靠位置
    const dockGroup = win.dockGroup ? dockGroups.find(g => g.id === win.dockGroup) : null;
    const dockPosition = dockGroup?.position;
    
    switch (win.type) {
      case 'chat-input':
        return <ChatInputPanel isDocked={win.isDocked} dockPosition={dockPosition} />;
      case 'chat-history':
        return <ChatHistoryPanel />;
      case 'editor':
        return <EditorPanel />;
      case 'git':
        return <GitPanel />;
      case 'repository':
        return <RepositoryPanel />;
      case 'explorer':
        return <ExplorerPanel />;
      default:
        return <div className="p-4 text-gray-500">未知窗口类型: {win.type}</div>;
    }
  };
  
  // Electron ActivityBar 窗口
  if (windowType === 'activitybar') {
    return <ActivityBarWindow />;
  }
  
  // Electron 浮动窗口
  if (windowType && windowType !== 'main' && windowType !== 'activitybar') {
    return <FloatingWindowContent />;
  }
  
  // Web 模式
  return (
    <div 
      className="flex flex-col h-screen w-screen bg-gray-100 overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="flex flex-1 overflow-hidden relative">
        <ActivityBar onCreateWindow={createWebWindow} />
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <p>Web 模式 - 点击左侧按钮创建窗口</p>
      </div>
       
      {/* 停靠预览 */}
      <DockPreview />
      
      {/* Web 模式模拟窗口 */}
        {webWindows.map(win => (
          <div
            key={win.id}
            className="absolute bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-200"
            style={{
              left: win.x,
              top: win.y,
              width: win.width,
              height: win.height,
              zIndex: 1000 + webWindows.indexOf(win),
            }}
          >
            {/* 窗口标题栏 */}
            <div
              className="h-8 bg-gray-50 border-b border-gray-200 flex items-center justify-between px-3 cursor-move"
              onMouseDown={(e) => handleMouseDown(e, win.id)}
            >
              <span className="text-xs text-gray-600 font-medium">{win.type}</span>
              <button
                className="w-5 h-5 rounded hover:bg-red-500 hover:text-white flex items-center justify-center text-gray-400"
                onClick={() => closeWebWindow(win.id)}
              >
                <X size={12} />
              </button>
            </div>
            {/* 窗口内容 */}
            <div className="overflow-auto" style={{ height: win.height - 32 }}>
              {renderWebWindowContent(win)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
