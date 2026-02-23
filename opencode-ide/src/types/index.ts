import type {
  AIAuthStartRequest,
  AIAuthStatus,
  AIBackendStatus,
  AIImageRef,
  AIModelInfo,
  AIResponse,
  AISendRequest,
} from './ai';

export * from './ai';

// Window types for floating window support
export type WindowType = 'main' | 'chat' | 'chat-input' | 'chat-history' | 'input' | 'editor' | 'repository' | 'git' | 'sidebar' | 'activitybar' | 'diff' | 'explorer' | 'server-manager' | 'logs' | 'gear';

export type WindowState = 'docked' | 'floating' | 'minimized' | 'maximized' | 'hidden';

export type DockPosition = 'left' | 'right' | 'top' | 'bottom' | 'center';

export interface DockNode {
  id: string;
  type: 'window' | 'group';
  orientation?: 'horizontal' | 'vertical';
  
  windowId?: string;
  children?: DockNode[];
  sizes?: number[];
}

export interface DockContainer {
  root: DockNode;
  bounds: { x: number; y: number; width: number; height: number };
}

export interface DockPreview {
  targetNodeId: string;
  position: DockPosition;
  type: 'dock' | 'squeeze';
  bounds: { x: number; y: number; width: number; height: number };
}

export interface WindowInstance {
  id: string;
  type: WindowType;
  state: WindowState;
  position: { x: number; y: number };
  size: { width: number; height: number };
  opacity: number;
  zIndex: number;
  alwaysOnTop: boolean;
  dockTo: DockPosition | null;
  title: string;
  isLocked: boolean;
  isResizable: boolean;
}

export interface WindowOptions {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  opacity?: number;
  alwaysOnTop?: boolean;
  title?: string;
}

// Chat types
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: ImageAttachment[];
  timestamp: number;
}

export interface ImageAttachment {
  id: string;
  dataUrl: string;
  name: string;
  type: string;
  size: number;
}

// File types
export interface FileItem {
  name: string;
  type: 'folder' | 'file';
  path: string;
  children?: FileItem[];
  fileType?: 'code' | 'document' | 'spreadsheet' | 'image';
}

export interface OpenFile {
  name: string;
  path: string;
  type: 'code' | 'document' | 'spreadsheet' | 'markdown' | 'browser';
  content: string;
}

// Git types
export interface GitFile {
  path: string;
  name: string;
  status: 'modified' | 'staged' | 'untracked' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  diff?: string;
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: Date;
  filesChanged?: number;
  additions?: number;
  deletions?: number;
}

export interface GitRepository {
  path: string;
  name: string;
  currentBranch: string;
  branches: string[];
  isDirty: boolean;
}

// App state types
export type ActiveTab = 'chat' | 'editor' | 'repository' | 'git';

export type ConfigStatus = 'checking' | 'configured' | 'not_configured';

