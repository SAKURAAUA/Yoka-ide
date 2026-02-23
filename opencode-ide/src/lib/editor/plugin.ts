// OpenCode IDE - 编辑器插件系统
// 支持可插拔的编辑器架构

import type { EditorType } from '@/types/editor';
import type { ReactNode } from 'react';

/**
 * 编辑器插件配置
 */
export interface EditorPluginConfig {
  /** 插件唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 支持的文件类型 */
  editorType: EditorType;
  /** 支持的文件扩展名 */
  extensions: string[];
  /** MIME 类型 */
  mimeTypes?: string[];
  /** 是否可编辑 */
  canEdit: boolean;
  /** 是否可保存 */
  canSave: boolean;
}

/**
 * 编辑器属性
 */
export interface EditorProps {
  /** 文件路径 */
  path?: string;
  /** 文件名 */
  title?: string;
  /** 文件内容 */
  content: string;
  /** 是否可编辑 */
  editable?: boolean;
  /** 内容变更回调 */
  onChange?: (content: string) => void;
  /** 保存回调 */
  onSave?: () => void | Promise<void>;
  /** 加载完成回调 */
  onReady?: () => void;
  /** 自定义属性 */
  [key: string]: unknown;
}

/**
 * 编辑器插件接口
 * 所有编辑器必须实现此接口
 */
export interface EditorPlugin {
  /** 插件配置 */
  config: EditorPluginConfig;
  
  /** 渲染编辑器组件 */
  render: (props: EditorProps) => ReactNode;
  
  /** 读取文件内容（可选实现） */
  readFile?: (content: ArrayBuffer, path: string) => Promise<string>;
  
  /** 写入文件内容（可选实现） */
  writeFile?: (content: string) => string | ArrayBuffer | Promise<string | ArrayBuffer>;
  
  /** 获取文件扩展名对应的语言 */
  getLanguage?: (path: string) => string;
  
  /** 验证文件是否支持 */
  validate?: (path: string, content?: string) => boolean;
}

/**
 * 编辑器注册表项
 */
export interface EditorRegistryItem {
  plugin: EditorPlugin;
  config: EditorPluginConfig;
  /** 是否已加载 */
  loaded: boolean;
  /** 懒加载函数 */
  loader?: () => Promise<EditorPlugin>;
}

/**
 * 编辑器渲染器 - 将编辑器组件包装为统一接口
 */
export interface EditorRenderer {
  /** 渲染编辑器 */
  (props: EditorProps): ReactNode;
  /** 组件名称 */
  componentName?: string;
}

/**
 * 内置编辑器类型到组件的映射（向后兼容）
 */
export type BuiltInEditorType = 'spreadsheet' | 'document' | 'markdown' | 'code' | 'browser';

/**
 * 编辑器注册表错误
 */
export class EditorRegistryError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'EditorRegistryError';
  }
}
