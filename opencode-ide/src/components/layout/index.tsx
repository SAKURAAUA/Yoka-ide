'use client';

import { useState, useRef, useCallback } from 'react';
import { useAppStore } from '@/store';
import { 
  GitBranch, 
  Settings,
} from 'lucide-react';

interface ActivityBarProps {
  onCreateWindow?: (type: string, options: {width: number, height: number}) => void;
}

export function ActivityBar({ onCreateWindow }: ActivityBarProps) {
  const gearRef = useRef<HTMLButtonElement>(null);

  // Gear long-press: <0.2s click -> settings dropdown; 0.3-0.7s hold -> open tray panel (popup window)
  const [isGearPressing, setIsGearPressing] = useState(false);
  const [gearProgress, setGearProgress] = useState(0);
  const gearPressStartRef = useRef<number>(0);
  const gearPressingRef = useRef(false);
  const gearMovedRef = useRef(false);
  const gearOpenedTrayRef = useRef(false);
  const gearStartPointRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const toggleGearSystem = useCallback(async () => {
    if (typeof window === 'undefined' || !window.electronAPI) return;

    const activitybarId = window.electronAPI.app.getWindowId();
    const barBounds = await window.electronAPI.window.getBounds(activitybarId);
    if (!barBounds) return;

    const horizontalVisible = await window.electronAPI.popup.isVisible({ popupId: 'horizontal-tray' });
    const verticalVisible = await window.electronAPI.popup.isVisible({ popupId: 'vertical-tray' });
    const isOpen = !!(horizontalVisible?.visible || verticalVisible?.visible);

    if (isOpen) {
      // 再次长按：关闭两个托盘，并收起其它隶属子窗口
      await window.electronAPI.popup.hide({ popupId: 'horizontal-tray' });
      await window.electronAPI.popup.hide({ popupId: 'vertical-tray' });
      await window.electronAPI.popup.hide({ popupId: 'server-manager' });
      await window.electronAPI.popup.hide({ popupId: 'project-menu' });
      return;
    }

    // 第一次长按：以 activitybar 作为父窗口（齿轮窗口），弹出两个托盘
    const parentWindowId = activitybarId;
    const gearX = barBounds.x;
    const gearY = barBounds.y;
    const gearSize = Math.max(44, Math.min(barBounds.width, barBounds.height));

    // 垂直托盘（与齿轮同宽，位于齿轮正下方，高度按内容自适应）
    const projectCount = 3; // 2 项目 + 1 新建
    const itemCount = 5; // chat/editor/git/repository/explorer
    const verticalPadding = 8 * 2;
    const projectButton = 40;
    const projectGap = 8;
    const topSectionHeight = verticalPadding + projectCount * projectButton + (projectCount - 1) * projectGap;
    const bottomSectionHeight = 1 + itemCount * 48;

    const verticalX = gearX;
    const verticalY = gearY + gearSize;
    const verticalWidth = gearSize;
    const verticalHeight = topSectionHeight + bottomSectionHeight;

    await window.electronAPI.popup.show({
      popupId: 'vertical-tray',
      windowType: 'popup:vertical-tray',
      bounds: { x: verticalX, y: verticalY, width: verticalWidth, height: verticalHeight },
      parentWindowId,
      autoHide: false,
    });

    // 动态适配：根据真实已打开窗口数量计算水平托盘宽度（含容器窗口）
    let trayCount = 0;
    try {
      const all = await window.electronAPI.dock.getAllWindows();
      trayCount = (all || []).filter(
        (w) =>
          w.type !== 'activitybar' &&
          w.type !== 'main' &&
          w.type !== 'gear' &&
          !String(w.type).startsWith('popup:')
      ).length;
    } catch {
      // ignore
    }

    const diamondSize = 28;
    const diamondGap = 4;
    const trayPaddingX = 12 * 2;
    const statusButtonWidth = 90;
    const betweenGap = 8;
    const diamondsWidth = trayCount > 0 ? trayCount * diamondSize + (trayCount - 1) * diamondGap : 0;
    const horizontalWidth = Math.min(860, Math.max(170, trayPaddingX + diamondsWidth + betweenGap + statusButtonWidth));
    const horizontalHeight = gearSize;
    const horizontalX = gearX + gearSize;
    const horizontalY = gearY;

    await window.electronAPI.popup.show({
      popupId: 'horizontal-tray',
      windowType: 'popup:horizontal-tray',
      bounds: { x: horizontalX, y: horizontalY, width: horizontalWidth, height: horizontalHeight },
      parentWindowId,
      autoHide: false,
    });
  }, []);
  
  return (
    <div className="flex flex-col w-14 bg-white border-r border-gray-200 h-full">
      {/* 设置按钮 */}
      <div className="relative">
        <button 
          ref={gearRef}
          className="flex items-center justify-center w-14 h-12 cursor-pointer text-gray-500 hover:text-gray-700 hover:bg-gray-50 border-b border-gray-200"
          title="设置"
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            e.stopPropagation();

            gearPressStartRef.current = Date.now();
            gearPressingRef.current = true;
            gearMovedRef.current = false;
            gearOpenedTrayRef.current = false;
            gearStartPointRef.current = { x: e.clientX, y: e.clientY };
            setIsGearPressing(true);
            setGearProgress(0);

            const tick = () => {
              if (!gearPressingRef.current) return;
              const elapsed = Date.now() - gearPressStartRef.current;
              const progress = Math.max(0, Math.min(1, elapsed / 700));
              setGearProgress(progress);

              // 0.3s 后打开托盘面板（一次）
              if (elapsed >= 300 && !gearOpenedTrayRef.current && !gearMovedRef.current) {
                gearOpenedTrayRef.current = true;
                toggleGearSystem();
              }

              if (elapsed < 700 && !gearOpenedTrayRef.current) {
                requestAnimationFrame(tick);
              }
            };
            requestAnimationFrame(tick);
          }}
          onMouseMove={(e) => {
            if (!isGearPressing) return;
            const dx = e.clientX - gearStartPointRef.current.x;
            const dy = e.clientY - gearStartPointRef.current.y;
            if (Math.sqrt(dx * dx + dy * dy) > 5) {
              gearMovedRef.current = true;
            }
          }}
          onMouseUp={(e) => {
            if (e.button !== 0) return;
            e.stopPropagation();

            const elapsed = Date.now() - gearPressStartRef.current;
            gearPressingRef.current = false;
            setIsGearPressing(false);
            setGearProgress(0);

            // <0.2s 视作单击：弹出设置菜单
            // 按当前交互定义：短按不触发额外面板
          }}
          onMouseLeave={() => {
            if (!isGearPressing) return;
            gearPressingRef.current = false;
            setIsGearPressing(false);
            setGearProgress(0);
          }}
        >
          <Settings size={22} />
        </button>

        {/* 齿轮长按进度环（围绕按钮中心） */}
        {isGearPressing && gearRef.current && (
          <div
            className="absolute left-1/2 top-6 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[100000]"
            style={{ width: 44, height: 44 }}
          >
            <svg className="w-full h-full -rotate-90 text-blue-500" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="3" />
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 18}
                strokeDashoffset={(1 - gearProgress) * 2 * Math.PI * 18}
              />
            </svg>
          </div>
        )}
        
      </div>

      {/* 其余垂直托盘内容已迁移到 popup:tray */}
      <div className="flex-1" />
    </div>
  );
}

export function StatusBar() {
  const { gitRepository } = useAppStore();
  
  return (
    <footer className="flex items-center justify-between h-[22px] bg-blue-500 text-white text-xs px-2">
      <div className="flex items-center">
        <span className="flex items-center px-2 py-0.5 cursor-pointer hover:bg-white/10">
          <GitBranch size={14} className="mr-1" />
          {gitRepository?.currentBranch || 'main'}
        </span>
        {gitRepository && (
          <span className="px-2 py-0.5 cursor-pointer hover:bg-white/10">
            {gitRepository.name}
          </span>
        )}
      </div>
      <div className="flex items-center">
        <span className="px-2 py-0.5 cursor-pointer hover:bg-white/10">UTF-8</span>
        <span className="px-2 py-0.5 cursor-pointer hover:bg-white/10">TypeScript</span>
        <span className="px-2 py-0.5 cursor-pointer hover:bg-white/10">行 1, 列 1</span>
      </div>
    </footer>
  );
}
