// OpenCode IDE - 统一文件读写 API
// 为所有编辑器提供一致的文件操作接口

import type { EditorType } from '@/types/editor';

/**
 * 文件读取结果
 */
export interface FileReadResult {
  ok: boolean;
  content?: string;
  error?: string;
  encoding?: string;
}

/**
 * 文件写入结果
 */
export interface FileWriteResult {
  ok: boolean;
  error?: string;
}

/**
 * 文件操作接口
 */
export interface IFileSystem {
  /** 读取文件 */
  readFile: (path: string, options?: { encoding?: BufferEncoding }) => Promise<FileReadResult>;
  /** 写入文件 */
  writeFile: (path: string, content: string, options?: { encoding?: BufferEncoding }) => Promise<FileWriteResult>;
}

/**
 * Electron 文件系统实现
 */
class ElectronFileSystem implements IFileSystem {
  async readFile(path: string, options?: { encoding?: BufferEncoding }): Promise<FileReadResult> {
    if (typeof window === 'undefined' || !window.electronAPI?.fs?.readFile) {
      return { ok: false, error: 'Electron API not available' };
    }
    
    try {
      const result = await window.electronAPI.fs.readFile(path, options);
      return result as FileReadResult;
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  }

  async writeFile(path: string, content: string, options?: { encoding?: BufferEncoding }): Promise<FileWriteResult> {
    if (typeof window === 'undefined' || !window.electronAPI?.fs?.writeFile) {
      return { ok: false, error: 'Electron API not available' };
    }
    
    try {
      const result = await window.electronAPI.fs.writeFile(path, content, options);
      return result as FileWriteResult;
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  }
}

/**
 * 浏览器本地文件系统实现（用于演示/测试）
 */
class LocalFileSystem implements IFileSystem {
  private fileCache: Map<string, string> = new Map();

  async readFile(path: string, options?: { encoding?: BufferEncoding }): Promise<FileReadResult> {
    // 模拟读取
    const content = this.fileCache.get(path);
    if (content !== undefined) {
      return { ok: true, content, encoding: options?.encoding || 'utf-8' };
    }
    return { ok: false, error: 'File not found' };
  }

  async writeFile(path: string, content: string, options?: { encoding?: BufferEncoding }): Promise<FileWriteResult> {
    this.fileCache.set(path, content);
    return { ok: true };
  }
}

/**
 * 文件系统工厂
 */
class FileSystemFactory {
  private static instance: IFileSystem | null = null;

  static getFileSystem(): IFileSystem {
    if (!this.instance) {
      // 检测环境
      if (typeof window !== 'undefined' && window.electronAPI && 'fs' in window.electronAPI && typeof window.electronAPI.fs.readFile === 'function') {
        this.instance = new ElectronFileSystem();
      } else {
        this.instance = new LocalFileSystem();
      }
    }
    return this.instance;
  }

  static setFileSystem(fs: IFileSystem): void {
    this.instance = fs;
  }
}

/**
 * 获取文件系统实例
 */
export function getFileSystem(): IFileSystem {
  return FileSystemFactory.getFileSystem();
}

/**
 * 读取文件（便捷函数）
 */
export async function readFile(path: string, encoding: BufferEncoding = 'utf-8'): Promise<FileReadResult> {
  return getFileSystem().readFile(path, { encoding });
}

/**
 * 写入文件（便捷函数）
 */
export async function writeFile(path: string, content: string, encoding: BufferEncoding = 'utf-8'): Promise<FileWriteResult> {
  return getFileSystem().writeFile(path, content, { encoding });
}

/**
 * 编辑器文件操作适配器
 * 将统一文件 API 适配到特定编辑器的需求
 */
export interface EditorFileAdapter {
  /** 读取编辑器文件 */
  read: (path: string) => Promise<string>;
  /** 写入编辑器文件 */
  write: (path: string, content: string) => Promise<void>;
  /** 检查文件是否可编辑 */
  canEdit: (path: string, editorType: EditorType) => boolean;
  /** 检查文件是否可保存 */
  canSave: (path: string, editorType: EditorType) => boolean;
  /** 获取文件扩展名 */
  getExtension: (path: string) => string;
}

/**
 * 默认编辑器文件适配器
 */
class DefaultEditorFileAdapter implements EditorFileAdapter {
  private supportedExtensions: Record<EditorType, string[]> = {
    code: ['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'c', 'cpp', 'h', 'css', 'scss', 'less', 'json', 'xml', 'yaml', 'yml', 'sh', 'bash', 'sql', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'scala', 'r', 'lua', 'pl', 'md'],
    document: ['txt', 'rtf', 'doc', 'docx', 'odt'],
    spreadsheet: ['xls', 'xlsx', 'csv', 'ods'],
    markdown: ['md', 'mdx', 'txt'],
    browser: ['html', 'htm'],
  };

  async read(path: string): Promise<string> {
    const result = await readFile(path);
    if (!result.ok) {
      throw new Error(result.error || 'Failed to read file');
    }
    return result.content || '';
  }

  async write(path: string, content: string): Promise<void> {
    const result = await writeFile(path, content);
    if (!result.ok) {
      throw new Error(result.error || 'Failed to write file');
    }
  }

  canEdit(path: string, editorType: EditorType): boolean {
    // 特殊处理：电子表格通常不可直接编辑文本
    if (editorType === 'spreadsheet') {
      return false;
    }
    return this.supportedExtensions[editorType]?.some(ext => 
      path.toLowerCase().endsWith(`.${ext}`)
    ) ?? false;
  }

  canSave(path: string, editorType: EditorType): boolean {
    // 浏览器编辑器保存的是 URL，不是文件内容
    if (editorType === 'browser') {
      return false;
    }
    // 电子表格通过专用导出
    if (editorType === 'spreadsheet') {
      return false;
    }
    return this.supportedExtensions[editorType]?.some(ext => 
      path.toLowerCase().endsWith(`.${ext}`)
    ) ?? false;
  }

  getExtension(path: string): string {
    const parts = path.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
  }
}

/**
 * 获取编辑器文件适配器
 */
export function getEditorFileAdapter(): EditorFileAdapter {
  return new DefaultEditorFileAdapter();
}

/**
 * 检查编辑器类型是否支持文件保存
 */
export function isEditorSavable(editorType: EditorType): boolean {
  // browser 和 spreadsheet 需要特殊处理
  return ['code', 'document', 'markdown'].includes(editorType);
}

/**
 * 检查编辑器类型是否支持文本内容
 */
export function isEditorTextBased(editorType: EditorType): boolean {
  return ['code', 'document', 'markdown'].includes(editorType);
}
