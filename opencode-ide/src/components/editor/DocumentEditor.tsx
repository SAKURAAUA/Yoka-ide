'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import DragHandle from '@tiptap/extension-drag-handle';
import { TiptapProvider } from './TiptapProvider';
import { FileText, Bold, Italic, List, ListOrdered, Heading1, Heading2, Heading3, Code, Quote, Undo, Redo } from 'lucide-react';

export interface DocumentEditorProps {
  initialContent?: string;
  placeholder?: string;
  editable?: boolean;
  onChange?: (text: string, html: string, json: any) => void;
  onSelectionChange?: (selection: any) => void;
}

/**
 * DocumentEditor - Rich text document editor using Tiptap
 * Notion-style editing experience
 */
export function DocumentEditor({
  initialContent = '',
  placeholder = 'Start writing...',
  editable = true,
  onChange,
  onSelectionChange,
}: DocumentEditorProps) {
  const editor = useEditor({
    content: initialContent,
    editable,
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      DragHandle.configure(),
    ],
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getText(), ed.getHTML(), ed.getJSON());
    },
    onSelectionUpdate: ({ editor: ed }) => {
      onSelectionChange?.({
        from: ed.state.selection.from,
        to: ed.state.selection.to,
        text: ed.state.doc.textBetween(ed.state.selection.from, ed.state.selection.to),
      });
    },
  });

  const lastContentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!editor) return;
    if (initialContent === lastContentRef.current) return;
    if (initialContent === '' && lastContentRef.current !== null) return;

    editor.commands.setContent(initialContent || '');
    lastContentRef.current = initialContent || '';
  }, [editor, initialContent]);

  // Toolbar actions
  const toggleBold = useCallback(() => editor?.chain().focus().toggleBold().run(), [editor]);
  const toggleItalic = useCallback(() => editor?.chain().focus().toggleItalic().run(), [editor]);
  const toggleBulletList = useCallback(() => editor?.chain().focus().toggleBulletList().run(), [editor]);
  const toggleOrderedList = useCallback(() => editor?.chain().focus().toggleOrderedList().run(), [editor]);
  const toggleHeading = useCallback((level: 1 | 2 | 3) => editor?.chain().focus().toggleHeading({ level }).run(), [editor]);
  const toggleCodeBlock = useCallback(() => editor?.chain().focus().toggleCodeBlock().run(), [editor]);
  const toggleBlockquote = useCallback(() => editor?.chain().focus().toggleBlockquote().run(), [editor]);
  const undo = useCallback(() => editor?.chain().focus().undo().run(), [editor]);
  const redo = useCallback(() => editor?.chain().focus().redo().run(), [editor]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 text-gray-400">
        <div className="text-center">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p>Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border-b border-gray-200 flex-wrap">
        <button
          onClick={toggleBold}
          className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
          title="Bold (Ctrl+B)"
        >
          <Bold size={16} />
        </button>
        <button
          onClick={toggleItalic}
          className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
          title="Italic (Ctrl+I)"
        >
          <Italic size={16} />
        </button>
        
        <div className="w-px h-5 bg-gray-300 mx-1" />
        
        <button
          onClick={() => toggleHeading(1)}
          className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''}`}
          title="Heading 1"
        >
          <Heading1 size={16} />
        </button>
        <button
          onClick={() => toggleHeading(2)}
          className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}`}
          title="Heading 2"
        >
          <Heading2 size={16} />
        </button>
        <button
          onClick={() => toggleHeading(3)}
          className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : ''}`}
          title="Heading 3"
        >
          <Heading3 size={16} />
        </button>
        
        <div className="w-px h-5 bg-gray-300 mx-1" />
        
        <button
          onClick={toggleBulletList}
          className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
          title="Bullet List"
        >
          <List size={16} />
        </button>
        <button
          onClick={toggleOrderedList}
          className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}
          title="Numbered List"
        >
          <ListOrdered size={16} />
        </button>
        
        <div className="w-px h-5 bg-gray-300 mx-1" />
        
        <button
          onClick={toggleCodeBlock}
          className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('codeBlock') ? 'bg-gray-200' : ''}`}
          title="Code Block"
        >
          <Code size={16} />
        </button>
        <button
          onClick={toggleBlockquote}
          className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('blockquote') ? 'bg-gray-200' : ''}`}
          title="Quote"
        >
          <Quote size={16} />
        </button>
        
        <div className="flex-1" />
        
        <button
          onClick={undo}
          className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50"
          disabled={!editor.can().undo()}
          title="Undo (Ctrl+Z)"
        >
          <Undo size={16} />
        </button>
        <button
          onClick={redo}
          className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50"
          disabled={!editor.can().redo()}
          title="Redo (Ctrl+Y)"
        >
          <Redo size={16} />
        </button>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-auto p-4">
        <EditorContent 
          editor={editor} 
          className="prose prose-sm max-w-none focus:outline-none min-h-[200px]"
        />
      </div>
    </div>
  );
}

/**
 * DocumentEditorWithProvider - DocumentEditor with TiptapProvider
 */
export function DocumentEditorWithProvider(props: DocumentEditorProps) {
  return (
    <TiptapProvider>
      <DocumentEditor {...props} />
    </TiptapProvider>
  );
}

export default DocumentEditor;