// Electron API types
declare global {
  interface Window {
    electronAPI: {
      window: {
        create: (type: WindowType, options?: WindowOptions) => Promise<{ id: string; bounds: any }>;
        close: (windowId: string) => Promise<void>;
        focus: (windowId: string) => Promise<void>;
        toggleVisibility: (windowId: string) => Promise<{ ok: boolean; visible: boolean }>;
        move: (windowId: string, x: number, y: number) => Promise<void>;
        resize: (windowId: string, width: number, height: number) => Promise<void>;
        setOpacity: (windowId: string, opacity: number) => Promise<void>;
        setAlwaysOnTop: (windowId: string, alwaysOnTop: boolean) => Promise<void>;
        setClickThrough: (windowId: string, enabled: boolean, opacity?: number) => Promise<void>;
        minimize: (windowId: string) => Promise<void>;
        maximize: (windowId: string) => Promise<void>;
        restore: (windowId: string) => Promise<void>;
        getBounds: (windowId: string) => Promise<{ x: number; y: number; width: number; height: number } | null>;
        separateFromContainer: (containerId: string, windowType: WindowType, newBounds: { x: number; y: number; width: number; height: number }) => Promise<{ separatedWindowId: string; remainingWindowId: string } | null>;
        onMoved: (callback: (event: any, data: any) => void) => void;
        onResized: (callback: (event: any, data: any) => void) => void;
        onClosed: (callback: (event: any, data: any) => void) => void;
        onFocused: (callback: (event: any, data: any) => void) => void;
        removeAllListeners: (channel: string) => void;
      };
      dialog: {
        showOpen: (options: any) => Promise<any>;
        showSave: (options: any) => Promise<any>;
        openFolder: () => Promise<{ ok: boolean; canceled?: boolean; path?: string; name?: string; error?: string }>;
      };
      fs: {
        readDir: (dirPath: string) => Promise<{ ok: boolean; items?: Array<{ name: string; path: string; type: 'folder' | 'file'; isDirectory: boolean; modifiedTime: number }>; error?: string }>;
        readFile: (filePath: string, options?: { encoding?: BufferEncoding }) => Promise<{ ok: boolean; content?: string; error?: string }>;
        writeFile: (filePath: string, content: string, options?: { encoding?: BufferEncoding }) => Promise<{ ok: boolean; error?: string }>;
      };
      project: {
        list: () => Promise<{ ok: boolean; projects?: Array<{ id: string; name: string; path: string; addedAt?: number }>; error?: string }>;
        add: (name: string, path: string) => Promise<{ ok: boolean; project?: { id: string; name: string; path: string; addedAt?: number }; error?: string }>;
        remove: (projectId: string) => Promise<{ ok: boolean; error?: string }>;
      };
      ai: {
        send: (request: AISendRequest) => Promise<{ ok: boolean; response?: AIResponse; error?: string }>;
        upload: (payload: { image: AIImageRef }) => Promise<{ ok: boolean; image?: AIImageRef; error?: string }>;
        status: () => Promise<AIBackendStatus>;
        models: () => Promise<{ ok: boolean; models?: AIModelInfo[]; error?: string; authRequired?: boolean }>;
        selftest: () => Promise<{
          ok: boolean;
          runtimeSupported: boolean;
          canStart: boolean;
          startError?: string;
          authRequired?: boolean;
          authError?: string;
          health?: { supported?: boolean; nodeVersion?: string; execPath?: string; pid?: number; started?: boolean; authMode?: string } | null;
          checkedAt: number;
        }>;
        // Stream event listeners
        onStreamChunk: (callback: (chunk: { id?: string; content: string; delta?: string }) => void) => void;
        onStreamEnd: (callback: (data: { id?: string; finishReason?: string }) => void) => void;
        onStreamError: (callback: (error: { code?: string; message: string }) => void) => void;
        onOperation: (callback: (operation: { eventType?: string; label: string; detail?: string; state?: 'running' | 'success' | 'error' }) => void) => void;
        removeStreamListeners: () => void;
      };
      aiAuth: {
        status: () => Promise<AIAuthStatus>;
        start: (payload: AIAuthStartRequest) => Promise<{ ok: boolean; error?: string }>;
        useLoggedInUser: () => Promise<{ ok: boolean; error?: string }>;
        openOfficialLogin: () => Promise<{ ok: boolean; error?: string }>;
        logout: () => Promise<{ ok: boolean; error?: string }>;
        refresh: () => Promise<{ ok: boolean; error?: string }>;
      };
      aiLog: {
        list: () => Promise<{ ok: boolean; logs?: Array<{ id: string; time: number; level: 'info' | 'warn' | 'error'; scope: string; message: string; meta?: unknown }> }>;
        clear: () => Promise<{ ok: boolean }>;
        onAppend: (callback: (log: { id: string; time: number; level: 'info' | 'warn' | 'error'; scope: string; message: string; meta?: unknown }) => void) => void;
        onClear: (callback: (payload: { ok: boolean; at: number }) => void) => void;
        removeListeners: () => void;
      };
      app: {
        getWindowId: () => string;
        getWindowType: () => string;
        getPopupId: () => string;
        getPopupParentWindowId: () => string | null;
        onFocus: (callback: () => void) => void;
        onBlur: (callback: () => void) => void;
      };
      dock: {
        startDrag: (windowId: string, bounds: { x: number; y: number; width: number; height: number }) => Promise<void>;
        move: (windowId: string, mouseX: number, mouseY: number, dragBounds: { x: number; y: number; width: number; height: number }, dragSize?: { width: number; height: number }) => Promise<void>;
        endDrag: (windowId: string) => Promise<{ docked: boolean }>;
        undock: (windowId: string) => Promise<void>;
        getAllWindows: () => Promise<Array<{ id: string; type: string; bounds: any; isVisible?: boolean; isDocked: boolean; dockPosition?: string }>>;
        onStateChange: (callback: (data: { isDocked: boolean; dockPosition?: string; dockGroupId?: string }) => void) => void;
        onTreeUpdated: (callback: (data: { tree: any; type: string }) => void) => void;
        removeAllListeners: (channel: string) => void;
      };
      separatePreview: {
        show: (bounds: { x: number; y: number; width: number; height: number }) => Promise<void>;
        hide: () => Promise<void>;
      };
      localPreview: {
        show: (bounds: { x: number; y: number; width: number; height: number }) => Promise<void>;
        hide: () => Promise<void>;
      };
      modeSwitchPreview: {
        show: (bounds: { x: number; y: number; width: number; height: number }) => Promise<void>;
        hide: () => Promise<void>;
      };
      alt: {
        reportState: (pressed: boolean, windowId: string) => Promise<void>;
        reportMouseOver: (windowId: string, isOver: boolean) => Promise<void>;
        getState: () => Promise<{ pressed: boolean; topmostWindowId?: string; alwaysTransparentWindowId?: string }>;
        onStateChanged: (callback: (data: { pressed: boolean; cancelOthers?: boolean; suspended?: boolean }) => void) => void;
        toggleAlwaysTransparent: (windowId: string) => Promise<{ success: boolean; alwaysTransparent: boolean; reason?: string }>;
        getAlwaysTransparent: (windowId: string) => Promise<{ alwaysTransparent: boolean }>;
        onAlwaysTransparentChanged: (callback: (data: { enabled: boolean }) => void) => void;
      };

      popup: {
        show: (payload: {
          popupId: string;
          windowType: string;
          bounds: { x: number; y: number; width: number; height: number };
          parentWindowId?: string;
          autoHide?: boolean;
        }) => Promise<{ ok: boolean; popupId: string }>;
        hide: (payload: { popupId: string } | string) => Promise<{ ok: boolean; popupId: string }>;
        isVisible: (payload: { popupId: string } | string) => Promise<{ ok: boolean; popupId: string; visible: boolean }>;
      };
      platform: string;
      removeAllListeners: (channel: string) => void;
    };
  }
}
