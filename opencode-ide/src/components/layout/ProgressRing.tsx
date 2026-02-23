'use client';

import { InteractionMode } from '@/hooks/useLongPressInteraction';
import { Pin, Move, Layers } from 'lucide-react';

export type DragMode = 'whole' | 'partial'; // 整体拖移 / 局部拖移

interface ProgressRingProps {
  isPressing: boolean;
  pressProgress: number;
  interactionMode: InteractionMode;
  opacityValue: number;
  showSlider: boolean;
  position?: { x: number; y: number }; // 鼠标按下位置，默认窗口中心
  dragMode?: DragMode; // 拖移模式
}

export function ProgressRing({
  isPressing,
  pressProgress,
  interactionMode,
  opacityValue,
  showSlider,
  position,
  dragMode = 'whole',
}: ProgressRingProps) {
  if (!isPressing) return null;
  
  // 进度环位置：优先使用鼠标按下位置，否则窗口中心
  const ringX = position?.x ?? window.innerWidth / 2;
  const ringY = position?.y ?? window.innerHeight / 2;
  
  // 颜色逻辑
  const getProgressColor = () => {
    if (interactionMode === 'canceled') return '#ef4444'; // 红色
    if (interactionMode === 'opacity-slider') return '#3b82f6'; // 蓝色
    if (pressProgress >= 1) return '#3b82f6'; // 蓝色 - 阶段2
    if (pressProgress >= 0.47) {
      // 阶段1：根据拖移模式显示颜色
      return dragMode === 'whole' ? '#22c55e' : '#a855f7'; // 绿色 / 紫色
    }
    return '#9ca3af'; // 灰色 - 阶段0
  };
  
  return (
    <div 
      className="fixed pointer-events-none z-50"
      style={{ left: ringX, top: ringY, transform: 'translate(-50%, -50%)' }}
    >
      <div className="relative">
        {/* Progress ring */}
        <div className="w-20 h-20">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            {/* Background track */}
            <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="4" />
            {/* Progress ring */}
            <circle 
              cx="40" cy="40" r="32" 
              fill="none" 
              stroke={getProgressColor()}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="201"
              strokeDashoffset={201 - (pressProgress * 201)}
            />
          </svg>
          {/* Mode indicators */}
          {interactionMode === 'normal' && pressProgress < 0.47 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            </div>
          )}
          {/* 阶段1：显示拖移模式图标 */}
          {(interactionMode === 'dragging' || (interactionMode === 'normal' && pressProgress >= 0.47 && pressProgress < 1)) && (
            <div className="absolute inset-0 flex items-center justify-center">
              {dragMode === 'whole' ? (
                <Move size={24} className="text-green-500" />
              ) : (
                <Layers size={24} className="text-purple-500" />
              )}
            </div>
          )}
          {(interactionMode === 'selecting' || (interactionMode === 'normal' && pressProgress >= 1)) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Pin size={24} className="text-blue-500" />
            </div>
          )}
          {interactionMode === 'opacity-slider' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-blue-500 text-xs font-bold">{opacityValue}%</span>
            </div>
          )}
          {interactionMode === 'canceled' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-red-500 text-xs">取消</span>
            </div>
          )}
        </div>
        
        {/* Opacity Slider */}
        {showSlider && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 w-48 bg-white/90 backdrop-blur rounded-lg shadow-lg p-3">
            <div className="text-xs text-gray-500 mb-2 text-center">透明度</div>
            <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="absolute left-0 top-0 h-full bg-blue-500 transition-all"
                style={{ width: `${opacityValue}%` }}
              />
              <div 
                className="absolute top-0 w-6 h-6 bg-white rounded-full shadow border border-gray-300"
                style={{ left: `calc(${opacityValue}% - 12px)` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        )}
        
        {/* Direction hints */}
        {/* 阶段1：右键切换提示 */}
        {(interactionMode === 'dragging' || (interactionMode === 'normal' && pressProgress >= 0.47 && pressProgress < 1)) && (
          <>
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap" style={{ color: dragMode === 'whole' ? '#22c55e' : '#a855f7' }}>
              {dragMode === 'whole' ? '整体拖移' : '局部拖移'}
            </div>
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">
              右键切换模式
            </div>
          </>
        )}
        {/* 阶段2提示 */}
        {(interactionMode === 'selecting' || (interactionMode === 'normal' && pressProgress >= 1)) && (
          <>
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">
              ↑ 上滑取消
            </div>
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">
              ↓ 下滑调整透明度
            </div>
            <div className="absolute left-16 top-1/2 -translate-y-1/2 text-xs text-gray-400 whitespace-nowrap">
              松开顶置
            </div>
          </>
        )}
      </div>
    </div>
  );
}
