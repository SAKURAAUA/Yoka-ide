'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, FileText, FileCode, Table, FileJson, MoreVertical, Copy, Split, Trash2 } from 'lucide-react';
import type { EditorType, EditorTab } from '@/types/editor';

export interface EditorTabsProps {
  tabs: EditorTab[];
  activeTabId: string | null;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabReorder?: (fromIndex: number, toIndex: number) => void;
  onTabDuplicate?: (tabId: string) => void;
  onTabSplit?: (tabId: string) => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  tabId: string | null;
}

/**
 * EditorTabs - Multi-format editor tab bar component
 * Supports: code, document, spreadsheet, markdown
 * Features: drag reorder, right-click menu
 */
export function EditorTabs({ 
  tabs, 
  activeTabId, 
  onTabSelect, 
  onTabClose,
  onTabReorder,
  onTabDuplicate,
  onTabSplit,
}: EditorTabsProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    tabId: null,
  });
  
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const getEditorIcon = (type: EditorType) => {
    switch (type) {
      case 'document':
        return <FileText size={14} className="text-blue-500" />;
      case 'spreadsheet':
        return <Table size={14} className="text-green-500" />;
      case 'markdown':
        return <FileJson size={14} className="text-purple-500" />;
      case 'code':
      default:
        return <FileCode size={14} className="text-gray-500" />;
    }
  };

  const getEditorTypeLabel = (type: EditorType) => {
    switch (type) {
      case 'document':
        return '文档';
      case 'spreadsheet':
        return '表格';
      case 'markdown':
        return 'Markdown';
      case 'code':
      default:
        return '代码';
    }
  };

  // Handle right-click context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      tabId,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => closeContextMenu();
    if (contextMenu.visible) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu.visible, closeContextMenu]);

  // Handle drag and drop for reordering
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    
    if (index !== draggedIndex) {
      setDragOverIndex(index);
    }
  }, [draggedIndex]);

  const handleDragEnd = useCallback(() => {
    if (draggedIndex !== null && dragOverIndex !== null && onTabReorder) {
      onTabReorder(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, dragOverIndex, onTabReorder]);

  // Handle context menu actions
  const handleDuplicate = useCallback(() => {
    if (contextMenu.tabId && onTabDuplicate) {
      onTabDuplicate(contextMenu.tabId);
    }
    closeContextMenu();
  }, [contextMenu.tabId, onTabDuplicate, closeContextMenu]);

  const handleSplit = useCallback(() => {
    if (contextMenu.tabId && onTabSplit) {
      onTabSplit(contextMenu.tabId);
    }
    closeContextMenu();
  }, [contextMenu.tabId, onTabSplit, closeContextMenu]);

  const handleClose = useCallback(() => {
    if (contextMenu.tabId) {
      onTabClose(contextMenu.tabId);
    }
    closeContextMenu();
  }, [contextMenu.tabId, onTabClose, closeContextMenu]);

  const handleCloseOthers = useCallback(() => {
    if (contextMenu.tabId) {
      tabs.forEach(tab => {
        if (tab.id !== contextMenu.tabId) {
          onTabClose(tab.id);
        }
      });
    }
    closeContextMenu();
  }, [contextMenu.tabId, tabs, onTabClose, closeContextMenu]);

  const handleCloseAll = useCallback(() => {
    tabs.forEach(tab => {
      onTabClose(tab.id);
    });
    closeContextMenu();
  }, [tabs, onTabClose, closeContextMenu]);

  if (tabs.length === 0) {
    return null;
  }

  return (
    <>
      <div 
        ref={tabsRef}
        className="flex bg-gray-50 border-b border-gray-200 overflow-x-auto min-h-[35px] select-none"
        onContextMenu={(e) => {
          e.preventDefault();
        }}
      >
        {tabs.map((tab, index) => (
          <div
            key={tab.id}
            draggable
            className={`flex items-center px-3 h-[35px] min-w-[120px] max-w-[200px] border-r border-gray-200 cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis text-sm group relative ${
              activeTabId === tab.id
                ? 'bg-white border-b-2 border-b-blue-500 -mb-px'
                : 'hover:bg-gray-100'
            } ${
              draggedIndex === index ? 'opacity-50' : ''
            } ${
              dragOverIndex === index && draggedIndex !== null 
                ? 'border-l-2 border-l-blue-400' 
                : ''
            }`}
            onClick={() => onTabSelect(tab.id)}
            onContextMenu={(e) => handleContextMenu(e, tab.id)}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            title={`${tab.title}${tab.path ? `\n${tab.path}` : ''}`}
          >
            {getEditorIcon(tab.type)}
            <span className="ml-2 flex-1 truncate">{tab.title}</span>
            {tab.isDirty && (
              <span className="w-2 h-2 rounded-full bg-yellow-500 ml-1" title="未保存" />
            )}
            {tab.canClose !== false && (
              <button
                className="ml-2 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:opacity-100 hover:bg-gray-200 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                title="关闭"
              >
                <X size={12} />
              </button>
            )}
            {/* Drag handle indicator */}
            <div className="absolute left-0 top-0 bottom-0 w-1 cursor-move opacity-0 group-hover:opacity-100 hover:bg-blue-400" />
          </div>
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            onClick={handleDuplicate}
          >
            <Copy size={14} />
            复制标签页
          </button>
          <button
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            onClick={handleSplit}
          >
            <Split size={14} />
            拆分到新窗口
          </button>
          <div className="h-px bg-gray-200 my-1" />
          <button
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            onClick={handleClose}
          >
            <X size={14} />
            关闭
          </button>
          <button
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            onClick={handleCloseOthers}
          >
            <Trash2 size={14} />
            关闭其他
          </button>
          <button
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            onClick={handleCloseAll}
          >
            <Trash2 size={14} />
            关闭全部
          </button>
        </div>
      )}
    </>
  );
}

/**
 * Utility function to generate unique tab ID
 */
export function generateTabId(type: EditorType, path?: string): string {
  const timestamp = Date.now();
  const identifier = path || `new-${type}-${timestamp}`;
  return `editor-${type}-${identifier.replace(/[^a-zA-Z0-9]/g, '-')}`;
}

export default EditorTabs;
