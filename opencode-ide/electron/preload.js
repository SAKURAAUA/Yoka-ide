const { contextBridge, ipcRenderer } = require('electron');

// 获取窗口信息 - 在 preload 脚本加载时就获取
const windowId = process.argv.find(arg => arg.startsWith('--window-id='))?.replace('--window-id=', '') || 'main';
const windowType = process.argv.find(arg => arg.startsWith('--window-type='))?.replace('--window-type=', '') || 'main';
const popupId = process.argv.find(arg => arg.startsWith('--popup-id='))?.replace('--popup-id=', '') || '';
const popupParentWindowId = process.argv.find(arg => arg.startsWith('--popup-parent-window-id='))?.replace('--popup-parent-window-id=', '') || '';

console.log('Preload script loaded');
console.log('process.argv:', process.argv);
console.log('windowId:', windowId);
console.log('windowType:', windowType);
console.log('popupId:', popupId);
console.log('popupParentWindowId:', popupParentWindowId);

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Window management
  window: {
    create: (type, options) => ipcRenderer.invoke('window:create', { type, options }),
    close: (windowId) => ipcRenderer.invoke('window:close', { windowId }),
    focus: (windowId) => ipcRenderer.invoke('window:focus', { windowId }),
    toggleVisibility: (windowId) => ipcRenderer.invoke('window:toggleVisibility', { windowId }),
    move: (windowId, x, y) => ipcRenderer.invoke('window:move', { windowId, x, y }),
    resize: (windowId, width, height) => ipcRenderer.invoke('window:resize', { windowId, width, height }),
    setOpacity: (windowId, opacity) => ipcRenderer.invoke('window:setOpacity', { windowId, opacity }),
        setAlwaysOnTop: (windowId, alwaysOnTop) => ipcRenderer.invoke('window:setAlwaysOnTop', { windowId, alwaysOnTop }),
        setClickThrough: (windowId, enabled, opacity) => 
          ipcRenderer.invoke('window:setClickThrough', { windowId, enabled, opacity }),
        minimize: (windowId) => ipcRenderer.invoke('window:minimize', { windowId }),
    maximize: (windowId) => ipcRenderer.invoke('window:maximize', { windowId }),
    restore: (windowId) => ipcRenderer.invoke('window:restore', { windowId }),
    getBounds: (windowId) => ipcRenderer.invoke('window:getBounds', { windowId }),
    separateFromContainer: (containerId, windowType, newBounds) => 
      ipcRenderer.invoke('window:separateFromContainer', { containerId, windowType, newBounds }),
    
    // Event listeners
    onMoved: (callback) => ipcRenderer.on('window:moved', callback),
    onResized: (callback) => ipcRenderer.on('window:resized', callback),
    onClosed: (callback) => ipcRenderer.on('window:closed', callback),
    onFocused: (callback) => ipcRenderer.on('window:focused', callback),
    
    // Remove listeners
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  },

  // Dialogs
  dialog: {
    showOpen: (options) => ipcRenderer.invoke('dialog:showOpen', options),
    showSave: (options) => ipcRenderer.invoke('dialog:showSave', options),
    openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  },

  // File system
  fs: {
    readDir: (dirPath) => ipcRenderer.invoke('fs:readDir', { dirPath }),
    readFile: (filePath, options) => ipcRenderer.invoke('fs:readFile', { filePath, options }),
    writeFile: (filePath, content, options) => ipcRenderer.invoke('fs:writeFile', { filePath, content, options }),
  },

  // Project management
  project: {
    list: () => ipcRenderer.invoke('project:list'),
    add: (name, path) => ipcRenderer.invoke('project:add', { name, path }),
    remove: (projectId) => ipcRenderer.invoke('project:remove', { projectId }),
  },

  // AI backend IPC
  ai: {
    send: (payload) => ipcRenderer.invoke('ai:send', payload),
    upload: (payload) => ipcRenderer.invoke('ai:upload', payload),
    status: () => ipcRenderer.invoke('ai:status'),
    models: () => ipcRenderer.invoke('ai:models'),
    selftest: () => ipcRenderer.invoke('ai:selftest'),
    // Stream event listeners for progressive response updates
    onStreamChunk: (callback) => ipcRenderer.on('ai:stream:chunk', (event, chunk) => callback(chunk)),
    onStreamEnd: (callback) => ipcRenderer.on('ai:stream:end', (event, data) => callback(data)),
    onStreamError: (callback) => ipcRenderer.on('ai:stream:error', (event, error) => callback(error)),
    onOperation: (callback) => ipcRenderer.on('ai:operation', (event, operation) => callback(operation)),
    removeStreamListeners: () => {
      ipcRenderer.removeAllListeners('ai:stream:chunk');
      ipcRenderer.removeAllListeners('ai:stream:end');
      ipcRenderer.removeAllListeners('ai:stream:error');
      ipcRenderer.removeAllListeners('ai:operation');
    },
  },

  // AI auth IPC
  aiAuth: {
    status: () => ipcRenderer.invoke('ai:auth:status'),
    start: (payload) => ipcRenderer.invoke('ai:auth:start', payload),
    useLoggedInUser: () => ipcRenderer.invoke('ai:auth:useLoggedInUser'),
    openOfficialLogin: () => ipcRenderer.invoke('ai:auth:openOfficialLogin'),
    logout: () => ipcRenderer.invoke('ai:auth:logout'),
    refresh: () => ipcRenderer.invoke('ai:auth:refresh'),
  },

  aiLog: {
    list: () => ipcRenderer.invoke('ai:log:list'),
    clear: () => ipcRenderer.invoke('ai:log:clear'),
    onAppend: (callback) => ipcRenderer.on('ai:log:append', (event, log) => callback(log)),
    onClear: (callback) => ipcRenderer.on('ai:log:clear', (event, payload) => callback(payload)),
    removeListeners: () => {
      ipcRenderer.removeAllListeners('ai:log:append');
      ipcRenderer.removeAllListeners('ai:log:clear');
    },
  },

  // App info - 使用预先获取的值
  app: {
    getWindowId: () => windowId,
    getWindowType: () => windowType,
    getPopupId: () => popupId,
    getPopupParentWindowId: () => popupParentWindowId || null,
    onFocus: (callback) => ipcRenderer.on('app:focus', callback),
    onBlur: (callback) => ipcRenderer.on('app:blur', callback),
  },
  
  // Docking system
  dock: {
    startDrag: (windowId, bounds) => ipcRenderer.invoke('dock:startDrag', { windowId, bounds }),
    move: (windowId, mouseX, mouseY, dragBounds, dragSize) => 
      ipcRenderer.invoke('dock:move', { windowId, mouseX, mouseY, dragBounds, dragSize }),
    endDrag: (windowId) => ipcRenderer.invoke('dock:endDrag', { windowId }),
    undock: (windowId) => ipcRenderer.invoke('dock:undock', { windowId }),
    getAllWindows: () => ipcRenderer.invoke('dock:getAllWindows'),
    onStateChange: (callback) => ipcRenderer.on('dock:state', (event, data) => callback(data)),
    onTreeUpdated: (callback) => ipcRenderer.on('dock-tree-updated', (event, data) => callback(data)),
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  },
  
  // 分离预览窗口
  separatePreview: {
    show: (bounds) => ipcRenderer.invoke('separatePreview:show', { bounds }),
    hide: () => ipcRenderer.invoke('separatePreview:hide'),
  },
  
  // 蓝色虚线框预览窗口（局部拖移时显示在窗口外）
  localPreview: {
    show: (bounds) => ipcRenderer.invoke('localPreview:show', { bounds }),
    hide: () => ipcRenderer.invoke('localPreview:hide'),
  },
  
  // 蓝色实线预览窗口（右键切换模式时显示）
  modeSwitchPreview: {
    show: (bounds) => ipcRenderer.invoke('modeSwitchPreview:show', { bounds }),
    hide: () => ipcRenderer.invoke('modeSwitchPreview:hide'),
  },
  
  // 全局 Alt 键状态
  alt: {
    reportState: (pressed, windowId) => ipcRenderer.invoke('alt:reportState', { pressed, windowId }),
    reportMouseOver: (windowId, isOver) => ipcRenderer.invoke('alt:reportMouseOver', { windowId, isOver }),
    getState: () => ipcRenderer.invoke('alt:getState'),
    onStateChanged: (callback) => ipcRenderer.on('alt:stateChanged', (event, data) => callback(data)),
    toggleAlwaysTransparent: (windowId) => ipcRenderer.invoke('alt:toggleAlwaysTransparent', { windowId }),
    getAlwaysTransparent: (windowId) => ipcRenderer.invoke('alt:getAlwaysTransparent', { windowId }),
    onAlwaysTransparentChanged: (callback) => ipcRenderer.on('alt:alwaysTransparentChanged', (event, data) => callback(data)),
  },

  // Platform
  platform: process.platform,

  // Popup windows (sub-windows for trays/menus/panels)
  popup: {
    show: (payload) => ipcRenderer.invoke('popup:show', payload),
    hide: (payload) => {
      if (typeof payload === 'string') return ipcRenderer.invoke('popup:hide', { popupId: payload });
      return ipcRenderer.invoke('popup:hide', payload);
    },
    isVisible: (payload) => {
      if (typeof payload === 'string') return ipcRenderer.invoke('popup:isVisible', { popupId: payload });
      return ipcRenderer.invoke('popup:isVisible', payload);
    },
  },
  
  // General IPC cleanup
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});
