'use client';

import { useEffect, useMemo, useState } from 'react';

type AILogEntry = {
  id: string;
  time: number;
  level: 'info' | 'warn' | 'error';
  scope: string;
  message: string;
  meta?: unknown;
};

export function AILogPanel() {
  const [logs, setLogs] = useState<AILogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const canUseElectron = typeof window !== 'undefined' && !!window.electronAPI?.aiLog;

  const refreshLogs = async () => {
    if (!canUseElectron) return;
    setLoading(true);
    try {
      const result = await window.electronAPI.aiLog.list();
      if (result.ok && Array.isArray(result.logs)) {
        setLogs(result.logs.slice().reverse());
      }
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    if (!canUseElectron) return;
    await window.electronAPI.aiLog.clear();
    setLogs([]);
  };

  useEffect(() => {
    refreshLogs();

    if (!canUseElectron) return;

    window.electronAPI.aiLog.onAppend((entry) => {
      setLogs((prev) => [entry, ...prev].slice(0, 500));
    });

    window.electronAPI.aiLog.onClear(() => {
      setLogs([]);
    });

    return () => {
      window.electronAPI.aiLog.removeListeners();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseElectron]);

  const levelClass = useMemo(
    () => ({
      info: 'text-blue-700 bg-blue-50 border-blue-100',
      warn: 'text-yellow-800 bg-yellow-50 border-yellow-100',
      error: 'text-red-700 bg-red-50 border-red-100',
    }),
    []
  );

  return (
    <div className="h-full w-full bg-white p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-900">AI 调试日志</div>
        <div className="flex items-center gap-2">
          <button
            className="px-2 py-1 text-xs rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
            onClick={refreshLogs}
            disabled={!canUseElectron || loading}
          >
            {loading ? '刷新中…' : '刷新'}
          </button>
          <button
            className="px-2 py-1 text-xs rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
            onClick={clearLogs}
            disabled={!canUseElectron}
          >
            清空日志
          </button>
        </div>
      </div>

      {!canUseElectron ? (
        <div className="text-xs text-gray-500">仅 Electron 模式可用</div>
      ) : null}

      <div className="text-xs text-gray-500">用于定位认证/模型/发送链路问题，展示主进程实时断点日志。</div>

      <div className="flex-1 overflow-auto border border-gray-200 rounded-lg bg-gray-50 p-2 space-y-2">
        {logs.length === 0 ? (
          <div className="text-xs text-gray-400">暂无日志</div>
        ) : (
          logs.map((entry) => (
            <div key={entry.id} className={`border rounded p-2 text-xs ${levelClass[entry.level]}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">[{entry.scope}] {entry.message}</div>
                <div className="text-[11px] opacity-80">{new Date(entry.time).toLocaleTimeString()}</div>
              </div>
              {entry.meta !== undefined ? (
                <pre className="mt-1 whitespace-pre-wrap break-all text-[11px] opacity-90">{JSON.stringify(entry.meta, null, 2)}</pre>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
