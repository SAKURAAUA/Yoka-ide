import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createAIStoreSlice, type AIStoreState } from '@/store/ai-store';
import { createEditorStoreSlice, type EditorStore } from '@/store/editor-store';
import { 
  Message, 
  ImageAttachment, 
  FileItem, 
  OpenFile,
  ActiveTab,
  ConfigStatus,
  WindowInstance,
  WindowType,
  WindowOptions,
  DockPosition,
  DockNode,
  DockPreview,
  GitRepository,
  GitFile,
  GitCommit
} from '@/types';

interface AppState extends AIStoreState, EditorStore {
  // === Layout ===
  activeTab: ActiveTab;
  sidebarWidth: number;
  currentProject: string;
  
  // === Window Management ===
  windows: WindowInstance[];
  activeWindowId: string | null;
  layoutMode: 'fixed' | 'floating';
  dockedAreas: Record<DockPosition, string | null>;
  
  // === Docking System ===
  dockNodes: Map<string, DockNode>;
  dockContainers: any[];
  draggingWindowId: string | null;
  dragStartBounds: any;
  dragPosition: { x: number; y: number } | null;
  previewDock: DockPreview | null;
  separatePreviewBounds: { x: number; y: number; width: number; height: number } | null;
  
  // === Chat ===
  activeConversationId: string;
  conversations: Array<{ id: string; title: string; projectId: string }>;
  conversationMessages: Record<string, Message[]>;
  messages: Message[];
  imageAttachments: ImageAttachment[];
  isLoading: boolean;
  
  // === Files ===
  fileTree: FileItem[];
  openFiles: OpenFile[];
  activeFile: OpenFile | null;
  
  // === Git ===
  gitRepository: GitRepository | null;
  gitWorkingTree: {
    modified: GitFile[];
    staged: GitFile[];
    untracked: GitFile[];
    deleted: GitFile[];
  };
  gitCommits: GitCommit[];
  gitCommitMessage: string;
  
  // === Config ===
  configStatus: ConfigStatus;
  
  // === Actions ===
  setActiveTab: (tab: ActiveTab) => void;
  setSidebarWidth: (width: number) => void;
  setCurrentProject: (projectId: string) => void;
  
  // Window actions
  createWindow: (type: WindowType, options?: WindowOptions) => Promise<string>;
  closeWindow: (windowId: string) => void;
  updateWindow: (windowId: string, updates: Partial<WindowInstance>) => void;
  moveWindow: (windowId: string, position: { x: number; y: number }) => void;
  resizeWindow: (windowId: string, size: { width: number; height: number }) => void;
  dockWindow: (windowId: string, position: DockPosition) => void;
  undockWindow: (windowId: string) => void;
  toggleAlwaysOnTop: (windowId: string) => void;
  setWindowOpacity: (windowId: string, opacity: number) => void;
  focusWindow: (windowId: string) => void;
  setLayoutMode: (mode: 'fixed' | 'floating') => void;
  
  // Docking actions
  startDrag: (windowId: string, bounds: { x: number; y: number; width: number; height: number }) => void;
  updateDrag: (x: number, y: number) => void;
  endDrag: () => void;
  setPreviewDock: (preview: DockPreview | null) => void;
  clearPreviewDock: () => void;
  setSeparatePreviewBounds: (bounds: { x: number; y: number; width: number; height: number } | null) => void;
  clearSeparatePreviewBounds: () => void;
  
  // Chat actions
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  setActiveConversation: (conversationId: string) => void;
  upsertConversation: (conversation: { id: string; title: string; projectId: string }) => void;
  addImageAttachment: (image: Omit<ImageAttachment, 'id'>) => void;
  removeImageAttachment: (id: string) => void;
  clearImageAttachments: () => void;
  setIsLoading: (loading: boolean) => void;
  
  // File actions
  setFileTree: (tree: FileItem[]) => void;
  openFile: (file: OpenFile) => void;
  closeFile: (path: string) => void;
  setActiveFile: (file: OpenFile | null) => void;
  
