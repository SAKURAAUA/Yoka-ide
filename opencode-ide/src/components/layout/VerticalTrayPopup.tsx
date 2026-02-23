'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import {
  Code2,
  FolderGit,
  FolderOpen,
  GitBranch,
  MessageCircle,
  ScrollText,
  Plus,
  Trash2,
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  path: string;
  addedAt?: number;
}

export function VerticalTrayPopup() {
  const { createWindow, currentProject, setCurrentProject, setFileTree } = useAppStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const canUseElectron = typeof window !== 'undefined' && !!window.electronAPI;

  // 加载项目列表
  useEffect(() => {
    if (!canUseElectron) {
      setLoading(false);
      return;
    }

    const loadProjects = async () => {
      try {
        const result = await window.electronAPI.project.list();
        if (result.ok) {
          setProjects(result.projects || []);
        }
      } catch (error) {
        console.error('Failed to load projects:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [canUseElectron]);

  const items = [
    { id: 'chat' as const, icon: MessageCircle, label: '聊天', width: 640, height: 760 },
    { id: 'editor' as const, icon: Code2, label: '编辑器', width: 600, height: 500 },
    { id: 'git' as const, icon: FolderGit, label: 'Git', width: 400, height: 500 },
    { id: 'repository' as const, icon: GitBranch, label: '仓库', width: 400, height: 400 },
    { id: 'explorer' as const, icon: FolderOpen, label: '资源管理器', width: 300, height: 500 },
    { id: 'logs' as const, icon: ScrollText, label: '日志', width: 860, height: 620 },
  ];

  const getStableColor = (seed: string) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    const hue = hash % 360;
    return `hsl(${hue} 65% 55%)`;
  };

  // 选择项目并加载文件树
  const selectProject = useCallback(async (project: Project) => {
    setCurrentProject(project.id);
    
    // 保存当前项目 ID 到 localStorage，供其他窗口读取
    try {
      window.localStorage.setItem('currentProjectId', project.id);
    } catch {}
    
    // 加载项目的文件树
    if (canUseElectron) {
      try {
        const result = await window.electronAPI.fs.readDir(project.path);
        if (result.ok && result.items) {
          // 递归构建文件树
          const buildTree = async (dirPath: string, depth: number = 0): Promise<any[]> => {
            if (depth > 5) return []; // 限制递归深度
            
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

          const fileTree = await buildTree(project.path);
          setFileTree(fileTree);
        }
      } catch (error) {
        console.error('Failed to load file tree:', error);
      }
    }
  }, [canUseElectron, setCurrentProject, setFileTree]);

  // 添加新项目
  const addProject = useCallback(async () => {
    if (!canUseElectron) return;

    try {
      const result = await window.electronAPI.dialog.openFolder();
      
      if (result.ok && !result.canceled && result.path && result.name) {
        // 添加项目到列表
        const addResult = await window.electronAPI.project.add(result.name, result.path);
        
        const newProject = addResult.project;
        if (addResult.ok && newProject) {
          setProjects(prev => [...prev, newProject]);
          // 自动选择新项目
          selectProject(newProject);
        }
      }
    } catch (error) {
      console.error('Failed to add project:', error);
    }
  }, [canUseElectron, selectProject]);

  // 删除项目
  const removeProject = useCallback(async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!canUseElectron) return;

    try {
      const result = await window.electronAPI.project.remove(projectId);
      if (result.ok) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        // 如果删除的是当前项目，清除文件树
        if (currentProject === projectId) {
          setCurrentProject('');
          setFileTree([]);
        }
      }
    } catch (error) {
      console.error('Failed to remove project:', error);
    }
  }, [canUseElectron, currentProject, setCurrentProject, setFileTree]);

  const openWindow = useCallback(
    async (type: string, width: number, height: number) => {
      await createWindow(type as any, { width, height });
    },
    [createWindow]
  );

  const toggleProjectMenu = useCallback(
    async (projectId: string, anchorRect: DOMRect) => {
      if (!canUseElectron) return;

      const visible = await window.electronAPI.popup.isVisible({ popupId: 'project-menu' });
      const current = (typeof window !== 'undefined' && window.localStorage)
        ? window.localStorage.getItem('project-menu:projectId')
        : null;

      if (visible?.visible && current === projectId) {
        await window.electronAPI.popup.hide({ popupId: 'project-menu' });
        try {
          window.localStorage.removeItem('project-menu:projectId');
        } catch {}
        return;
      }

      const parentWindowId = window.electronAPI.app.getPopupParentWindowId() || undefined;

      const x = Math.round(window.screenX + window.outerWidth);
      const y = Math.round(window.screenY + anchorRect.top);
      const width = 380;
      const height = Math.round(window.outerHeight);

      await window.electronAPI.popup.show({
        popupId: 'project-menu',
        windowType: `popup:project-menu:${projectId}`,
        bounds: { x, y, width, height },
        parentWindowId,
        autoHide: false,
      });

      try {
        window.localStorage.setItem('project-menu:projectId', projectId);
      } catch {}
    },
    [canUseElectron]
  );

  return (
    <div className="flex flex-col h-full w-full bg-white text-gray-900 border-r border-gray-200">
      <div className="flex flex-col items-center py-2 gap-2 flex-1 overflow-auto">
        {loading ? (
          <div className="w-10 h-10 flex items-center justify-center text-gray-400">
            <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full" />
          </div>
        ) : projects.length === 0 ? (
          // 无项目时显示提示
          <div className="flex flex-col items-center gap-2 p-2">
            <span className="text-xs text-gray-400 text-center">暂无项目</span>
            <button
              onClick={addProject}
              className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-all"
              title="添加项目文件夹"
            >
              <Plus size={18} />
            </button>
          </div>
        ) : (
          <>
            {projects.map((project) => (
              <div key={project.id} className="relative group">
                <button
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-medium text-sm transition-all ${
                    currentProject === project.id
                      ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: getStableColor(project.id) }}
                  title={project.name}
                  onClick={(e) => {
                    selectProject(project);
                    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                    toggleProjectMenu(project.id, rect);
                  }}
                >
                  {project.name.charAt(0)}
                </button>
                {/* 删除按钮 - 悬停时显示 */}
                <button
                  onClick={(e) => removeProject(project.id, e)}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  title="删除项目"
                >
                  <Trash2 size={8} />
                </button>
              </div>
            ))}
            {/* 添加项目按钮 */}
            <button
              onClick={addProject}
              className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-all"
              title="添加项目文件夹"
            >
              <Plus size={18} />
            </button>
          </>
        )}
      </div>

      <div className="flex flex-col border-t border-gray-200">
        {items.map((item) => (
          <button
            key={item.id}
            className="flex items-center justify-center w-14 h-12 cursor-pointer text-gray-500 border-l-2 border-transparent transition-all hover:text-gray-700 hover:bg-gray-50"
            onClick={() => openWindow(item.id, item.width, item.height)}
            title={item.label}
          >
            <item.icon size={22} />
          </button>
        ))}
      </div>
    </div>
  );
}
