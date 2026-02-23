'use client';

import { useAppStore } from '@/store';
import { GitBranch, FolderGit, Plus, Minus, Check, RotateCcw } from 'lucide-react';

export function GitPanel() {
  const { gitRepository, gitWorkingTree, stageFile, unstageFile, setGitCommitMessage, gitCommitMessage } = useAppStore();
  
  const totalChanges = gitWorkingTree.modified.length + gitWorkingTree.untracked.length + gitWorkingTree.deleted.length;
  
  return (
    <div className="flex flex-col h-full bg-white overflow-auto p-3">
      {!gitRepository ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center">
          <FolderGit size={48} className="mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">没有打开的仓库</h3>
          <p className="text-sm">打开一个 Git 仓库查看变更</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{gitRepository.name}</div>
              <div className="flex items-center text-xs text-gray-500">
                <GitBranch size={14} className="mr-1" />
                {gitRepository.currentBranch}
              </div>
            </div>
            <button className="p-1.5 rounded hover:bg-gray-100" title="刷新">
              <RotateCcw size={16} />
            </button>
          </div>
          
          {totalChanges > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase text-gray-500">
                  更改 ({totalChanges})
                </span>
                <button 
                  className="text-xs text-blue-500 hover:underline"
                  onClick={() => gitWorkingTree.modified.forEach(f => stageFile(f.path))}
                >
                  全部暂存
                </button>
              </div>
              
              {gitWorkingTree.modified.map((file) => (
                <div key={file.path} className="flex items-center py-1 px-2 hover:bg-gray-50 rounded group">
                  <button 
                    className="mr-2 opacity-0 group-hover:opacity-100"
                    onClick={() => stageFile(file.path)}
                  >
                    <Plus size={14} className="text-blue-500" />
                  </button>
                  <span className="w-4 text-yellow-500 font-bold">M</span>
                  <span className="flex-1 text-sm truncate">{file.name}</span>
                  <span className="text-xs text-green-500">+{file.additions}</span>
                  <span className="text-xs text-red-500 ml-1">-{file.deletions}</span>
                </div>
              ))}
              
              {gitWorkingTree.untracked.map((file) => (
                <div key={file.path} className="flex items-center py-1 px-2 hover:bg-gray-50 rounded group">
                  <button 
                    className="mr-2 opacity-0 group-hover:opacity-100"
                    onClick={() => stageFile(file.path)}
                  >
                    <Plus size={14} className="text-blue-500" />
                  </button>
                  <span className="w-4 text-gray-400 font-bold">U</span>
                  <span className="flex-1 text-sm truncate">{file.name}</span>
                </div>
              ))}
            </div>
          )}
          
          {gitWorkingTree.staged.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase text-gray-500">
                  已暂存的更改 ({gitWorkingTree.staged.length})
                </span>
              </div>
              
              {gitWorkingTree.staged.map((file) => (
                <div key={file.path} className="flex items-center py-1 px-2 hover:bg-gray-50 rounded group">
                  <button 
                    className="mr-2 opacity-0 group-hover:opacity-100"
                    onClick={() => unstageFile(file.path)}
                  >
                    <Minus size={14} className="text-red-500" />
                  </button>
                  <Check size={14} className="mr-2 text-blue-500" />
                  <span className="flex-1 text-sm truncate">{file.name}</span>
                </div>
              ))}
            </div>
          )}
          
          {gitWorkingTree.staged.length > 0 && (
            <div className="pt-2 border-t border-gray-200">
              <textarea
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm resize-none focus:border-blue-500 focus:outline-none"
                placeholder="输入提交信息..."
                rows={3}
                value={gitCommitMessage}
                onChange={(e) => setGitCommitMessage(e.target.value)}
              />
              <button 
                className="w-full mt-2 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                disabled={!gitCommitMessage.trim()}
              >
                提交
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
