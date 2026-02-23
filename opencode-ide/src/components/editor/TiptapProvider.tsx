'use client';

import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import DragHandle from '@tiptap/extension-drag-handle';

export interface TiptapEditorConfig {
  content?: string;
  placeholder?: string | false;
  editable?: boolean;
  autofocus?: boolean;
  /**
   * Enable drag handle for headings/sections
   */
  enableDragHandle?: boolean;
  /**
   * Callback when editor is ready
   */
  onReady?: (editor: Editor) => void;
  /**
   * Callback when content changes
   */
  onUpdate?: (editor: Editor) => void;
  /**
   * Callback when selection changes
   */
  onSelectionUpdate?: (editor: Editor) => void;
  /**
   * Callback when editor is destroyed
   */
  onDestroy?: () => void;
}

export interface TiptapContextValue {
  /**
   * Create a new Tiptap editor instance
   */
  createEditor: (config: TiptapEditorConfig) => Editor;
  
  /**
   * Get default extensions
   */
  getDefaultExtensions: () => any[];
}

const TiptapContext = createContext<TiptapContextValue | null>(null);

interface TiptapProviderProps {
  children: ReactNode;
}

/**
 * TiptapProvider - Provides Tiptap editor context and utilities
 */
export function TiptapProvider({ children }: TiptapProviderProps) {
  const createEditor = (config: TiptapEditorConfig): Editor => {
    const extensions: any[] = [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
    ];

    // Add placeholder
    if (config.placeholder !== false) {
      extensions.push(
        Placeholder.configure({
          placeholder: config.placeholder || 'Start typing...',
          emptyEditorClass: 'is-editor-empty',
        })
      );
    }

    // Add drag handle
    if (config.enableDragHandle) {
      extensions.push(
        DragHandle.configure()
      );
    }

    const editor = new Editor({
      content: config.content,
      editable: config.editable ?? true,
      autofocus: config.autofocus ?? false,
      extensions,
      onCreate: ({ editor: createdEditor }) => {
        config.onReady?.(createdEditor);
      },
      onUpdate: ({ editor: updatedEditor }) => {
        config.onUpdate?.(updatedEditor);
      },
      onSelectionUpdate: ({ editor: updatedEditor }) => {
        config.onSelectionUpdate?.(updatedEditor);
      },
      onDestroy: () => {
        config.onDestroy?.();
      },
    });

    return editor;
  };

  const getDefaultExtensions = () => {
    return [
      StarterKit,
      Placeholder,
      DragHandle,
    ];
  };

  const value = useMemo<TiptapContextValue>(() => ({
    createEditor,
    getDefaultExtensions,
  }), []);

  return (
    <TiptapContext.Provider value={value}>
      {children}
    </TiptapContext.Provider>
  );
}

/**
 * Hook to use Tiptap context
 */
export function useTiptap(): TiptapContextValue {
  const context = useContext(TiptapContext);
  if (!context) {
    throw new Error('useTiptap must be used within a TiptapProvider');
  }
  return context;
}

/**
 * Hook to create and manage a Tiptap editor instance
 */
export function useTiptapEditor(config?: TiptapEditorConfig) {
  const { createEditor } = useTiptap();
  const editor = useMemo(() => {
    if (!config) return null;
    return createEditor(config);
  }, [config, createEditor]);

  return editor;
}

export default TiptapProvider;
