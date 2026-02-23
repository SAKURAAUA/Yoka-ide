'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store';
import { EditorTabs, generateTabId } from './EditorTabs';
import { SpreadsheetEditor } from './SpreadsheetEditor';
import { DocumentEditor } from './DocumentEditor';
import { MarkdownEditor } from './MarkdownEditor';
import { CodeEditor } from './CodeEditor';
import { BrowserEditor } from './BrowserEditor';
import { detectEditorType } from '@/lib/editor/detectEditorType';
import type { EditorType } from '@/types/editor';
import { useFileDropToEditor } from '@/hooks/useFileDropToEditor';
import { FileCode, FileText, Table, FileJson, Upload } from 'lucide-react';

/**
 * Get editor icon based on file type
 */
function getEditorIcon(type: EditorType) {
  switch (type) {
    case 'spreadsheet': return <Table size={24} className="text-green-500" />;
    case 'document': return <FileText size={24} className="text-blue-500" />;
    case 'markdown': return <FileJson size={24} className="text-purple-500" />;
    default: return <FileCode size={24} className="text-gray-500" />;
  }
}

function getEditorComponent(type: EditorType) {
  switch (type) {
    case 'spreadsheet': return SpreadsheetEditor;
    case 'document': return DocumentEditor;
    case 'markdown': return MarkdownEditor;
    case 'code': return 'code' as const;
    default: return null;
  }
}

/**
 * Get language from file extension
 */
function getLanguageFromPath(path?: string): string {
  if (!path) return 'javascript';
  
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'py':
      return 'python';
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
      return 'css';
    case 'json':
      return 'json';
    case 'md':
    case 'markdown':
      return 'markdown';
    default:
      return 'javascript';
  }
}

/** Drop overlay - shows when file is being dragged over */
function DropOverlay({ fileName, fileType }: { fileName: string; fileType: EditorType }) {
  return (
    <div className="absolute inset-0 z-50 bg-blue-50/95 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="mb-3">{getEditorIcon(fileType)}</div>
        <p className="text-blue-600 font-medium">释放以打开文件</p>
        <p className="text-sm text-blue-500 mt-1">{fileName}</p>
      </div>
    </div>
  );
}

/** Empty state with drop zone */
function EmptyState({ isOver }: { isOver: boolean }) {
  return (
    <div className={`flex-1 flex items-center justify-center text-gray-400 transition-colors ${isOver ? 'bg-blue-50' : ''}`}>
      <div className="text-center">
        <Upload size={48} className={`mx-auto mb-4 ${isOver ? 'text-blue-500 scale-110' : 'opacity-50'} transition-all`} />
        <p className={isOver ? 'text-blue-600 font-medium' : ''}>{isOver ? '释放以打开文件' : '拖放文件到此处打开'}</p>
        <p className="text-xs mt-2 text-gray-500">支持 Excel (.xlsx)、Word (.docx)、Markdown (.md) 等格式</p>
      </div>
    </div>
  );
}

