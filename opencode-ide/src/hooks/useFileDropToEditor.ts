'use client';

import { useState, useCallback, useRef } from 'react';
import { useAppStore } from '@/store';
import { detectEditorType } from '@/lib/editor/detectEditorType';
import type { EditorType } from '@/types/editor';
import { generateTabId } from '@/components/editor/EditorTabs';

export interface DroppedFile {
  file: File;
  type: EditorType;
  path: string;
}

export interface UseFileDropToEditorOptions {
  onFileDropped?: (file: DroppedFile) => void;
  onError?: (error: Error) => void;
  acceptedTypes?: EditorType[];
}

export interface FileDropState {
  isDragging: boolean;
  isOver: boolean;
  dropPosition: { x: number; y: number } | null;
  previewFile: DroppedFile | null;
}

/**
 * Hook to handle file drag and drop from file manager to editor
 * 
 * Usage:
 * ```tsx
 * const { dropState, dropHandlers } = useFileDropToEditor({
 *   onFileDropped: (file) => console.log('Opened:', file.path),
 * });
 * 
 * <div {...dropHandlers}>
 *   {dropState.isOver && <DropOverlay />}
 * </div>
 * ```
 */
export function useFileDropToEditor(options: UseFileDropToEditorOptions = {}) {
  const { onFileDropped, onError, acceptedTypes } = options;
  
  const [dropState, setDropState] = useState<FileDropState>({
    isDragging: false,
    isOver: false,
    dropPosition: null,
    previewFile: null,
  });
  
  const dragCounterRef = useRef(0);
  const addEditorTab = useAppStore((state) => state.addEditorTab);
  const setActiveEditorTab = useAppStore((state) => state.setActiveEditorTab);
  const updateEditorTab = useAppStore((state) => state.updateEditorTab);
  const editorTabs = useAppStore((state) => state.editorTabs);

  /**
   * Check if file type is accepted
   */
  const isTypeAccepted = useCallback((type: EditorType): boolean => {
    if (!acceptedTypes || acceptedTypes.length === 0) {
      return true;
    }
    return acceptedTypes.includes(type);
  }, [acceptedTypes]);

  const readTextContent = useCallback(async (file: File, path: string, editorType: EditorType): Promise<string | null> => {
    const extension = path.split('.').pop()?.toLowerCase() || '';
    const isTextLike = editorType === 'markdown' || editorType === 'code' || (editorType === 'document' && ['txt', 'rtf'].includes(extension));

    if (!isTextLike) {
      return null;
    }

    if (file.size > 0) {
      return await file.text();
    }

    if (typeof window !== 'undefined' && window.electronAPI?.fs?.readFile && path) {
      const result = await window.electronAPI.fs.readFile(path, { encoding: 'utf-8' });
      if (result.ok && typeof result.content === 'string') {
        return result.content;
      }
    }

    return null;
  }, []);

  /**
   * Process dropped file and open in editor
   */
  const processDroppedFile = useCallback(async (file: File): Promise<DroppedFile | null> => {
    try {
      // Detect editor type
      const editorType = detectEditorType({ file });
      
      // Create virtual path for the file
      const path = file.webkitRelativePath || file.name;
      
      return processDroppedFileWithType(file, editorType, path);
      
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Failed to process file'));
      return null;
    }
  }, [addEditorTab, setActiveEditorTab, editorTabs, isTypeAccepted, onFileDropped, onError]);
  
  /**
   * Process dropped file with pre-detected type (for files from explorer)
   */
  const processDroppedFileWithType = useCallback(async (
    file: File,
    editorType: EditorType,
    path: string
  ): Promise<DroppedFile | null> => {
    try {
      // Check if type is accepted
      if (!isTypeAccepted(editorType)) {
        onError?.(new Error(`File type "${editorType}" is not accepted`));
        return null;
      }
      
      const droppedFile: DroppedFile = {
        file,
        type: editorType,
        path,
      };
      
      // Check if file is already open
      const existingTab = editorTabs.find(tab => tab.path === path);
      
      if (existingTab) {
        // Just activate the existing tab
        setActiveEditorTab(existingTab.id);
      } else {
        // Add new tab
        const newTabId = addEditorTab({
          type: editorType,
          title: file.name,
          path: path,
          isDirty: false,
        });

        const textContent = await readTextContent(file, path, editorType);
        if (textContent !== null) {
          updateEditorTab(newTabId, { content: textContent });
        }
        
        // If it's a spreadsheet or document, we need to read the file content
        // This is handled by the respective editor components
        
        setActiveEditorTab(newTabId);
      }
      
      onFileDropped?.(droppedFile);
      return droppedFile;
      
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Failed to process file'));
      return null;
    }
  }, [addEditorTab, setActiveEditorTab, updateEditorTab, editorTabs, isTypeAccepted, onFileDropped, onError, readTextContent]);

  /**
   * Handle drag enter
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounterRef.current++;
    
    // Check for custom file info from explorer (application/x-file-info)
    const types = Array.from(e.dataTransfer.types);
    const hasFileInfo = types.includes('application/x-file-info');
    
    if (hasFileInfo) {
      // File dragged from explorer - parse custom MIME type
      try {
        const fileInfoData = e.dataTransfer.getData('application/x-file-info');
        if (!fileInfoData) {
          // No data available, skip
          return;
        }
        const fileInfo = JSON.parse(fileInfoData);
        
        if (!fileInfo || !fileInfo.name || !fileInfo.path) {
          console.warn('Invalid file info:', fileInfo);
          return;
        }
        
        setDropState({
          isDragging: true,
          isOver: true,
          dropPosition: { x: e.clientX, y: e.clientY },
          previewFile: {
            file: new File([], fileInfo.name), // Virtual file object
            type: fileInfo.type as EditorType,
            path: fileInfo.path,
          },
        });
      } catch (err) {
        console.error('Failed to parse file info:', err);
      }
    }
    // Check if files are being dragged from OS file explorer
    else if (types.includes('Files') && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const editorType = detectEditorType({ file });
      
      setDropState({
        isDragging: true,
        isOver: true,
        dropPosition: { x: e.clientX, y: e.clientY },
        previewFile: {
          file,
          type: editorType,
          path: file.name,
        },
      });
    }
  }, []);

  /**
   * Handle drag leave
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounterRef.current--;
    
    if (dragCounterRef.current === 0) {
      setDropState({
        isDragging: false,
        isOver: false,
        dropPosition: null,
        previewFile: null,
      });
    }
  }, []);

  /**
   * Handle drag over
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Set drop effect
    e.dataTransfer.dropEffect = 'copy';
    
    // Update position
    setDropState(prev => ({
      ...prev,
      dropPosition: { x: e.clientX, y: e.clientY },
    }));
  }, []);

  /**
   * Handle drop
   */
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounterRef.current = 0;
    
    // Reset state
    setDropState({
      isDragging: false,
      isOver: false,
      dropPosition: null,
      previewFile: null,
    });
    
    // Check for custom file info from explorer (application/x-file-info)
    const types = Array.from(e.dataTransfer.types);
    const hasFileInfo = types.includes('application/x-file-info');
    
    if (hasFileInfo) {
      // File dragged from explorer - parse custom MIME type
      try {
        const fileInfoData = e.dataTransfer.getData('application/x-file-info');
        if (!fileInfoData) {
          return;
        }
        const fileInfo = JSON.parse(fileInfoData);
        
        if (!fileInfo || !fileInfo.name || !fileInfo.path) {
          return;
        }
        
        // Create virtual file object with the file info from explorer
        const virtualFile = new File([], fileInfo.name);
        
        // Use the file type detected in explorer (already parsed)
        await processDroppedFileWithType(virtualFile, fileInfo.type as EditorType, fileInfo.path);
      } catch (err) {
        console.error('Failed to process dropped file from explorer:', err);
        onError?.(err instanceof Error ? err : new Error('Failed to process file'));
      }
      return;
    }
    
    // Process files from OS file explorer
    const files = Array.from(e.dataTransfer.files);
    
    if (files.length === 0) {
      return;
    }
    
    // Process each file (for now, just the first one)
    // In the future, we could open multiple files
    for (const file of files) {
      await processDroppedFile(file);
    }
  }, [processDroppedFile, onError]);

  /**
   * Drop handlers to spread on target element
   */
  const dropHandlers = {
    onDragEnter: handleDragEnter,
    onDragLeave: handleDragLeave,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
  };

  return {
    dropState,
    dropHandlers,
    processDroppedFile,
    processDroppedFileWithType,
  };
}

/**
 * Get icon for editor type
 */
export function getEditorTypeIcon(type: EditorType): string {
  switch (type) {
    case 'spreadsheet':
      return 'Table';
    case 'document':
      return 'FileText';
    case 'markdown':
      return 'FileJson';
    case 'code':
    default:
      return 'FileCode';
  }
}

/**
 * Get color class for editor type
 */
export function getEditorTypeColor(type: EditorType): string {
  switch (type) {
    case 'spreadsheet':
      return 'text-green-500';
    case 'document':
      return 'text-blue-500';
    case 'markdown':
      return 'text-purple-500';
    case 'code':
    default:
      return 'text-gray-500';
  }
}

export default useFileDropToEditor;
