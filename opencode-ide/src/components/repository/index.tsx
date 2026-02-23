'use client';

import { useAppStore } from '@/store';
import { GitBranch, FolderGit } from 'lucide-react';

export function RepositoryPanel() {
  const { gitRepository } = useAppStore();
  
  return (
    <div className="flex flex-col h-full bg-white p-4">
      {gitRepository ? (
        <div>
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-1">{gitRepository.name}</h3>
            <div className="flex items-center text-xs text-gray-500">
              <GitBranch size={14} className="mr-1" />
              {gitRepository.currentBranch}
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              最近的提交
            </h4>
            <div className="space-y-2">
              <div className="p-2 bg-gray-50 rounded text-sm">
                <div className="font-mono text-xs text-blue-500 mb-1">a1b2c3d</div>
                <div className="mb-1">初始提交</div>
                <div className="text-xs text-gray-400">2 分钟前 由 用户提交</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center">
          <FolderGit size={48} className="mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">没有仓库</h3>
          <p className="text-sm">打开一个 Git 仓库查看详情</p>
        </div>
      )}
    </div>
  );
}
