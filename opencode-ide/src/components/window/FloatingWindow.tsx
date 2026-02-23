'use client';

import { useAppStore } from '@/store';
import { X, Pin, Minus } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';

// 长按检测 Hook
function useLongPress(callback: () => void, duration: number = 800) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
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
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setIsPressing(false);
    setProgress(0);
  }, []);
  
  return { start, stop, isPressing, progress };
}

// 获取窗口标题
const getWindowTitle = (type: string) => {
  switch (type) {
    case 'chat': return '聊天';
    case 'editor': return '编辑器';
    case 'repository': return '仓库';
    case 'git': return 'Git';
    default: return type;
  }
};

// 获取窗口图标
const getWindowIcon = (type: string) => {
  switch (type) {
    case 'chat': return '💬';
    case 'editor': return '📝';
    case 'repository': return '📁';
    case 'git': return '🌿';
    default: return '📋';
  }
};

// 单个浮动窗口组件
function FloatingWindowItem({ windowId }: { windowId: string }) {
  const { 
    windows, 
    closeWindow, 
    moveWindow, 
    resizeWindow, 
    toggleAlwaysOnTop, 
    focusWindow,
    setWindowOpacity 
  } = useAppStore();
  
  const currentWindow = windows.find(w => w.id === windowId);
  
  console.log('FloatingWindowItem render:', { windowId, currentWindow });
  
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, mouseX: 0, mouseY: 0 });
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, mouseX: 0, mouseY: 0 });
  const [showOpacitySlider, setShowOpacitySlider] = useState(false);
  
  if (!currentWindow) {
    console.log('No window found for id:', windowId);
    return null;
  }
  
  const { start: startLongPress, stop: stopLongPress, isPressing, progress } = useLongPress(
    () => toggleAlwaysOnTop(windowId),
    800
  );
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (currentWindow.isLocked) return;
    
    const target = e.target as HTMLElement;
    if (target.closest('.window-titlebar')) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: currentWindow.position.x,
        y: currentWindow.position.y,
        mouseX: e.clientX,
        mouseY: e.clientY
      });
      focusWindow(windowId);
      startLongPress();
    }
  };
  
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      width: currentWindow.size.width,
      height: currentWindow.size.height,
      mouseX: e.clientX,
      mouseY: e.clientY
    });
  };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && !currentWindow.isLocked) {
        const deltaX = e.clientX - dragStart.mouseX;
        const deltaY = e.clientY - dragStart.mouseY;
        
        moveWindow(windowId, {
          x: dragStart.x + deltaX,
          y: dragStart.y + deltaY
        });
      }
      
      if (isResizing) {
        const deltaX = e.clientX - resizeStart.mouseX;
        const deltaY = e.clientY - resizeStart.mouseY;
        
        resizeWindow(windowId, {
          width: Math.max(300, resizeStart.width + deltaX),
          height: Math.max(200, resizeStart.height + deltaY)
        });
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      stopLongPress();
    };
    
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart, windowId, moveWindow, resizeWindow, stopLongPress, currentWindow.isLocked]);
  
  return (
    <div
      className="absolute rounded-lg overflow-hidden shadow-2xl border-2 bg-[#1e1e1e] flex flex-col"
      style={{
        left: currentWindow.position.x,
        top: currentWindow.position.y,
        width: currentWindow.size.width,
        height: currentWindow.size.height,
        zIndex: currentWindow.zIndex || 100,
        pointerEvents: 'auto',
      }}
      onMouseDown={() => focusWindow(windowId)}
    >
      {/* 标题栏 */}
      <div 
        className={`window-titlebar h-9 flex items-center justify-between px-3 bg-gradient-to-b from-[#37373d] to-[#2d2d2d] border-b border-[#3c3c3c] select-none ${
          currentWindow.isLocked ? 'cursor-default' : 'cursor-move'
        } ${currentWindow.alwaysOnTop ? 'border-l-2 border-l-[#0078d4]' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseUp={stopLongPress}
        onMouseLeave={stopLongPress}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{getWindowIcon(currentWindow.type)}</span>
          <span className="text-sm font-medium">{getWindowTitle(currentWindow.type)}</span>
          {currentWindow.alwaysOnTop && <Pin size={14} className="text-[#0078d4]" />}
          
          {isPressing && (
            <div className="relative w-5 h-5">
              <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="8" fill="none" stroke="#3c3c3c" strokeWidth="2" />
                <circle 
                  cx="10" cy="10" r="8" 
                  fill="none" 
                  stroke="#0078d4" 
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="50"
                  strokeDashoffset={50 - progress * 50}
                />
              </svg>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {showOpacitySlider && (
            <div className="flex items-center gap-2 px-2 py-1 bg-[#252526] rounded mr-2">
              <span className="text-xs">透明度</span>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={currentWindow.opacity}
                onChange={(e) => setWindowOpacity(windowId, parseFloat(e.target.value))}
                className="w-20 h-1 bg-[#3c3c3c] rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs w-8">{Math.round(currentWindow.opacity * 100)}%</span>
            </div>
          )}
          
          <button 
            className="p-1.5 rounded hover:bg-[#37373d] text-[#858585]"
            onClick={() => setShowOpacitySlider(!showOpacitySlider)}
            title="调整透明度"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a10 10 0 0 1 0 20 10 10 0 0 1 0-20z" fill="currentColor" fillOpacity={currentWindow.opacity} />
            </svg>
          </button>
          
          <button 
            className={`p-1.5 rounded hover:bg-[#37373d] ${currentWindow.alwaysOnTop ? 'text-[#0078d4]' : 'text-[#858585]'}`}
            onClick={() => toggleAlwaysOnTop(windowId)}
            title={currentWindow.alwaysOnTop ? '取消置顶' : '置顶窗口（或长按标题栏）'}
          >
            <Pin size={14} />
          </button>
          
          <button 
            className="p-1.5 rounded hover:bg-[#37373d] text-[#858585]"
            title="最小化"
          >
            <Minus size={14} />
          </button>
          
          <button 
            className="p-1.5 rounded hover:bg-red-500/20 hover:text-red-500 text-[#858585]"
            onClick={() => closeWindow(windowId)}
            title="关闭"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      
      {/* 内容区域 */}
      <div className="flex-1 bg-[#1e1e1e] overflow-hidden flex items-center justify-center">
        <div className="text-center p-4">
          <div className="text-6xl mb-4">{getWindowIcon(currentWindow.type)}</div>
          <h3 className="text-xl font-medium mb-2 text-white">{getWindowTitle(currentWindow.type)}</h3>
          <p className="text-sm text-[#858585]">浮动窗口</p>
        </div>
      </div>
      
      {/* 调整大小手柄 */}
      {!currentWindow.isLocked && currentWindow.isResizable && (
        <div
          className="absolute right-0 bottom-0 w-4 h-4 cursor-se-resize z-10"
          onMouseDown={handleResizeStart}
        >
          <svg 
            width="12" 
            height="12" 
            viewBox="0 0 12 12" 
            className="absolute right-1 bottom-1 text-[#858585] opacity-50 hover:opacity-100"
          >
            <path
              d="M8 8L12 12M4 12L12 4"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

export function WindowManager() {
  const { windows } = useAppStore();
  
  console.log('WindowManager render, windows:', windows);
  
  if (windows.length === 0) {
    return null;
  }
  
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ pointerEvents: 'none' }}>
      {windows.map((win) => (
        <FloatingWindowItem key={win.id} windowId={win.id} />
      ))}
    </div>
  );
}
