'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import type { EditorType } from '@/types/editor';
import { 
  ChevronDown, 
  ChevronRight, 
  Folder, 
  File,
  FileCode,
  FileText,
  FileSpreadsheet,
  Search,
  FolderOpen
} from 'lucide-react';

// 根据文件扩展名判断文件类型
function getFileTypeFromName(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const markdownExts = ['md', 'mdx', 'txt'];
  const codeExts = ['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'css', 'scss', 'less', 'json', 'xml', 'yaml', 'yml', 'sh', 'bash', 'sql', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'scala', 'r', 'lua', 'pl', 'r'];
  const docExts = ['doc', 'docx', 'pdf', 'rtf', 'odt'];
  const sheetExts = ['xls', 'xlsx', 'csv', 'ods'];
  const browserExts = ['html', 'htm'];
  
  if (browserExts.includes(ext)) return 'browser';
  if (markdownExts.includes(ext)) return 'markdown';
  if (codeExts.includes(ext)) return 'code';
  if (docExts.includes(ext)) return 'document';
  if (sheetExts.includes(ext)) return 'spreadsheet';
  return 'file';
}

function getFileIcon({ type, fileType, name }: { type: string; fileType?: string; name: string }) {
  if (type === 'folder') {
    return <Folder size={16} className="text-yellow-500" />;
  }
  
  // 如果有明确的 fileType，使用它
  if (fileType === 'code' || fileType === 'document' || fileType === 'spreadsheet' || fileType === 'markdown') {
    switch (fileType) {
      case 'code':
        return <FileCode size={16} className="text-blue-500" />;
      case 'document':
        return <FileText size={16} className="text-yellow-600" />;
      case 'spreadsheet':
        return <FileSpreadsheet size={16} className="text-green-500" />;
      case 'markdown':
        return <FileCode size={16} className="text-purple-500" />;
    }
  }
  
  // 否则根据扩展名判断
  const detectedType = getFileTypeFromName(name);
  switch (detectedType) {
    case 'code':
      return <FileCode size={16} className="text-blue-500" />;
    case 'document':
      return <FileText size={16} className="text-yellow-600" />;
    case 'spreadsheet':
      return <FileSpreadsheet size={16} className="text-green-500" />;
    case 'markdown':
      return <FileCode size={16} className="text-purple-500" />;
    default:
      return <File size={16} className="text-gray-400" />;
  }
}

interface FileTreeItem {
  name: string;
  path: string;
  type: 'folder' | 'file';
  isDirectory?: boolean;
  children?: FileTreeItem[];
  fileType?: string;
}

function TreeNode({ item, depth = 0 }: { item: FileTreeItem; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const { openFile } = useAppStore();
  
  const handleClick = () => {
    if (item.type === 'folder') {
      setExpanded(!expanded);
    } else {
      const fileType = getFileTypeFromName(item.name);
      // Map to proper editor type
      let editorType: EditorType;
      if (fileType === 'browser') editorType = 'browser';
      else if (fileType === 'spreadsheet') editorType = 'spreadsheet';
      else if (fileType === 'document') editorType = 'document';
      else if (fileType === 'markdown') editorType = 'markdown';
      else editorType = 'code';
      
      openFile({
        name: item.name,
        path: item.path,
        type: editorType,
        content: ''
      });
    }
  };
  
  // 处理文件拖拽开始
  const handleDragStart = (e: React.DragEvent) => {
    if (item.type === 'folder') {
      e.preventDefault();
      return;
    }
    
    // 设置拖拽数据
    e.dataTransfer.setData('application/x-file-info', JSON.stringify({
      name: item.name,
      path: item.path,
      type: getFileTypeFromName(item.name)
    }));
    e.dataTransfer.effectAllowed = 'copy';
    
    // 添加拖拽视觉反馈
    e.currentTarget.classList.add('opacity-50', 'bg-blue-100');
  };
  
  // 处理拖拽结束
  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-50', 'bg-blue-100');
  };
  
  return (
    <div>
      <div 
        className="flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 select-none"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
        draggable={item.type === 'file'}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        data-file-item="true"
      >
        {item.type === 'folder' ? (
          <>
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <Folder size={16} className="text-yellow-500 ml-1" />
          </>
        ) : (
          <>
            <span className="w-4" />
            {getFileIcon({ type: item.type, fileType: item.fileType, name: item.name })}
          </>
        )}
        <span className="ml-1.5 text-sm">{item.name}</span>
      </div>
      {item.type === 'folder' && expanded && item.children?.map((child) => (
        <TreeNode key={child.path} item={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function ExplorerPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const { fileTree, currentProject, setCurrentProject, setFileTree } = useAppStore();
  const [loading, setLoading] = useState(false);
  
  const canUseElectron = typeof window !== 'undefined' && !!window.electronAPI;

  // Explorer 窗口打开时，加载当前项目的文件树
  useEffect(() => {
    if (!canUseElectron) return;

    const loadFileTree = async () => {
      try {
        const result = await window.electronAPI.project.list();
        if (!result.ok || !result.projects || result.projects.length === 0) {
          return;
        }
        
        // 获取当前选中的项目（从 localStorage 或取第一个项目）
        const storedProjectId = window.localStorage.getItem('currentProjectId');
        const currentProj = result.projects.find((p: any) => p.id === storedProjectId) || result.projects[0];
        
        if (currentProj) {
          setLoading(true);
          setCurrentProject(currentProj.id);
          
          // 加载文件树
          const buildTree = async (dirPath: string, depth: number = 0): Promise<any[]> => {
            if (depth > 5) return [];
            
            const items = await window.electronAPI.fs.readDir(dirPath);
            if (!items.ok || !items.items) return [];
            
            const tree = await Promise.all(
              items.items.map(async (item: any) => {
                if (item.isDirectory) {
                  const children = await buildTree(item.path, depth + 1);
                  return { ...item, children };
                }
                return item;
              })
            );
            return tree;
          };
          
          const tree = await buildTree(currentProj.path);
          setFileTree(tree);
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to load file tree:', error);
        setLoading(false);
      }
    };

    loadFileTree();
  }, [canUseElectron, setCurrentProject, setFileTree]);
  
  // 过滤文件树
  const filterTree = (items: FileTreeItem[], query: string): FileTreeItem[] => {
    if (!query) return items;
    
    return items.reduce((acc: FileTreeItem[], item) => {
      if (item.name.toLowerCase().includes(query.toLowerCase())) {
        acc.push(item);
      } else if (item.children) {
        const filteredChildren = filterTree(item.children, query);
        if (filteredChildren.length > 0) {
          acc.push({ ...item, children: filteredChildren });
        }
      }
      return acc;
    }, []);
  };
  
  const filteredTree = filterTree(fileTree, searchQuery);
  
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Search box */}
      <div className="px-3 py-2 border-b border-gray-200">
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索文件..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded focus:border-blue-500 focus:outline-none"
            data-search-input="true"
          />
        </div>
      </div>
      
      {/* File tree */}
      <div className="flex-1 overflow-auto py-2">
        {!currentProject ? (
          // 无项目时显示提示
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
            <FolderOpen size={48} className="opacity-30" />
            <p className="text-sm">请先选择项目</p>
          </div>
        ) : filteredTree.length === 0 ? (
          // 无文件时显示提示
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
            <FolderOpen size={48} className="opacity-30" />
            <p className="text-sm">
              {searchQuery ? '没有匹配的文件' : '项目为空'}
            </p>
          </div>
        ) : (
          filteredTree.map((item) => (
            <TreeNode key={item.path} item={item} />
          ))
        )}
      </div>
    </div>
  );
}