  // Git actions
  setGitRepository: (repo: GitRepository | null) => void;
  setGitWorkingTree: (tree: AppState['gitWorkingTree']) => void;
  stageFile: (path: string) => void;
  unstageFile: (path: string) => void;
  setGitCommits: (commits: GitCommit[]) => void;
  setGitCommitMessage: (message: string) => void;
  
  // Config actions
  setConfigStatus: (status: ConfigStatus) => void;
}

// Check if we're in Electron environment
const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

export const useAppStore = create<AppState>()(
  persist(
    (set, get, api) => ({
      ...createAIStoreSlice(set, get, api),
      ...createEditorStoreSlice(set, get, api),
      // === Initial State ===
      activeTab: 'chat',
      sidebarWidth: 250,
      currentProject: 'proj1',
      
       windows: [],
       activeWindowId: null,
       layoutMode: 'fixed',
       dockedAreas: {
         left: null,
         right: null,
         top: null,
         bottom: null,
         center: null,
       },
       
       // Docking state
       dockNodes: new Map(),
       dockContainers: [],
       draggingWindowId: null,
       dragStartBounds: null,
       dragPosition: null,
       previewDock: null,
       separatePreviewBounds: null,
      
      activeConversationId: 'c-proj1-default',
      conversations: [
        { id: 'c-proj1-default', title: '对话 1', projectId: 'proj1' },
      ],
      conversationMessages: {
        'c-proj1-default': [],
      },
      messages: [],
      imageAttachments: [],
      isLoading: false,
      
      fileTree: [],
      openFiles: [],
      activeFile: null,
      
      gitRepository: null,
      gitWorkingTree: {
        modified: [],
        staged: [],
        untracked: [],
        deleted: [],
      },
      gitCommits: [],
      gitCommitMessage: '',
      
      configStatus: 'checking',
      
      // === Actions ===
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      setCurrentProject: (projectId) => set({ currentProject: projectId }),
      
      // Window actions with Electron integration
      createWindow: async (type, options = {}) => {
        const id = Math.random().toString(36).substr(2, 9);
        
        console.log('Creating window:', type, options);
        
        // Create in Electron if available
        if (isElectron) {
          try {
            const result = await window.electronAPI.window.create(type, options);
            console.log('Window created in Electron:', result);
          } catch (error) {
            console.error('Failed to create Electron window:', error);
          }
        }
        
        // Calculate centered position if not provided
        const defaultWidth = options.width || 600;
        const defaultHeight = options.height || 400;
        const centerX = typeof window !== 'undefined' ? Math.max(100, (window.innerWidth - defaultWidth) / 2) : 100;
        const centerY = typeof window !== 'undefined' ? Math.max(100, (window.innerHeight - defaultHeight) / 2) : 100;
        
        const newWindow: WindowInstance = {
          id,
          type,
          state: 'floating',
          position: { 
            x: options.x ?? centerX, 
            y: options.y ?? centerY 
          },
          size: { width: defaultWidth, height: defaultHeight },
          opacity: options.opacity || 1,
          zIndex: 1000 + get().windows.length,
          alwaysOnTop: options.alwaysOnTop || false,
          dockTo: null,
          title: options.title || type,
          isLocked: false,
          isResizable: true,
        };
        
        console.log('New window created:', newWindow);
        
        set((state) => ({ 
          windows: [...state.windows, newWindow],
          activeWindowId: id
        }));
        return id;
      },
      
      closeWindow: async (windowId) => {
        if (isElectron) {
          try {
            await window.electronAPI.window.close(windowId);
          } catch (error) {
            console.error('Failed to close Electron window:', error);
          }
        }
        
        set((state) => ({
          windows: state.windows.filter((w) => w.id !== windowId),
        }));
      },
      
      updateWindow: (windowId, updates) => {
        set((state) => ({
          windows: state.windows.map((w) =>
            w.id === windowId ? { ...w, ...updates } : w
          ),
        }));
      },
      
      moveWindow: async (windowId, position) => {
        if (isElectron) {
          try {
            await window.electronAPI.window.move(windowId, position.x, position.y);
          } catch (error) {
            console.error('Failed to move window:', error);
          }
        }
        get().updateWindow(windowId, { position });
      },
      
      resizeWindow: async (windowId, size) => {
        if (isElectron) {
          try {
            await window.electronAPI.window.resize(windowId, size.width, size.height);
          } catch (error) {
            console.error('Failed to resize window:', error);
          }
        }
        get().updateWindow(windowId, { size });
      },
      
      dockWindow: (windowId, position) => {
        get().updateWindow(windowId, { dockTo: position, state: 'docked' });
        set((state) => ({
          dockedAreas: { ...state.dockedAreas, [position]: windowId },
        }));
      },
      
      undockWindow: (windowId) => {
        const currentWindow = get().windows.find((w) => w.id === windowId);
        if (currentWindow?.dockTo) {
          set((state) => ({
            dockedAreas: { ...state.dockedAreas, [currentWindow.dockTo!]: null },
          }));
        }
        get().updateWindow(windowId, { dockTo: null, state: 'floating' });
      },
      
      toggleAlwaysOnTop: async (windowId) => {
        const currentWindow = get().windows.find((w) => w.id === windowId);
        if (currentWindow) {
          const newValue = !currentWindow.alwaysOnTop;
          
          if (isElectron) {
            try {
              await window.electronAPI.window.setAlwaysOnTop(windowId, newValue);
            } catch (error) {
              console.error('Failed to toggle always on top:', error);
            }
          }
          
          get().updateWindow(windowId, { alwaysOnTop: newValue });
        }
      },
      
      setWindowOpacity: async (windowId, opacity) => {
        if (isElectron) {
          try {
            await window.electronAPI.window.setOpacity(windowId, opacity);
          } catch (error) {
            console.error('Failed to set opacity:', error);
          }
        }
        get().updateWindow(windowId, { opacity });
      },
      
      focusWindow: (windowId) => {
        set({ activeWindowId: windowId });
        set((state) => ({
          windows: state.windows.map((w) =>
            w.id === windowId ? { ...w, zIndex: 999 } : w
          ),
        }));
      },
      
        setLayoutMode: (mode) => set({ layoutMode: mode }),
        
        // Chat actions
      addMessage: (message) => {
        const newMessage: Message = {
          ...message,
          id: Math.random().toString(36).substr(2, 9),
          timestamp: Date.now(),
        };
        set((state) => {
          const activeConversationId = state.activeConversationId;
          const current = state.conversationMessages[activeConversationId] || [];
          return {
            messages: [...current, newMessage],
            conversationMessages: {
              ...state.conversationMessages,
              [activeConversationId]: [...current, newMessage],
            },
          };
        });
      },
      
      clearMessages: () => set((state) => ({
        messages: [],
        conversationMessages: {
          ...state.conversationMessages,
          [state.activeConversationId]: [],
        },
      })),

      setActiveConversation: (conversationId) => set((state) => ({
        activeConversationId: conversationId,
        messages: state.conversationMessages[conversationId] || [],
      })),

      upsertConversation: (conversation) => set((state) => {
        const exists = state.conversations.some((c) => c.id === conversation.id);
        return {
          conversations: exists
            ? state.conversations.map((c) => (c.id === conversation.id ? conversation : c))
            : [...state.conversations, conversation],
          conversationMessages: state.conversationMessages[conversation.id]
            ? state.conversationMessages
            : { ...state.conversationMessages, [conversation.id]: [] },
        };
      }),
      
      addImageAttachment: (image) => {
        const newImage: ImageAttachment = {
          ...image,
          id: Math.random().toString(36).substr(2, 9),
        };
        set((state) => ({
          imageAttachments: [...state.imageAttachments, newImage],
        }));
      },
      
      removeImageAttachment: (id) => {
        set((state) => ({
          imageAttachments: state.imageAttachments.filter((img) => img.id !== id),
        }));
      },
      
      clearImageAttachments: () => set({ imageAttachments: [] }),
      
      setIsLoading: (loading) => set({ isLoading: loading }),
      
      // File actions
      setFileTree: (tree) => set({ fileTree: tree }),
      
      openFile: async (file) => {
        // Try to read file content if in Electron environment
        let content = file.content || '';
        
        if (typeof window !== 'undefined' && window.electronAPI?.fs?.readFile && file.path) {
          try {
            const result = await window.electronAPI.fs.readFile(file.path, { encoding: 'utf-8' });
            if (result.ok && typeof result.content === 'string') {
              content = result.content;
            }
          } catch (error) {
            console.error('Failed to read file:', error);
          }
        }
        
        const fileWithContent = { ...file, content };
        
        set((state) => {
          const exists = state.openFiles.some((f) => f.path === file.path);
          if (!exists) {
            return { openFiles: [...state.openFiles, fileWithContent] };
          }
          return state;
        });
        set({ activeFile: fileWithContent });
        
        // Also add to editor tabs
        const editorType = file.type as any;
        const tabId = `editor-tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newTab = {
          id: tabId,
          type: editorType,
          title: file.name,
          path: file.path,
          content,
          isDirty: false,
          canClose: true,
        };
        set((state) => ({
          editorTabs: [...state.editorTabs, newTab],
          activeEditorTabId: tabId,
        }));
      },
      
      closeFile: (path) => {
        set((state) => ({
          openFiles: state.openFiles.filter((f) => f.path !== path),
        }));
      },
      
      setActiveFile: (file) => set({ activeFile: file }),
      
      // Git actions
      setGitRepository: (repo) => set({ gitRepository: repo }),
      
      setGitWorkingTree: (tree) => set({ gitWorkingTree: tree }),
      
      stageFile: (path) => {
        const { gitWorkingTree } = get();
        const file = gitWorkingTree.modified.find((f) => f.path === path) ||
                    gitWorkingTree.untracked.find((f) => f.path === path) ||
                    gitWorkingTree.deleted.find((f) => f.path === path);
        
        if (file) {
          set((state) => ({
            gitWorkingTree: {
              ...state.gitWorkingTree,
              modified: state.gitWorkingTree.modified.filter((f) => f.path !== path),
              untracked: state.gitWorkingTree.untracked.filter((f) => f.path !== path),
              deleted: state.gitWorkingTree.deleted.filter((f) => f.path !== path),
              staged: [...state.gitWorkingTree.staged, { ...file, status: 'staged' as const }],
            },
          }));
        }
      },
      
      unstageFile: (path) => {
        const { gitWorkingTree } = get();
        const file = gitWorkingTree.staged.find((f) => f.path === path);
        
        if (file) {
          const originalStatus: 'modified' | 'untracked' = 'modified';
          set((state) => ({
            gitWorkingTree: {
              ...state.gitWorkingTree,
              staged: state.gitWorkingTree.staged.filter((f) => f.path !== path),
              modified: [...state.gitWorkingTree.modified, { ...file, status: 'modified' as const }],
            },
          }));
        }
      },
      
      setGitCommits: (commits) => set({ gitCommits: commits }),
      
      setGitCommitMessage: (message) => set({ gitCommitMessage: message }),
      
        // Config actions
        setConfigStatus: (status) => set({ configStatus: status }),
        
         // Docking actions
         startDrag: (windowId: string, bounds: { x: number; y: number; width: number; height: number }) => 
           set({ draggingWindowId: windowId, dragStartBounds: bounds }),
         updateDrag: (x: number, y: number) => set({ dragPosition: { x, y } }),
         endDrag: () => set({ draggingWindowId: null, dragStartBounds: null, dragPosition: null, previewDock: null, separatePreviewBounds: null }),
         setPreviewDock: (preview: DockPreview | null) => set({ previewDock: preview }),
         clearPreviewDock: () => set({ previewDock: null }),
         setSeparatePreviewBounds: (bounds) => set({ separatePreviewBounds: bounds }),
         clearSeparatePreviewBounds: () => set({ separatePreviewBounds: null }),
      }),
    {
      name: 'opencode-storage',
      partialize: (state) => ({
        activeTab: state.activeTab,
        sidebarWidth: state.sidebarWidth,
        layoutMode: state.layoutMode,
      }),
    }
  )
);