export function EditorPanel() {
  const { editorTabs, activeEditorTabId, addEditorTab, removeEditorTab, setActiveEditorTab, updateEditorTab } = useAppStore();
  const canUseElectron = typeof window !== 'undefined' && !!window.electronAPI?.fs?.writeFile;

  // File drop hook
  const { dropState, dropHandlers } = useFileDropToEditor({
    onFileDropped: (file) => console.log('File opened:', file.path, file.type),
    onError: (error) => console.error('Failed to open file:', error),
  });

  const activeTab = useMemo(() => editorTabs.find(tab => tab.id === activeEditorTabId) || null, [editorTabs, activeEditorTabId]);
  const handleTabSelect = (tabId: string) => setActiveEditorTab(tabId);
  const handleTabClose = (tabId: string) => removeEditorTab(tabId);
  const handleTabReorder = (fromIndex: number, toIndex: number) => {
    const newTabs = [...editorTabs];
    const [removed] = newTabs.splice(fromIndex, 1);
    newTabs.splice(toIndex, 0, removed);
    newTabs.forEach((tab) => updateEditorTab(tab.id, { title: tab.title }));
  };

  const saveTabToDisk = useCallback(async (tab: typeof activeTab) => {
    if (!tab || !tab.path) return;
    if (!canUseElectron) {
      console.warn('File save is only available in Electron mode.');
      return;
    }

    if (tab.type === 'spreadsheet') return;

    const extension = tab.path.split('.').pop()?.toLowerCase() || '';
    const isTextDocument = tab.type === 'document' && (extension === 'txt' || extension === 'rtf');
    const isTextLike = tab.type === 'code' || tab.type === 'markdown' || isTextDocument;

    if (!isTextLike) {
      console.warn('Saving this file type is not supported yet:', tab.path);
      return;
    }

    const content = tab.content ?? '';
    const result = await window.electronAPI.fs.writeFile(tab.path, content, { encoding: 'utf-8' });
    if (result.ok) {
      updateEditorTab(tab.id, { isDirty: false });
    } else {
      console.error('Failed to save file:', result.error || tab.path);
    }
  }, [canUseElectron, updateEditorTab]);

  useEffect(() => {
    if (!activeTab || activeTab.type === 'code') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const isSaveKey = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's';
      if (!isSaveKey) return;
      event.preventDefault();
      saveTabToDisk(activeTab);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, saveTabToDisk]);

  const renderEditorContent = () => {
    if (editorTabs.length === 0) return <EmptyState isOver={dropState.isOver} />;
    if (!activeTab) return <EmptyState isOver={dropState.isOver} />;

    const EditorComponent = getEditorComponent(activeTab.type);
    if (!EditorComponent) {
      return (
        <div className="flex-1 flex items-center justify-center text-gray-400 relative">
          {dropState.isOver && dropState.previewFile && <DropOverlay fileName={dropState.previewFile.file.name} fileType={dropState.previewFile.type} />}
          <div className="text-center">
            <FileCode size={48} className="mx-auto mb-4 opacity-50" />
            <p>正在编辑: {activeTab.title}</p>
            <p className="text-xs mt-2 text-gray-500">{activeTab.path || '代码编辑器'}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-hidden relative">
        {dropState.isOver && dropState.previewFile && <DropOverlay fileName={dropState.previewFile.file.name} fileType={dropState.previewFile.type} />}
        {activeTab.type === 'spreadsheet' && <SpreadsheetEditor containerId={`spreadsheet-${activeTab.id}`} onChange={() => updateEditorTab(activeTab.id, { isDirty: true })} />}
        {activeTab.type === 'document' && <DocumentEditor initialContent={activeTab.content || ''} onChange={(text) => updateEditorTab(activeTab.id, { content: text, isDirty: true })} />}
        {activeTab.type === 'markdown' && <MarkdownEditor initialContent={activeTab.content || ''} onChange={(markdown) => updateEditorTab(activeTab.id, { content: markdown, isDirty: true })} />}
        {activeTab.type === 'code' && (
          <CodeEditor
            key={activeTab.id}
            value={activeTab.content || ''}
            onChange={(content) => updateEditorTab(activeTab.id, { content, isDirty: true })}
            language={getLanguageFromPath(activeTab.path)}
            onSave={() => saveTabToDisk(activeTab)}
          />
        )}
        {activeTab.type === 'browser' && (
          <BrowserEditor
            key={activeTab.id}
            initialUrl={activeTab.path || 'about:blank'}
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white relative" {...dropHandlers}>
      {editorTabs.length > 0 && <EditorTabs tabs={editorTabs} activeTabId={activeEditorTabId} onTabSelect={handleTabSelect} onTabClose={handleTabClose} onTabReorder={handleTabReorder} />}
      {renderEditorContent()}
    </div>
  );
}

export async function openFileInEditor(filePath: string, fileName: string) {
  const store = useAppStore.getState();
  const editorType = detectEditorType({ path: filePath });
  const existingTab = store.editorTabs.find(tab => tab.path === filePath);
  if (existingTab) {
    store.setActiveEditorTab(existingTab.id);
    return existingTab.id;
  }
  
  // Read file content
  let content = '';
  if (typeof window !== 'undefined' && window.electronAPI?.fs?.readFile) {
    try {
      const result = await window.electronAPI.fs.readFile(filePath, { encoding: 'utf-8' });
      if (result.ok && typeof result.content === 'string') {
        content = result.content;
      }
    } catch (error) {
      console.error('Failed to read file:', error);
    }
  }
  
  return store.addEditorTab({ type: editorType, title: fileName, path: filePath, content, isDirty: false });
}

export async function openFileObjectInEditor(file: File): Promise<string | null> {
  const store = useAppStore.getState();
  const editorType = detectEditorType({ file });
  const path = file.webkitRelativePath || file.name;
  const existingTab = store.editorTabs.find(tab => tab.path === path);
  if (existingTab) {
    store.setActiveEditorTab(existingTab.id);
    return existingTab.id;
  }
  return store.addEditorTab({ type: editorType, title: file.name, path, isDirty: false });
}

export default EditorPanel;
