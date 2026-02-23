'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/store';
import {
  Code2,
  FolderGit,
  FolderOpen,
  GitBranch,
  MessageCircle,
  ScrollText,
  Plus,
} from 'lucide-react';
import { ServerManagerPanel } from '@/components/ai';

type WindowListItem = { id: string; type: string };

export function TrayPopupPanel() {
  const { createWindow, currentProject, setCurrentProject } = useAppStore();
  const refreshBackendStatus = useAppStore((s) => s.refreshBackendStatus);
  const connectionStatus = useAppStore((s) => s.connectionStatus);

  const [openWindows, setOpenWindows] = useState<WindowListItem[]>([]);
  const [showServerManager, setShowServerManager] = useState(false);

  const canUseElectron = typeof window !== 'undefined' && !!window.electronAPI;

  const projects = useMemo(
    () => [
      { id: 'proj1', name: '项目' },
      { id: 'proj2', name: '演示' },
    ],
    []
  );

  const items = useMemo(
    () => [
      { id: 'chat' as const, icon: MessageCircle, label: '聊天', width: 640, height: 760 },
      { id: 'editor' as const, icon: Code2, label: '编辑器', width: 600, height: 500 },
      { id: 'git' as const, icon: FolderGit, label: 'Git', width: 400, height: 500 },
      { id: 'repository' as const, icon: GitBranch, label: '仓库', width: 400, height: 400 },
      { id: 'explorer' as const, icon: FolderOpen, label: '资源管理器', width: 300, height: 500 },
      { id: 'logs' as const, icon: ScrollText, label: '日志', width: 860, height: 620 },
    ],
    []
  );

  const getStableColor = (seed: string) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    const hue = hash % 360;
    return `hsl(${hue} 65% 55%)`;
  };

  const refreshWindows = useCallback(async () => {
    if (!canUseElectron) return;
    try {
      const all = await window.electronAPI.dock.getAllWindows();
      const filtered = (all || [])
        .filter((w) => w.type !== 'activitybar' && w.type !== 'main' && !String(w.type).startsWith('popup:'))
        .map((w) => ({ id: w.id, type: w.type }));
      setOpenWindows(filtered);
    } catch {
      // ignore
    }
  }, [canUseElectron]);

  useEffect(() => {
    refreshBackendStatus();
    refreshWindows();
  }, [refreshBackendStatus, refreshWindows]);

  const openProjectMenuPopup = useCallback(
    async (projectId: string) => {
      if (!canUseElectron || !window.electronAPI?.popup) return;
      const selfId = window.electronAPI.app.getWindowId();
      const bounds = await window.electronAPI.window.getBounds(selfId);
      if (!bounds) return;

      const width = 380;
      const height = bounds.height;
      const x = bounds.x + bounds.width;
      const y = bounds.y;

      await window.electronAPI.popup.show({
        popupId: 'project-menu',
        windowType: `popup:project-menu:${projectId}`,
        bounds: { x, y, width, height },
        parentWindowId: selfId,
        autoHide: true,
      });
    },
    [canUseElectron]
  );

  const openWindow = useCallback(
    async (type: string, width: number, height: number) => {
      await createWindow(type as any, { width, height });
      await refreshWindows();
    },
    [createWindow, refreshWindows]
  );

  const statusDot = connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'connecting' ? 'bg-yellow-500' : connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400';

  return (
    <div className="h-full w-full bg-white text-gray-900">
      {/* 水平托盘 + 状态按钮 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.max(6, openWindows.length) }).map((_, idx) => {
            const win = openWindows[idx];
            return (
              <button
                key={win?.id || idx}
                className="w-7 h-7 bg-gray-50 border border-gray-200 hover:bg-gray-100 disabled:opacity-60"
                title={win ? win.type : ''}
                style={{ transform: 'rotate(45deg)', borderRadius: 4 }}
                disabled={!win}
                onClick={async () => {
                  if (!win || !canUseElectron) return;
                  try {
                    await window.electronAPI.window.focus(win.id);
                  } catch {
                    // ignore
                  }
                }}
              >
                {win && (
                  <div
                    className="w-full h-full flex items-center justify-center text-[10px] text-gray-700"
                    style={{ transform: 'rotate(-45deg)' }}
                  >
                    {String(win.type).charAt(0).toUpperCase()}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <button
          className="flex items-center gap-2 px-2.5 py-1.5 border border-gray-200 rounded-full bg-white hover:bg-gray-50"
          onClick={() => setShowServerManager((v) => !v)}
          title="服务端状态"
        >
          <span className={`inline-block w-2 h-2 rounded-full ${statusDot}`} />
          <span className="text-xs text-gray-700">状态</span>
        </button>
      </div>

      <div className="flex h-[calc(100%-41px)]">
        {/* 垂直托盘（原 ActivityBar 的剩余部分） */}
        <div className="flex flex-col w-14 border-r border-gray-200">
          <div className="flex flex-col items-center py-2 gap-2 flex-1">
            {projects.map((project) => (
              <button
                key={project.id}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-medium text-sm transition-all ${
                  currentProject === project.id
                    ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: getStableColor(project.id) }}
                title={project.name}
                onClick={() => {
                  setCurrentProject(project.id);
                  openProjectMenuPopup(project.id);
                }}
              >
                {project.name.charAt(0)}
              </button>
            ))}
            <button
              className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-all"
              title="打开文件夹"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="flex flex-col border-t border-gray-200">
            {items.map((item) => (
              <button
                key={item.id}
                className="flex items-center justify-center w-14 h-12 cursor-pointer text-gray-500 border-l-2 border-transparent transition-all hover:text-gray-700 hover:bg-gray-50"
                onClick={() => openWindow(item.id, item.width, item.height)}
                title={item.label}
              >
                <item.icon size={22} />
              </button>
            ))}
          </div>
        </div>

        {/* 右侧面板：默认空白，点击“状态”展开服务端管理 */}
        <div className="flex-1 overflow-auto">
          {showServerManager ? <ServerManagerPanel embedded /> : null}
        </div>
      </div>
    </div>
  );
}
