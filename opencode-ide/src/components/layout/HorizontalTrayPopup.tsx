'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/store';

type WindowListItem = { id: string; type: string; isVisible: boolean };

export function HorizontalTrayPopup() {
  const refreshBackendStatus = useAppStore((s) => s.refreshBackendStatus);
  const connectionStatus = useAppStore((s) => s.connectionStatus);

  const [openWindows, setOpenWindows] = useState<WindowListItem[]>([]);

  const canUseElectron = typeof window !== 'undefined' && !!window.electronAPI;

  const refreshWindows = useCallback(async () => {
    if (!canUseElectron) return;
    try {
      const all = await window.electronAPI.dock.getAllWindows();
      const filtered = (all || [])
        .filter(
          (w) =>
            w.type !== 'activitybar' &&
            w.type !== 'main' &&
            w.type !== 'gear' &&
            !String(w.type).startsWith('popup:')
        )
        .map((w) => ({ id: w.id, type: w.type, isVisible: w.isVisible !== false }));
      setOpenWindows(filtered);
    } catch {
      // ignore
    }
  }, [canUseElectron]);

  useEffect(() => {
    refreshBackendStatus();
    refreshWindows();
  }, [refreshBackendStatus, refreshWindows]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      refreshWindows();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [refreshWindows]);

  const statusDot =
    connectionStatus === 'connected'
      ? 'bg-green-500'
      : connectionStatus === 'connecting'
      ? 'bg-yellow-500'
      : connectionStatus === 'error'
      ? 'bg-red-500'
      : 'bg-gray-400';

  const toggleServerManager = useCallback(async () => {
    if (!canUseElectron) return;
    const parentWindowId = window.electronAPI.app.getPopupParentWindowId() || undefined;

    const visible = await window.electronAPI.popup.isVisible({ popupId: 'server-manager' });
    if (visible?.visible) {
      await window.electronAPI.popup.hide({ popupId: 'server-manager' });
      return;
    }

    const x = Math.round(window.screenX + window.outerWidth);
    const y = Math.round(window.screenY + 8);

    await window.electronAPI.popup.show({
      popupId: 'server-manager',
      windowType: 'popup:server-manager',
      bounds: { x, y, width: 520, height: 420 },
      parentWindowId,
      autoHide: true,
    });
  }, [canUseElectron]);

  const windowsToRender = useMemo(() => openWindows, [openWindows]);

  return (
    <div className="h-full w-full bg-white text-gray-900 border-b border-gray-200">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1">
          {windowsToRender.map((win) => {
            return (
              <button
                key={win.id}
                className={`w-7 h-7 border border-gray-200 hover:bg-gray-100 ${win.isVisible ? 'bg-gray-50' : 'bg-white opacity-50'}`}
                title={win.type}
                style={{ transform: 'rotate(45deg)', borderRadius: 4 }}
                onClick={async () => {
                  if (!canUseElectron) return;
                  try {
                    await window.electronAPI.window.toggleVisibility(win.id);
                    await refreshWindows();
                  } catch {
                    // ignore
                  }
                }}
              >
                <div
                  className="w-full h-full flex items-center justify-center text-[10px] text-gray-700"
                  style={{ transform: 'rotate(-45deg)' }}
                >
                  {String(win.type).charAt(0).toUpperCase()}
                </div>
              </button>
            );
          })}
        </div>

        <div className="w-px h-5 bg-gray-200 mx-2 shrink-0" aria-hidden="true" />

        <button
          className="flex items-center gap-2 px-2.5 py-1.5 border border-gray-200 rounded-full bg-white hover:bg-gray-50"
          onClick={toggleServerManager}
          title="服务端状态"
        >
          <span className={`inline-block w-2 h-2 rounded-full ${statusDot}`} />
          <span className="text-xs text-gray-700">状态</span>
        </button>
      </div>
    </div>
  );
}
