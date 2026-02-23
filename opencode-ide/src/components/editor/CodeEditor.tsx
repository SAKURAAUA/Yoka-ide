'use client';

import React, { useCallback, useMemo, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { autocompletion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';

export interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  height?: string;
  theme?: 'light' | 'dark';
  onSave?: (value: string) => void;
}

/**
 * Get language extension based on language string
 */
function getLanguageExtension(language?: string) {
  if (!language) return [];
  
  const lang = language.toLowerCase();
  
  switch (lang) {
    case 'javascript':
    case 'js':
      return [javascript({ jsx: true })];
    case 'typescript':
    case 'ts':
      return [javascript({ jsx: true, typescript: true })];
    case 'python':
    case 'py':
      return [python()];
    case 'html':
      return [html()];
    case 'css':
      return [css()];
    case 'json':
      return [json()];
    case 'markdown':
    case 'md':
      return [markdown()];
    default:
      return [];
  }
}

/**
 * Custom autocompletion for common code patterns
 */
function customCompletions(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/\w*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  
  return {
    from: word.from,
    options: [
      // Common JavaScript/TypeScript
      { label: 'console.log', type: 'function', info: 'Log to console', apply: 'console.log(${1:message})$0' },
      { label: 'function', type: 'keyword', info: 'Function declaration', apply: 'function ${1:name}(${2:params}) {\n  ${0}\n}' },
      { label: 'const', type: 'keyword', info: 'Constant declaration' },
      { label: 'let', type: 'keyword', info: 'Let declaration' },
      { label: 'if', type: 'keyword', info: 'If statement' },
      { label: 'else', type: 'keyword', info: 'Else statement' },
      { label: 'for', type: 'keyword', info: 'For loop' },
      { label: 'while', type: 'keyword', info: 'While loop' },
      { label: 'return', type: 'keyword', info: 'Return statement' },
      { label: 'async', type: 'keyword', info: 'Async function' },
      { label: 'await', type: 'keyword', info: 'Await expression' },
      { label: 'import', type: 'keyword', info: 'Import statement' },
      { label: 'export', type: 'keyword', info: 'Export statement' },
      { label: 'class', type: 'keyword', info: 'Class declaration' },
      { label: 'interface', type: 'keyword', info: 'Interface declaration (TypeScript)' },
      { label: 'type', type: 'keyword', info: 'Type alias' },
      // React
      { label: 'useState', type: 'function', info: 'React useState hook', apply: 'useState(${1:initial})$0' },
      { label: 'useEffect', type: 'function', info: 'React useEffect hook', apply: 'useEffect(() => {\n  ${0}\n}, [${1:deps}])' },
      { label: 'useCallback', type: 'function', info: 'React useCallback hook', apply: 'useCallback(() => {\n  ${0}\n}, [${1:deps}])' },
      { label: 'useRef', type: 'function', info: 'React useRef hook', apply: 'useRef(${1:null})$0' },
      { label: 'component', type: 'snippet', info: 'React component template', apply: 'function ${1:Component}(${2:props}) {\n  return (\n    <div>${0}</div>\n  );\n}' },
    ],
  };
}

/**
 * CodeEditor component using CodeMirror 6
 */
export function CodeEditor({
  value,
  onChange,
  language = 'javascript',
  readOnly = false,
  height = '100%',
  theme = 'light',
  onSave,
}: CodeEditorProps) {
  // Get language extensions
  const extensions = useMemo(() => {
    const langExt = getLanguageExtension(language);
    
    const baseExtensions = [
      EditorView.lineWrapping,
      history(),
      highlightSelectionMatches(),
      autocompletion({ override: [customCompletions] }),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
        // Ctrl+S / Cmd+S to save
        {
          key: 'Mod-s',
          run: () => {
            onSave?.(value);
            return true;
          },
        },
      ]),
    ];
    
    // Add dark theme if needed
    if (theme === 'dark') {
      baseExtensions.push(oneDark);
    }
    
    return [...baseExtensions, ...langExt];
  }, [language, theme, onSave, value]);
  
  // Handle change
  const handleChange = useCallback((val: string) => {
    onChange?.(val);
  }, [onChange]);
  
  // Calculate min height for the editor
  const editorHeight = height === '100%' ? 'min-h-[200px]' : height;
  
  return (
    <div className={`codemirror-wrapper ${editorHeight}`}>
      <CodeMirror
        value={value}
        height={height}
        extensions={extensions}
        onChange={handleChange}
        readOnly={readOnly}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightSpecialChars: true,
          history: true,
          foldGutter: true,
          drawSelection: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          syntaxHighlighting: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: true,
          crosshairCursor: true,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          closeBracketsKeymap: true,
          defaultKeymap: true,
          searchKeymap: true,
          historyKeymap: true,
          foldKeymap: true,
          completionKeymap: true,
          lintKeymap: true,
        }}
        className="h-full text-sm"
        theme={theme}
      />
    </div>
  );
}

export default CodeEditor;
