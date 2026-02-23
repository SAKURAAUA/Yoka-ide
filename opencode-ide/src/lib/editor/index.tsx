// OpenCode IDE - 编辑器初始化器
// 注册所有内置编辑器到注册表

import React from 'react';
import type { EditorPlugin, EditorRenderer } from './plugin';
import { editorRegistry } from './registry';
import { readFile, isEditorSavable, isEditorTextBased } from './fileSystem';

import type { EditorType } from '@/types/editor';

// 编辑器组件类型
type EditorComponent = React.ComponentType<any>;

/**
 * 内置编辑器映射
 */
const BUILT_IN_EDITORS: Record<EditorType, {
  component: EditorComponent;
  extensions: string[];
  canEdit: boolean;
  canSave: boolean;
}> = {
  spreadsheet: {
    component: null as unknown as EditorComponent, // 动态加载
    extensions: ['xls', 'xlsx', 'xlsm', 'csv', 'ods'],
    canEdit: true,
    canSave: false, // 通过专用导出
  },
  document: {
    component: null as unknown as EditorComponent,
    extensions: ['txt', 'rtf', 'doc', 'docx', 'odt'],
    canEdit: true,
    canSave: true,
  },
  markdown: {
    component: null as unknown as EditorComponent,
    extensions: ['md', 'mdx', 'txt'],
    canEdit: true,
    canSave: true,
  },
  code: {
    component: null as unknown as EditorComponent,
    extensions: ['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'c', 'cpp', 'h', 'css', 'scss', 'less', 'json', 'xml', 'yaml', 'yml', 'sh', 'bash', 'sql', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'scala', 'r', 'lua', 'pl'],
    canEdit: true,
    canSave: true,
  },
  browser: {
    component: null as unknown as EditorComponent,
    extensions: ['html', 'htm'],
    canEdit: true,
    canSave: false, // 保存 URL
  },
};

/**
 * 懒加载编辑器组件
 */
const lazyLoaders: Partial<Record<EditorType, () => Promise<{ default: EditorComponent }>>> = {
  spreadsheet: () => import('../../components/editor/SpreadsheetEditor').then(m => ({ default: m.SpreadsheetEditor })),
  document: () => import('../../components/editor/DocumentEditor').then(m => ({ default: m.DocumentEditor })),
  markdown: () => import('../../components/editor/MarkdownEditor').then(m => ({ default: m.MarkdownEditor })),
  code: () => import('../../components/editor/CodeEditor').then(m => ({ default: m.CodeEditor })),
  browser: () => import('../../components/editor/BrowserEditor').then(m => ({ default: m.BrowserEditor })),
};

/**
 * 创建内置编辑器插件
 */
function createBuiltInEditorPlugin(
  editorType: EditorType,
  component: EditorComponent,
  extensions: string[],
  canEdit: boolean,
  canSave: boolean
): EditorPlugin {
  return {
    config: {
      id: `builtin-${editorType}`,
      name: editorType.charAt(0).toUpperCase() + editorType.slice(1),
      editorType,
      extensions,
      canEdit,
      canSave,
    },
    render: (props) => {
      const Component = component;
      return <Component {...props} />;
    },
    getLanguage: (path: string): string => {
      const ext = path.split('.').pop()?.toLowerCase();
      const languageMap: Record<string, string> = {
        ts: 'typescript',
        tsx: 'typescript',
        js: 'javascript',
        jsx: 'javascript',
        py: 'python',
        java: 'java',
        c: 'c',
        cpp: 'cpp',
        h: 'c',
        css: 'css',
        scss: 'scss',
        json: 'json',
        xml: 'xml',
        yaml: 'yaml',
        yml: 'yaml',
        html: 'html',
        htm: 'html',
        md: 'markdown',
        mdx: 'markdown',
      };
      return languageMap[ext || ''] || 'plaintext';
    },
    validate: (path: string): boolean => {
      const ext = path.split('.').pop()?.toLowerCase();
      return extensions.includes(ext || '');
    },
  };
}

/**
 * 初始化所有内置编辑器（懒加载）
 */
export async function initializeEditors(): Promise<void> {
  console.log('[EditorRegistry] Initializing editors...');
  
  for (const [editorType, config] of Object.entries(BUILT_IN_EDITORS)) {
    const loader = lazyLoaders[editorType as EditorType];
    
    if (loader) {
      // 注册懒加载
      editorRegistry.registerLazy(
        editorType as EditorType,
        config.extensions,
        async () => {
          const module = await loader();
          return createBuiltInEditorPlugin(
            editorType as EditorType,
            module.default,
            config.extensions,
            config.canEdit,
            config.canSave
          );
        }
      );
    }
  }
  
  console.log('[EditorRegistry] Editors initialized:', editorRegistry.getRegisteredTypes());
}

/**
 * 获取编辑器渲染器
 */
export function getEditorComponent(editorType: EditorType): EditorRenderer | null {
  return editorRegistry.getRenderer(editorType);
}

/**
 * 检查编辑器是否支持文件保存
 */
export function canSaveFile(editorType: EditorType): boolean {
  return isEditorSavable(editorType);
}

/**
 * 检查编辑器是否基于文本
 */
export function isTextEditor(editorType: EditorType): boolean {
  return isEditorTextBased(editorType);
}

/**
 * 读取编辑器文件
 */
export async function readEditorFile(path: string): Promise<string> {
  const result = await readFile(path);
  if (!result.ok) {
    throw new Error(result.error || 'Failed to read file');
  }
  return result.content || '';
}

// 导出注册表
export { editorRegistry };
