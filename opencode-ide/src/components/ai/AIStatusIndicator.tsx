'use client';

import { useState } from 'react';
import { useAppStore } from '@/store';
import { Circle, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export function AIStatusIndicator({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  const { connectionStatus } = useAppStore();
  const [lastUpdated] = useState<number>(() => Date.now());

  const sizeMap = {
    sm: { icon: 16, container: 'text-xs' },
    md: { icon: 20, container: 'text-sm' },
    lg: { icon: 24, container: 'text-base' },
  };

  const statusConfig = {
    connected: {
      label: '已连接',
      icon: CheckCircle2,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    connecting: {
      label: '连接中...',
      icon: Loader2,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
    },
    disconnected: {
      label: '未连接',
      icon: Circle,
      color: 'text-gray-400',
      bg: 'bg-gray-400/10',
    },
    error: {
      label: '连接错误',
      icon: AlertCircle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
    },
  };

  const config = statusConfig[connectionStatus as keyof typeof statusConfig] || statusConfig.disconnected;
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 px-2 py-1 rounded ${config.bg}`}>
      <Icon
        size={sizeMap[size].icon}
        className={`${config.color} ${connectionStatus === 'connecting' ? 'animate-spin' : ''}`}
      />
      <span className={`${config.color} font-medium ${sizeMap[size].container}`}>
        {config.label}
      </span>
      {connectionStatus !== 'connecting' && (
        <span className="text-[10px] text-gray-500">
          ({new Date(lastUpdated).toLocaleTimeString()})
        </span>
      )}
    </div>
  );
}
