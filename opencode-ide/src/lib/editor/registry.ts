// OpenCode IDE - 编辑器注册表
// 管理所有编辑器的注册、查找和加载

import type { EditorType } from '@/types/editor';
import type { EditorPlugin, EditorPluginConfig, EditorRegistryItem, EditorRenderer } from './plugin';

/**
 * 编辑器注册表
 * 单例模式，管理所有已注册的编辑器
 */
class EditorRegistry {
  private registry: Map<EditorType, EditorRegistryItem> = new Map();
  private idRegistry: Map<string, EditorRegistryItem> = new Map();
  private extensionRegistry: Map<string, EditorRegistryItem> = new Map();
  
  /**
   * 注册编辑器插件
   */
  register(plugin: EditorPlugin, loader?: () => Promise<EditorPlugin>): void {
    const { editorType, id, extensions } = plugin.config;
    
    // 检查是否已注册
    if (this.registry.has(editorType)) {
      console.warn(`Editor type "${editorType}" is already registered, overwriting...`);
    }
    
    const item: EditorRegistryItem = {
      plugin,
      config: plugin.config,
      loaded: true,
      loader,
    };
    
    // 注册到主注册表
    this.registry.set(editorType, item);
    
    // 注册到 ID 注册表
    this.idRegistry.set(id, item);
    
    // 注册到扩展名注册表
    for (const ext of extensions) {
      this.extensionRegistry.set(ext.toLowerCase(), item);
    }
  }
  
  /**
   * 懒加载注册（9.3 动态加载机制）
   */
  registerLazy(editorType: EditorType, extensions: string[], loader: () => Promise<EditorPlugin>): void {
    // 创建占位符
    const item: EditorRegistryItem = {
      plugin: {
        config: {
          id: `lazy-${editorType}`,
          name: editorType,
          editorType,
          extensions,
          canEdit: true,
          canSave: true,
        },
        render: () => null, // 懒加载时不渲染
      },
      config: {
        id: `lazy-${editorType}`,
        name: editorType,
        editorType,
        extensions,
        canEdit: true,
        canSave: true,
      },
      loaded: false,
      loader,
    };
    
    this.registry.set(editorType, item);
    
    for (const ext of extensions) {
      this.extensionRegistry.set(ext.toLowerCase(), item);
    }
  }
  
  /**
   * 根据编辑器类型获取编辑器
   */
  get(editorType: EditorType): EditorPlugin | null {
    const item = this.registry.get(editorType);
    if (!item) return null;
    
    if (item.loaded) {
      return item.plugin;
    }
    
    // 懒加载
    if (item.loader) {
      return null; // 需要先调用 load()
    }
    
    return null;
  }
  
  /**
   * 懒加载编辑器
   */
  async load(editorType: EditorType): Promise<EditorPlugin | null> {
    const item = this.registry.get(editorType);
    if (!item || item.loaded) return item?.plugin ?? null;
    
    if (item.loader) {
      try {
        const plugin = await item.loader();
        item.plugin = plugin;
        item.loaded = true;
        return plugin;
      } catch (error) {
        console.error(`Failed to load editor "${editorType}":`, error);
        return null;
      }
    }
    
    return null;
  }
  
  /**
   * 根据文件扩展名获取编辑器
   */
  getByExtension(extension: string): EditorPlugin | null {
    const ext = extension.toLowerCase().replace(/^\./, '');
    const item = this.extensionRegistry.get(ext);
    
    if (!item) return null;
    
    if (item.loaded) {
      return item.plugin;
    }
    
    return null;
  }
  
  /**
   * 根据 ID 获取编辑器配置
   */
  getById(id: string): EditorPluginConfig | null {
    const item = this.idRegistry.get(id);
    return item?.config ?? null;
  }
  
  /**
   * 获取所有已注册的编辑器类型
   */
  getRegisteredTypes(): EditorType[] {
    return Array.from(this.registry.keys());
  }
  
  /**
   * 检查编辑器类型是否已注册
   */
  has(editorType: EditorType): boolean {
    return this.registry.has(editorType);
  }
  
  /**
   * 检查扩展名是否有对应的编辑器
   */
  hasExtension(extension: string): boolean {
    const ext = extension.toLowerCase().replace(/^\./, '');
    return this.extensionRegistry.has(ext);
  }
  
  /**
   * 移除编辑器
   */
  unregister(editorType: EditorType): boolean {
    const item = this.registry.get(editorType);
    if (!item) return false;
    
    // 从所有注册表中移除
    this.registry.delete(editorType);
    this.idRegistry.delete(item.config.id);
    
    for (const ext of item.config.extensions) {
      this.extensionRegistry.delete(ext.toLowerCase());
    }
    
    return true;
  }
  
  /**
   * 清空注册表
   */
  clear(): void {
    this.registry.clear();
    this.idRegistry.clear();
    this.extensionRegistry.clear();
  }
  
  /**
   * 获取渲染器（用于组件渲染）
   */
  getRenderer(editorType: EditorType): EditorRenderer | null {
    const plugin = this.get(editorType);
    if (!plugin) return null;
    
    return (props) => plugin.render(props);
  }
}

/**
 * 编辑器注册表单例
 */
export const editorRegistry = new EditorRegistry();

/**
 * 便捷函数：注册编辑器
 */
export function registerEditor(plugin: EditorPlugin): void {
  editorRegistry.register(plugin);
}

/**
 * 便捷函数：注册懒加载编辑器
 */
export function registerLazyEditor(
  editorType: EditorType,
  extensions: string[],
  loader: () => Promise<EditorPlugin>
): void {
  editorRegistry.registerLazy(editorType, extensions, loader);
}

/**
 * 便捷函数：获取编辑器
 */
export function getEditor(editorType: EditorType): EditorPlugin | null {
  return editorRegistry.get(editorType);
}

/**
 * 便捷函数：获取编辑器渲染器
 */
export function getEditorRenderer(editorType: EditorType): EditorRenderer | null {
  return editorRegistry.getRenderer(editorType);
}
