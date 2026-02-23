'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TiptapProvider } from './TiptapProvider';
import { FileJson, Bold, Italic, Link, Code, Image, List, ListOrdered, Heading1, Heading2, Heading3, Quote, Minus } from 'lucide-react';

export interface MarkdownEditorProps {
  initialContent?: string;
  placeholder?: string;
  editable?: boolean;
  onChange?: (markdown: string, html: string, json: any) => void;
  onSelectionChange?: (selection: any) => void;
}

/**
 * Convert Tiptap JSON to Markdown
 */
function tiptapToMarkdown(json: any): string {
  if (!json || !json.content) return '';
  
  let markdown = '';
  
  for (const node of json.content) {
    switch (node.type) {
      case 'paragraph':
        if (node.content) {
          markdown += renderInline(node.content) + '\n\n';
        } else {
          markdown += '\n';
        }
        break;
      case 'heading':
        const level = node.attrs?.level || 1;
        const hashes = '#'.repeat(level);
        if (node.content) {
          markdown += `${hashes} ${renderInline(node.content)}\n\n`;
        }
        break;
      case 'bulletList':
        if (node.content) {
          for (const item of node.content) {
            if (item.content) {
              markdown += `- ${renderInline(item.content)}\n`;
            }
          }
          markdown += '\n';
        }
        break;
      case 'orderedList':
        if (node.content) {
          let counter = 1;
          for (const item of node.content) {
            if (item.content) {
              markdown += `${counter++}. ${renderInline(item.content)}\n`;
            }
          }
          markdown += '\n';
        }
        break;
      case 'codeBlock':
        const lang = node.attrs?.language || '';
        markdown += `\`\`\`${lang}\n${node.content?.[0]?.text || ''}\n\`\`\`\n\n`;
        break;
      case 'blockquote':
        if (node.content) {
          for (const line of node.content) {
            if (line.content) {
              markdown += `> ${renderInline(line.content)}\n`;
            }
          }
          markdown += '\n';
        }
        break;
      case 'horizontalRule':
        markdown += '---\n\n';
        break;
    }
  }
  
  return markdown.trim();
}

function renderInline(content: any[]): string {
  if (!content) return '';
  
  let result = '';
  
  for (const node of content) {
    switch (node.type) {
      case 'text':
        let text = node.text || '';
        if (node.marks) {
          for (const mark of node.marks) {
            switch (mark.type) {
              case 'bold':
                text = `**${text}**`;
                break;
              case 'italic':
                text = `*${text}*`;
                break;
              case 'code':
                text = `\`${text}\``;
                break;
              case 'link':
                text = `[${text}](${mark.attrs?.url || ''})`;
                break;
            }
          }
        }
        result += text;
        break;
    }
  }
  
  return result;
}

/**
 * MarkdownEditor - Markdown editor using Tiptap
 * With markdown syntax shortcuts and preview
 */
export function MarkdownEditor({
  initialContent = '',
  placeholder = 'Write in Markdown...',
  editable = true,
  onChange,
  onSelectionChange,
}: MarkdownEditorProps) {
  const editor = useEditor({
    content: initialContent,
    editable,
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'language-markdown',
          },
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      const json = ed.getJSON();
      const markdown = tiptapToMarkdown(json);
      onChange?.(markdown, html, json);
    },
    onSelectionUpdate: ({ editor: ed }) => {
      onSelectionChange?.({
        from: ed.state.selection.from,
        to: ed.state.selection.to,
        text: ed.state.doc.textBetween(ed.state.selection.from, ed.state.selection.to),
      });
    },
    editorProps: {
      attributes: {
        class: 'markdown-editor-content',
      },
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

  // Keyboard shortcuts for markdown
  useEffect(() => {
    if (!editor) return;

    // Add custom keyboard shortcuts
    editor.setOptions({
      editorProps: {
        handleKeyDown: (view, event) => {
          // Shortcuts are handled by Tiptap/StarterKit automatically
          // This is for additional markdown-specific shortcuts
          return false;
        },
      },
    });
  }, [editor]);

  // Toolbar actions
  const toggleBold = useCallback(() => editor?.chain().focus().toggleBold().run(), [editor]);
  const toggleItalic = useCallback(() => editor?.chain().focus().toggleItalic().run(), [editor]);
  const toggleStrike = useCallback(() => editor?.chain().focus().toggleStrike().run(), [editor]);
  const setLink = useCallback(() => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);
  const toggleCode = useCallback(() => editor?.chain().focus().toggleCode().run(), [editor]);
  const toggleBulletList = useCallback(() => editor?.chain().focus().toggleBulletList().run(), [editor]);
  const toggleOrderedList = useCallback(() => editor?.chain().focus().toggleOrderedList().run(), [editor]);
  const toggleHeading = useCallback((level: 1 | 2 | 3) => editor?.chain().focus().toggleHeading({ level }).run(), [editor]);
  const toggleCodeBlock = useCallback(() => editor?.chain().focus().toggleCodeBlock().run(), [editor]);
  const toggleBlockquote = useCallback(() => editor?.chain().focus().toggleBlockquote().run(), [editor]);
  const setHorizontalRule = useCallback(() => editor?.chain().focus().setHorizontalRule().run(), [editor]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 text-gray-400">
        <div className="text-center">
          <FileJson size={48} className="mx-auto mb-4 opacity-50" />
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
        <button
          onClick={toggleStrike}
          className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('strike') ? 'bg-gray-200' : ''}`}
          title="Strikethrough"
        >
          <s style={{ fontSize: '14px' }}>S</s>
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
          onClick={toggleCode}
          className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('code') ? 'bg-gray-200' : ''}`}
          title="Inline Code"
        >
          <Code size={16} />
        </button>
        <button
          onClick={toggleCodeBlock}
          className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('codeBlock') ? 'bg-gray-200' : ''}`}
          title="Code Block"
        >
          <span style={{ fontSize: '12px' }}>{'{ }'}</span>
        </button>
        <button
          onClick={toggleBlockquote}
          className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('blockquote') ? 'bg-gray-200' : ''}`}
          title="Quote"
        >
          <Quote size={16} />
        </button>
        <button
          onClick={setLink}
          className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('link') ? 'bg-gray-200' : ''}`}
          title="Link"
        >
          <Link size={16} />
        </button>
        <button
          onClick={setHorizontalRule}
          className="p-1.5 rounded hover:bg-gray-200"
          title="Horizontal Rule"
        >
          <Minus size={16} />
        </button>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-auto p-4">
        <EditorContent 
          editor={editor} 
          className="markdown-editor prose prose-sm max-w-none focus:outline-none min-h-[200px]"
        />
      </div>
    </div>
  );
}

/**
 * MarkdownEditorWithProvider - MarkdownEditor with TiptapProvider
 */
export function MarkdownEditorWithProvider(props: MarkdownEditorProps) {
  return (
    <TiptapProvider>
      <MarkdownEditor {...props} />
    </TiptapProvider>
  );
}

export default MarkdownEditor;
