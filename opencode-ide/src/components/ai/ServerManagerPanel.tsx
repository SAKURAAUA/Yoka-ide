'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AIAuthStatus } from '@/types/ai';
import { useAppStore } from '@/store';

type TabKey = 'servers' | 'mcp' | 'lsp' | 'plugins' | 'editor';

export function ServerManagerPanel({
  showTrayHeader = false,
  embedded = false,
}: {
  showTrayHeader?: boolean;
  embedded?: boolean;
}) {
  const refreshBackendStatus = useAppStore((s) => s.refreshBackendStatus);
  const backendStatus = useAppStore((s) => s.backendStatus);
  const connectionStatus = useAppStore((s) => s.connectionStatus);

  const [tab, setTab] = useState<TabKey>('servers');
  const [authStatus, setAuthStatus] = useState<AIAuthStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAuthActionRunning, setIsAuthActionRunning] = useState(false);
  const [authActionHint, setAuthActionHint] = useState('');
  const [openWindows, setOpenWindows] = useState<Array<{ id: string; type: string }>>([]);
  const loginPollTimerRef = useRef<number | null>(null);

  const canUseElectron = typeof window !== 'undefined' && !!window.electronAPI;

  const tabs = useMemo(
    () => [
      { key: 'servers' as const, label: '服务端' },
      { key: 'mcp' as const, label: 'MCP' },
      { key: 'lsp' as const, label: 'LSP' },
      { key: 'plugins' as const, label: '插件' },
      { key: 'editor' as const, label: '编辑器' },
    ],
    []
  );

  const refresh = async () => {
    if (!canUseElectron) return;
    setIsRefreshing(true);
    try {
      await refreshBackendStatus();
      const status = await window.electronAPI.aiAuth.status();
      setAuthStatus(status);

      if (showTrayHeader) {
        const all = await window.electronAPI.dock.getAllWindows();
        const filtered = (all || [])
          .filter((w) => w.type !== 'activitybar' && w.type !== 'main' && !String(w.type).startsWith('popup:'))
          .map((w) => ({ id: w.id, type: w.type }));
        setOpenWindows(filtered);
      }
    } catch {
      // swallow: UI will show stale state
    } finally {
      setIsRefreshing(false);
    }
  };

  const stopLoginPolling = () => {
    if (loginPollTimerRef.current !== null) {
      window.clearInterval(loginPollTimerRef.current);
      loginPollTimerRef.current = null;
    }
  };

  const startOfficialLogin = async () => {
    if (!canUseElectron || isAuthActionRunning) return;

    setIsAuthActionRunning(true);
    setAuthActionHint('正在打开 GitHub 登录终端…');

    try {
      const openResult = await window.electronAPI.aiAuth.openOfficialLogin();
      if (!openResult?.ok) {
        throw new Error(openResult?.error || '无法打开登录终端');
      }

      setAuthActionHint('请在浏览器完成设备授权，系统将自动检测登录状态…');
      const startedAt = Date.now();
      const timeoutMs = 180000;
      let pollingActive = true;

      const checkStatus = async () => {
        try {
          const status = await window.electronAPI.aiAuth.status();
          setAuthStatus(status);

          if (status.state === 'authenticated') {
            const switchResult = await window.electronAPI.aiAuth.useLoggedInUser();
            await refresh();
            if (switchResult?.ok) {
              window.dispatchEvent(new CustomEvent('ai-auth-updated'));
              setAuthActionHint('登录完成，已自动切换到官方登录态。');
            } else {
              setAuthActionHint(switchResult?.error || '已登录，但切换官方登录态失败');
            }
            pollingActive = false;
            stopLoginPolling();
            setIsAuthActionRunning(false);
            return;
          }

          if (Date.now() - startedAt > timeoutMs) {
            setAuthActionHint('登录等待超时，请点击按钮重新发起登录。');
            pollingActive = false;
            stopLoginPolling();
            setIsAuthActionRunning(false);
          }
        } catch {
          if (Date.now() - startedAt > timeoutMs) {
            setAuthActionHint('登录检测失败，请重试。');
            pollingActive = false;
            stopLoginPolling();
            setIsAuthActionRunning(false);
          }
        }
      };

      await checkStatus();
      if (pollingActive) {
        stopLoginPolling();
        loginPollTimerRef.current = window.setInterval(checkStatus, 2000);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '登录失败';
      setAuthActionHint(message);
      setIsAuthActionRunning(false);
      stopLoginPolling();
    }
  };

  useEffect(() => {
    refresh();
    // 不做高频轮询，避免频繁触发主进程加载/网络
    // 用户可手动刷新；后续可按需求加低频定时器
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      stopLoginPolling();
    };
  }, []);

  const renderStatusDot = (kind: 'ok' | 'warn' | 'bad' | 'off') => {
    const cls =
      kind === 'ok'
        ? 'bg-green-500'
        : kind === 'warn'
        ? 'bg-yellow-500'
        : kind === 'bad'
        ? 'bg-red-500'
        : 'bg-gray-400';
    return <span className={`inline-block w-2 h-2 rounded-full ${cls}`} />;
  };

  const copilotDot = connectionStatus === 'connected' ? 'ok' : connectionStatus === 'connecting' ? 'warn' : connectionStatus === 'error' ? 'bad' : 'off';

  const copilotDetail = (() => {
    const detail = backendStatus?.detail;
    if (detail) return detail;
    if (connectionStatus === 'connected') return '已就绪';
    if (connectionStatus === 'connecting') return '连接中…';
    if (connectionStatus === 'error') return '连接错误';
    return '未连接';
  })();

  const authLabel = (() => {
    if (!authStatus) return '认证状态未知';
    if (authStatus.state === 'authenticated') return authStatus.user?.login ? `已认证：${authStatus.user.login}` : '已认证';
    if (authStatus.state === 'pending') return '认证中…';
    if (authStatus.state === 'error') return authStatus.detail ? `认证错误：${authStatus.detail}` : '认证错误';
    return authStatus.detail ? `未认证：${authStatus.detail}` : '未认证';
  })();

  const renderServersTab = () => {
    const authButtonLabel = authStatus?.state === 'authenticated'
      ? '已登录'
      : isAuthActionRunning
      ? '等待登录完成…'
      : '登录 GitHub';

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-900">AI 服务端</div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 text-sm rounded border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50"
              onClick={refresh}
              disabled={!canUseElectron || isRefreshing}
              title={!canUseElectron ? '仅 Electron 模式可用' : '刷新后端状态'}
            >
              {isRefreshing ? '刷新中…' : '刷新状态'}
            </button>
            <button
              className="px-3 py-1.5 text-sm rounded border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 disabled:opacity-50"
              onClick={startOfficialLogin}
              disabled={!canUseElectron || isAuthActionRunning || authStatus?.state === 'authenticated'}
              title="打开 GitHub 官方登录并自动检测完成"
            >
              {authButtonLabel}
            </button>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-start justify-between px-3 py-2 bg-gray-50">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {renderStatusDot(copilotDot)}
                <div className="text-sm font-medium text-gray-900">GitHub Copilot</div>
                <span className="text-xs text-gray-500">({connectionStatus})</span>
              </div>
              <div className="text-xs text-gray-600">{copilotDetail}</div>
              <div className="text-xs text-gray-500">{authLabel}</div>
            </div>
            <div className="text-xs text-gray-400 text-right">
              {backendStatus?.lastUpdated ? new Date(backendStatus.lastUpdated).toLocaleTimeString() : ''}
            </div>
          </div>

          <div className="flex items-start justify-between px-3 py-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {renderStatusDot('off')}
                <div className="text-sm font-medium text-gray-900">OpenCode</div>
                <span className="text-xs text-gray-500">(unavailable)</span>
              </div>
              <div className="text-xs text-gray-600">未安装 / 未集成</div>
              <div className="text-xs text-gray-500">后续接入 OpenCode SDK 后可用</div>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          说明：此面板状态直接读取主进程 `ai:status` 与 `ai:auth:status`。
        </div>

        {authActionHint ? (
          <div className="text-xs rounded border border-blue-100 bg-blue-50 text-blue-700 px-2 py-1.5">
            {authActionHint}
          </div>
        ) : null}

        <div className="text-xs text-gray-500 rounded border border-gray-200 bg-gray-50 px-2 py-1.5">
          日志面板入口：窗口选择栏 → 日志（AI 调试日志）。第三方模块写入调试信息请调用主进程 `appendAILog(level, scope, message, meta)`，前端会通过 `window.electronAPI.aiLog.onAppend` 实时接收。
        </div>
      </div>
    );
  };

  const renderPlaceholder = (title: string) => {
    return (
      <div className="border border-dashed border-gray-200 rounded-lg p-4 text-sm text-gray-500">
        {title}：待接入。
      </div>
    );
  };

  return (
    <div className="h-full w-full bg-white text-gray-900">
      {showTrayHeader && (
        <div className="flex items-center justify-between px-4 pt-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.max(6, openWindows.length) }).map((_, idx) => {
                const win = openWindows[idx];
                return (
                  <button
                    key={win?.id || idx}
                    className="w-6 h-6 bg-gray-50 border border-gray-200 hover:bg-gray-100 disabled:opacity-60"
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
          </div>

          <div className="flex items-center gap-2 px-2 py-1 border border-gray-200 rounded-full bg-white">
            {renderStatusDot(copilotDot)}
            <span className="text-xs text-gray-700">状态</span>
          </div>
        </div>
      )}

      {!embedded && (
        <div className="flex items-center justify-between px-4 pt-4">
          <div className="text-base font-semibold">服务端管理</div>
        </div>
      )}

      <div className={embedded ? 'px-4 pt-3' : 'px-4 pt-3'}>
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`px-3 py-2 text-sm transition-colors ${
                tab === t.key
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {tab === 'servers' && renderServersTab()}
        {tab === 'mcp' && renderPlaceholder('MCP')}
        {tab === 'lsp' && renderPlaceholder('LSP')}
        {tab === 'plugins' && renderPlaceholder('插件')}
        {tab === 'editor' && renderPlaceholder('编辑器')}
      </div>
    </div>
  );
}
