'use client';

import { useState } from 'react';
import { useAppStore } from '@/store';
import { ChevronDown } from 'lucide-react';

export function BackendSelector() {
  const { activeBackend, setActiveBackend } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [backends] = useState([
    { id: 'copilot', name: 'GitHub Copilot', icon: '🤖', status: 'enabled' },
    { id: 'opencode', name: 'OpenCode', icon: '🔧', status: 'coming-soon' },
  ]);

  const currentBackend = backends.find(b => b.id === activeBackend);

  return (
    <div className="relative inline-block w-full max-w-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-[#252526] border border-[#3c3c3c] rounded text-sm text-left flex items-center justify-between hover:bg-[#2d2d30] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{currentBackend?.icon}</span>
          <div className="flex flex-col">
            <span className="text-white">{currentBackend?.name || 'Select Backend'}</span>
            <span className="text-xs text-[#858585]">AI Backend</span>
          </div>
        </div>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#252526] border border-[#3c3c3c] rounded shadow-lg z-50">
          {backends.map(backend => (
            <button
              key={backend.id}
              onClick={() => {
                if (backend.status === 'enabled') {
                  setActiveBackend(backend.id as any);
                }
                setIsOpen(false);
              }}
              disabled={backend.status === 'coming-soon'}
              className={`w-full px-3 py-2 text-left flex items-center gap-2 text-sm transition-colors ${
                backend.id === activeBackend
                  ? 'bg-[#0078d4] text-white'
                  : backend.status === 'coming-soon'
                  ? 'text-[#858585] cursor-not-allowed'
                  : 'text-white hover:bg-[#2d2d30]'
              }`}
            >
              <span className="text-lg">{backend.icon}</span>
              <div className="flex-1">
                <div>{backend.name}</div>
                {backend.status === 'coming-soon' && (
                  <div className="text-xs text-[#858585]">Coming soon</div>
                )}
              </div>
              {backend.id === activeBackend && (
                <div className="w-2 h-2 bg-white rounded-full"></div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
