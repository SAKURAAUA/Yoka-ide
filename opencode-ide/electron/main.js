const { app, BrowserWindow, ipcMain, screen, dialog, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');
const { uIOhook, UiohookKey, EventType } = require('uiohook-napi');
const {
  ensureCopilotClientStarted,
  setAuthToken,
  setUseLoggedInUserAuth,
  getAuthDebugState,
  checkRuntimeSupport,
  getBridgeHealth,
  listModelsThroughBridge,
  uploadImageThroughBridge,
} = require('./ai/copilotClient');
const { sendMessage } = require('./ai/sessionManager');

const isDev = process.env.NODE_ENV === 'development';

// 生成或获取机器特定的加密密钥
function getEncryptionKey() {
  const keyPath = path.join(app.getPath('userData'), '.key');
  try {
    if (fs.existsSync(keyPath)) {
      return fs.readFileSync(keyPath);
    }
    // 生成新的 256 位密钥
    const key = crypto.randomBytes(32);
    fs.mkdirSync(path.dirname(keyPath), { recursive: true });
    fs.writeFileSync(keyPath, key, { mode: 0o600 });
    return key;
  } catch (error) {
    console.warn('[Store] Failed to get encryption key:', error);
    // 回退到基于机器 ID 的密钥（较弱但可用）
    return crypto.createHash('sha256').update(app.getPath('userData')).digest();
  }
}

const ENCRYPTION_KEY = getEncryptionKey();
const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-gcm';

// 加密敏感数据
function encrypt(text) {
  if (!text) return null;
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return iv.toString('hex') + ':' + authTag + ':' + encrypted;
  } catch (error) {
    console.error('[Store] Encryption failed:', error);
    return null;
  }
}

// 解密敏感数据
function decrypt(data) {
  if (!data) return null;
  try {
    const parts = data.split(':');
    if (parts.length !== 3) return null;
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('[Store] Decryption failed:', error);
    return null;
  }
}

// 敏感键名模式（这些值需要加密）
const SENSITIVE_KEYS = ['token', 'secret', 'password', 'key', 'apiKey', 'api_key', 'accessToken', 'access_token'];

function isSensitiveKey(key) {
  return SENSITIVE_KEYS.some(sensitive => key.toLowerCase().includes(sensitive));
}

// 使用 Electron 内置存储（加密敏感数据）
class SecureStore {
  constructor(name) {
    this.name = name;
    this.dataDir = path.join(app.getPath('userData'), 'data');
    this.filePath = path.join(this.dataDir, `${name}.json`);
    this.data = this.load();
  }

  load() {
    try {
      if (!fs.existsSync(this.filePath)) {
        return {};
      }
      const content = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`[Store] Failed to load ${this.name}:`, error);
      return {};
    }
  }

  save() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), { mode: 0o600 });
    } catch (error) {
      console.error(`[Store] Failed to save ${this.name}:`, error);
    }
  }

  get(key) {
    const value = this.data[key];
    if (value && typeof value === 'string' && isSensitiveKey(key)) {
      return decrypt(value);
    }
    return value;
  }

  set(key, value) {
    // 加密敏感数据
    if (value && typeof value === 'string' && isSensitiveKey(key)) {
      const encrypted = encrypt(value);
      if (encrypted) {
        this.data[key] = encrypted;
      } else {
        this.data[key] = value; // 加密失败时仍保存（但不安全）
      }
    } else {
      this.data[key] = value;
    }
    this.save();
  }

  delete(key) {
    delete this.data[key];
    this.save();
  }
}

const aiAuthStore = new SecureStore('ai-auth');

// ============================================
// IPC 输入验证层
// ============================================

// 允许的窗口类型白名单
const ALLOWED_WINDOW_TYPES = new Set([
  'chat', 'chat-input', 'chat-history', 'editor', 'git', 
  'repository', 'explorer', 'server-manager', 'logs', 'gear',
  'activitybar', 'popup:vertical-tray', 'popup:horizontal-tray',
  'popup:server-manager'
]);

// 允许的弹出窗口类型前缀
const ALLOWED_POPUP_PREFIXES = ['popup:project-menu:', 'popup:context-menu:'];

// 验证字符串是否为安全的窗口ID
function isValidWindowId(id) {
  return typeof id === 'string' && id.length > 0 && id.length < 200 && !/[^\w-]/.test(id);
}

// 验证坐标值
function isValidCoordinate(value) {
  return typeof value === 'number' && isFinite(value) && value >= -100000 && value <= 100000;
}

// 验证边界对象
function isValidBounds(bounds) {
  if (!bounds || typeof bounds !== 'object') return false;
  return (
    isValidCoordinate(bounds.x) &&
    isValidCoordinate(bounds.y) &&
    isValidCoordinate(bounds.width) &&
    isValidCoordinate(bounds.height)
  );
}

// 验证窗口类型
function isValidWindowType(type) {
  if (typeof type !== 'string' || type.length === 0 || type.length > 100) return false;
  if (ALLOWED_WINDOW_TYPES.has(type)) return true;
  return ALLOWED_POPUP_PREFIXES.some(prefix => type.startsWith(prefix));
}

// 验证选项对象
function isValidWindowOptions(options) {
  if (!options || typeof options !== 'object') return true;
  const { x, y, width, height, alwaysOnTop } = options;
  if (x !== undefined && !isValidCoordinate(x)) return false;
  if (y !== undefined && !isValidCoordinate(y)) return false;
  if (width !== undefined && (!isValidCoordinate(width) || width < 1 || width > 10000)) return false;
  if (height !== undefined && (!isValidCoordinate(height) || height < 1 || height > 10000)) return false;
  if (alwaysOnTop !== undefined && typeof alwaysOnTop !== 'boolean') return false;
  return true;
}

// 包装 IPC 处理器以添加输入验证
function validateIPC(handler, options = {}) {
  const { requirePayload = true, validatePayload = null } = options;
  return async (event, payload) => {
    const webContents = event.sender;
    if (!webContents || webContents.isDestroyed()) {
      console.error('[IPC] Invalid event sender');
      return { ok: false, error: 'invalid_sender' };
    }
    
    if (requirePayload && payload === undefined) {
      console.error('[IPC] Missing payload');
      return { ok: false, error: 'missing_payload' };
    }
    
    if (validatePayload && typeof validatePayload === 'function') {
      const validationError = validatePayload(payload);
      if (validationError) {
        console.error('[IPC] Validation failed:', validationError);
        return { ok: false, error: validationError };
      }
    }
    
    try {
      return await handler(event, payload);
    } catch (err) {
      console.error('[IPC] Handler error:', err.message);
      return { ok: false, error: 'handler_error', message: err.message };
    }
  };
}

// 在应用启动时加载存储的 token
const storedToken = aiAuthStore.get('copilot.token');
if (storedToken) {
  setAuthToken(storedToken);
  console.log('[Main] Auth token loaded from store on startup');
}

const windows = new Map();
const dockGroups = new Map(); // 存储停靠组
const popupWindows = new Map(); // 存储弹出子窗口（托盘/对话列表等）
let dockPreviewWindow = null; // 停靠预览窗口（蓝色虚线框）
let separatePreviewWindow = null; // 绿色分离预览窗口
let localPreviewWindow = null; // 蓝色虚线框预览窗口（局部拖移时显示）
let modeSwitchPreviewWindow = null; // 蓝色实线预览窗口（右键切换模式时显示）
let insertPreviewWindow = null; // 分栏插入预览窗口（蓝色实线）
let cancelButtonWindow = null; // 始终虚化时的取消按钮窗口

// 全局 Alt 键状态
let globalAltPressed = false;
let topmostWindowId = null; // 当前鼠标所在的顶层窗口ID
let alwaysTransparentWindowId = null; // 始终虚化的窗口ID（无论鼠标位置）

const DOCK_THRESHOLD = 50; // 停靠检测阈值（像素）

// ============================================
// 树形分栏数据结构
// ============================================

/**
 * 窗口节点: { type: 'window', windowType: string, size: { width, height } }
 * 分栏节点: { type: 'split', direction: 'horizontal'|'vertical', children: DockNode[] }
 */

// 窗口类型默认尺寸
const DEFAULT_WINDOW_SIZES = {
  'chat': { width: 600, height: 500 },
  'chat-input': { width: 500, height: 200 },
  'chat-history': { width: 500, height: 400 },
  'editor': { width: 800, height: 600 },
  'git': { width: 500, height: 400 },
  'repository': { width: 500, height: 400 },
  'explorer': { width: 400, height: 500 },
  'server-manager': { width: 520, height: 420 },
  'logs': { width: 860, height: 620 },
  'gear': { width: 56, height: 600 },
};

// AI status cache to avoid repeatedly loading Copilot SDK on frequent refresh
let cachedAIStatus = null;
let cachedAIStatusAt = 0;

const AI_LOG_LIMIT = 500;
const aiDebugLogs = [];

function safeMeta(meta) {
  if (!meta || typeof meta !== 'object') return undefined;
  try {
    return JSON.parse(JSON.stringify(meta));
  } catch {
    return { note: 'meta-serialize-failed' };
  }
}

function broadcastAIEvent(channel, payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    try {
      win.webContents.send(channel, payload);
    } catch {}
  }
}

function appendAILog(level, scope, message, meta) {
  const entry = {
    id: `ai-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    time: Date.now(),
    level,
    scope,
    message,
    meta: safeMeta(meta),
  };
  aiDebugLogs.push(entry);
  if (aiDebugLogs.length > AI_LOG_LIMIT) {
    aiDebugLogs.splice(0, aiDebugLogs.length - AI_LOG_LIMIT);
  }
  broadcastAIEvent('ai:log:append', entry);

  const line = `[AI:${scope}] ${message}`;
  if (level === 'error') {
    console.error(line, entry.meta || '');
  } else if (level === 'warn') {
    console.warn(line, entry.meta || '');
  } else {
    console.log(line, entry.meta || '');
  }
}

function readGhAuthTokenFromCli() {
  try {
    const result = spawnSync('gh', ['auth', 'token'], {
      encoding: 'utf8',
      windowsHide: true,
    });

    const stdout = typeof result.stdout === 'string' ? result.stdout.trim() : '';
    const stderr = typeof result.stderr === 'string' ? result.stderr.trim() : '';

    if (result.status === 0 && stdout) {
      return { ok: true, token: stdout };
    }

    return {
      ok: false,
      error: stderr || stdout || `gh auth token exited with ${result.status ?? 'unknown'}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown gh auth token error';
    return { ok: false, error: message };
  }
}

function getDefaultWindowSize(type) {
  // 如果是 dock-tree 开头，从树中提取第一个窗口类型
  if (type.startsWith('dock-tree:')) {
    try {
      const tree = parseDockTree(type);
      const firstWindow = findFirstWindow(tree);
      if (firstWindow) {
        return firstWindow.size || DEFAULT_WINDOW_SIZES[firstWindow.windowType] || { width: 500, height: 400 };
      }
    } catch (e) {}
  }
  return DEFAULT_WINDOW_SIZES[type] || { width: 500, height: 400 };
}

// 创建窗口节点
function createWindowNode(windowType, size) {
  return {
    type: 'window',
    windowType,
    size: size || getDefaultWindowSize(windowType)
  };
}

// 创建分栏节点
function createSplitNode(direction, children) {
  return {
    type: 'split',
    direction,
    children
  };
}

// 序列化树为字符串
function serializeDockTree(tree) {
  const json = JSON.stringify(tree);
  const base64 = Buffer.from(json).toString('base64');
  return `dock-tree:${base64}`;
}

// 解析树从字符串
function parseDockTree(typeStr) {
  if (!typeStr.startsWith('dock-tree:')) {
    throw new Error('Invalid dock tree format');
  }
  const base64 = typeStr.substring('dock-tree:'.length);
  const json = Buffer.from(base64, 'base64').toString('utf8');
  return JSON.parse(json);
}

// 查找树中的第一个窗口节点
function findFirstWindow(node) {
  if (node.type === 'window') {
    return node;
  }
  if (node.type === 'split' && node.children && node.children.length > 0) {
    return findFirstWindow(node.children[0]);
  }
  return null;
}

// 计算树的尺寸（扩展逻辑）
function calculateTreeSize(tree) {
  if (tree.type === 'window') {
    return { ...tree.size };
  }
  if (tree.type === 'split') {
    let totalWidth = 0;
    let totalHeight = 0;
    
    for (const child of tree.children) {
      const childSize = calculateTreeSize(child);
      if (tree.direction === 'horizontal') {
        totalWidth += childSize.width;
        totalHeight = Math.max(totalHeight, childSize.height);
      } else {
        totalWidth = Math.max(totalWidth, childSize.width);
        totalHeight += childSize.height;
      }
    }
    
    return { width: totalWidth, height: totalHeight };
  }
  return { width: 500, height: 400 };
}

// 从窗口数据创建树节点
function createTreeNodeFromWindow(winData, bounds) {
  if (winData.dockTree) {
    // 容器窗口：返回其树结构
    return winData.dockTree;
  } else if (winData.type && winData.type.startsWith('dock-tree:')) {
    // 容器窗口但 dockTree 未设置：解析类型字符串
    try {
      return parseDockTree(winData.type);
    } catch (e) {
      console.error('[Dock] Failed to parse dock tree from type:', e);
    }
  }
  
  // 普通窗口：创建窗口节点
  return createWindowNode(winData.type, { width: bounds.width, height: bounds.height });
}

// 创建停靠预览窗口
function createDockPreviewWindow() {
  if (dockPreviewWindow && !dockPreviewWindow.isDestroyed()) return dockPreviewWindow;
  
  dockPreviewWindow = new BrowserWindow({
    width: 100,
    height: 100,
    x: -9999, // 先移出屏幕
    y: -9999,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    focusable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });
  
  // 加载预览页面 - 使用HTML文件
  const previewHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { 
            width: 100%; 
            height: 100%; 
            overflow: hidden; 
            background: transparent;
          }
          .preview-overlay {
            width: 100%;
            height: 100%;
            background: repeating-linear-gradient(
              45deg, 
              transparent, 
              transparent 8px, 
              rgba(59, 130, 246, 0.2) 8px, 
              rgba(59, 130, 246, 0.2) 16px
            );
            border: 2px dashed #3b82f6;
          }
        </style>
      </head>
      <body>
        <div class="preview-overlay"></div>
      </body>
    </html>
  `;
  
  dockPreviewWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(previewHTML));
  
  dockPreviewWindow.on('closed', () => {
    dockPreviewWindow = null;
  });
  
  return dockPreviewWindow;
}

// 显示停靠预览
function showDockPreview(bounds) {
  try {
    console.log('[DockPreview] Showing at:', bounds);
    const preview = createDockPreviewWindow();
    if (preview) {
      preview.setBounds({
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
        width: Math.round(bounds.width),
        height: Math.round(bounds.height)
      });
      preview.showInactive(); // 显示但不获取焦点
      console.log('[DockPreview] Window shown');
    }
  } catch (err) {
    console.error('[DockPreview] Failed to show:', err);
  }
}

// 隐藏停靠预览
function hideDockPreview() {
  try {
    if (dockPreviewWindow && !dockPreviewWindow.isDestroyed()) {
      dockPreviewWindow.hide();
      console.log('[DockPreview] Hidden');
    }
  } catch (err) {
    console.error('[DockPreview] Failed to hide:', err);
  }
}

// 创建分栏插入预览窗口（蓝色实线）
function createInsertPreviewWindow() {
  if (insertPreviewWindow && !insertPreviewWindow.isDestroyed()) return insertPreviewWindow;
  
  insertPreviewWindow = new BrowserWindow({
    width: 100,
    height: 100,
    x: -9999,
    y: -9999,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    focusable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });
  
  // 加载蓝色实线预览页面
  const previewHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { 
            width: 100%; 
            height: 100%; 
            overflow: hidden; 
            background: transparent;
          }
          .preview-line {
            width: 100%;
            height: 100%;
            background: rgba(59, 130, 246, 0.3);
          }
        </style>
      </head>
      <body>
        <div class="preview-line"></div>
      </body>
    </html>
  `;
  
  insertPreviewWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(previewHTML));
  
  insertPreviewWindow.on('closed', () => {
    insertPreviewWindow = null;
  });
  
  return insertPreviewWindow;
}

// 显示分栏插入预览
function showInsertPreview(bounds) {
  try {
    const preview = createInsertPreviewWindow();
    if (preview) {
      preview.setBounds({
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
        width: Math.round(bounds.width),
        height: Math.round(bounds.height)
      });
      preview.showInactive();
    }
  } catch (err) {
    console.error('[InsertPreview] Failed to show:', err);
  }
}

// 隐藏分栏插入预览
function hideInsertPreview() {
  try {
    if (insertPreviewWindow && !insertPreviewWindow.isDestroyed()) {
      insertPreviewWindow.hide();
    }
  } catch (err) {
    console.error('[InsertPreview] Failed to hide:', err);
  }
}

// 显示停靠预览（根据类型选择不同的预览窗口）
function showDockPreviewWithMode(bounds, isInsert) {
  if (isInsert) {
    hideDockPreview();  // 隐藏虚线预览
    showInsertPreview(bounds);  // 显示实线预览
  } else {
    hideInsertPreview();  // 隐藏实线预览
    showDockPreview(bounds);  // 显示虚线预览
  }
}

// 隐藏所有预览
function hideAllPreviews() {
  hideDockPreview();
  hideInsertPreview();
  hideSeparatePreview();
  hideLocalPreview();
  hideModeSwitchPreview();
}

// 创建绿色分离预览窗口
function createSeparatePreviewWindow() {
  if (separatePreviewWindow && !separatePreviewWindow.isDestroyed()) return separatePreviewWindow;
  
  separatePreviewWindow = new BrowserWindow({
    width: 100,
    height: 100,
    x: -9999,
    y: -9999,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    focusable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });
  
  // 加载绿色预览页面
  const previewHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { 
            width: 100%; 
            height: 100%; 
            overflow: hidden; 
            background: transparent;
          }
          .preview-overlay {
            width: 100%;
            height: 100%;
            background: rgba(34, 197, 94, 0.2);
            border: 2px solid #22c55e;
          }
          .label {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 255, 255, 0.8);
            color: #15803d;
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 4px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
        </style>
      </head>
      <body>
        <div class="preview-overlay"></div>
        <div class="label">分离预览</div>
      </body>
    </html>
  `;
  
  separatePreviewWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(previewHTML));
  
  separatePreviewWindow.on('closed', () => {
    separatePreviewWindow = null;
  });
  
  return separatePreviewWindow;
}

// 显示绿色分离预览
function showSeparatePreview(bounds) {
  try {
    const preview = createSeparatePreviewWindow();
    if (preview) {
      preview.setBounds({
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
        width: Math.round(bounds.width),
        height: Math.round(bounds.height)
      });
      preview.showInactive();
    }
  } catch (err) {
    console.error('[SeparatePreview] Failed to show:', err);
  }
}

// 隐藏绿色分离预览
function hideSeparatePreview() {
  try {
    if (separatePreviewWindow && !separatePreviewWindow.isDestroyed()) {
      separatePreviewWindow.hide();
    }
  } catch (err) {
    console.error('[SeparatePreview] Failed to hide:', err);
  }
}

// 创建蓝色虚线框预览窗口（局部拖移时显示在窗口外）
function createLocalPreviewWindow() {
  if (localPreviewWindow && !localPreviewWindow.isDestroyed()) return localPreviewWindow;
  
  localPreviewWindow = new BrowserWindow({
    width: 100,
    height: 100,
    x: -9999,
    y: -9999,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    focusable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });
  
  // 加载蓝色虚线框预览页面
  const previewHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { 
            width: 100%; 
            height: 100%; 
            overflow: hidden; 
            background: transparent;
          }
          .preview-overlay {
            width: 100%;
            height: 100%;
            background: rgba(59, 130, 246, 0.15);
            border: 2px dashed #3b82f6;
          }
        </style>
      </head>
      <body>
        <div class="preview-overlay"></div>
      </body>
    </html>
  `;
  
  localPreviewWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(previewHTML));
  
  localPreviewWindow.on('closed', () => {
    localPreviewWindow = null;
  });
  
  return localPreviewWindow;
}

// 显示蓝色虚线框预览
function showLocalPreview(bounds) {
  try {
    const preview = createLocalPreviewWindow();
    if (preview) {
      preview.setBounds({
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
        width: Math.round(bounds.width),
        height: Math.round(bounds.height)
      });
      preview.showInactive();
    }
  } catch (err) {
    console.error('[LocalPreview] Failed to show:', err);
  }
}

// 隐藏蓝色虚线框预览
function hideLocalPreview() {
  try {
    if (localPreviewWindow && !localPreviewWindow.isDestroyed()) {
      localPreviewWindow.hide();
    }
  } catch (err) {
    console.error('[LocalPreview] Failed to hide:', err);
  }
}

// 创建蓝色实线预览窗口（右键切换模式时显示）
function createModeSwitchPreviewWindow() {
  if (modeSwitchPreviewWindow && !modeSwitchPreviewWindow.isDestroyed()) return modeSwitchPreviewWindow;
  
  modeSwitchPreviewWindow = new BrowserWindow({
    width: 100,
    height: 100,
    x: -9999,
    y: -9999,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    focusable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });
  
  // 加载蓝色实线预览页面
  const previewHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { 
            width: 100%; 
            height: 100%; 
            overflow: hidden; 
            background: transparent;
          }
          .preview-overlay {
            width: 100%;
            height: 100%;
            background: rgba(59, 130, 246, 0.2);
            border: 3px solid #3b82f6;
          }
        </style>
      </head>
      <body>
        <div class="preview-overlay"></div>
      </body>
    </html>
  `;
  
  modeSwitchPreviewWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(previewHTML));
  
  modeSwitchPreviewWindow.on('closed', () => {
    modeSwitchPreviewWindow = null;
  });
  
  return modeSwitchPreviewWindow;
}

// 显示蓝色实线预览（右键切换模式时）
function showModeSwitchPreview(bounds) {
  try {
    const preview = createModeSwitchPreviewWindow();
    if (preview) {
      preview.setBounds({
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
        width: Math.round(bounds.width),
        height: Math.round(bounds.height)
      });
      preview.showInactive();
    }
  } catch (err) {
    console.error('[ModeSwitchPreview] Failed to show:', err);
  }
}

// 隐藏蓝色实线预览
function hideModeSwitchPreview() {
  try {
    if (modeSwitchPreviewWindow && !modeSwitchPreviewWindow.isDestroyed()) {
      modeSwitchPreviewWindow.hide();
    }
  } catch (err) {
    console.error('[ModeSwitchPreview] Failed to hide:', err);
  }
}

// 检测停靠位置 - 基于鼠标位置追踪
// mouseX, mouseY: 鼠标屏幕坐标
// dragBounds: 拖动窗口边界
// targetBounds: 目标窗口边界
// dragSize: 拖动窗口的原始尺寸（用于计算外扩尺寸）
// 返回值包含：
//   - position: 停靠位置
//   - bounds: 预览区域
//   - isInsert: 是否为分栏插入（插入到窗口内部）
function detectDockPosition(mouseX, mouseY, dragBounds, targetBounds, dragSize) {
  const targetLeft = targetBounds.x;
  const targetRight = targetBounds.x + targetBounds.width;
  const targetTop = targetBounds.y;
  const targetBottom = targetBounds.y + targetBounds.height;
  
  // 检查鼠标是否在目标窗口范围内（扩展一点范围以便更容易触发）
  const expandRange = 20;
  const isInTargetArea = 
    mouseX >= targetLeft - expandRange &&
    mouseX <= targetRight + expandRange &&
    mouseY >= targetTop - expandRange &&
    mouseY <= targetBottom + expandRange;
  
  if (!isInTargetArea) {
    return null;
  }
  
  // 计算鼠标相对于目标窗口的位置
  const relativeX = mouseX - targetLeft;
  const relativeY = mouseY - targetTop;
  const targetWidth = targetBounds.width;
  const targetHeight = targetBounds.height;
  
  // 获取拖动窗口的尺寸
  const dragWidth = dragSize?.width || dragBounds.width;
  const dragHeight = dragSize?.height || dragBounds.height;
  
  // 分栏插入检测：检测窗口内部边缘区域（10%-20%）
  const insertThresholdOuter = targetWidth * 0.1;  // 外侧边界
  const insertThresholdInner = targetWidth * 0.2;  // 内侧边界
  
  // 分栏线宽度
  const lineWidth = 4;
  
  // 检测左边缘内侧（分栏插入）
  if (relativeX >= insertThresholdOuter && relativeX < insertThresholdInner) {
    // 插入线显示在窗口中间
    return {
      position: 'insert-left',
      isInsert: true,
      bounds: { 
        x: targetBounds.x, 
        y: targetBounds.y, 
        width: lineWidth,
        height: targetHeight 
      },
      insertBounds: {
        x: targetBounds.x,
        y: targetBounds.y,
        width: targetWidth / 2,
        height: targetHeight
      }
    };
  }
  
  // 检测右边缘内侧（分栏插入）
  if (relativeX > targetWidth - insertThresholdInner && relativeX <= targetWidth - insertThresholdOuter) {
    // 插入线显示在窗口中间
    return {
      position: 'insert-right',
      isInsert: true,
      bounds: { 
        x: targetBounds.x + targetWidth - lineWidth, 
        y: targetBounds.y, 
        width: lineWidth, 
        height: targetHeight 
      },
      insertBounds: {
        x: targetBounds.x + targetWidth / 2,
        y: targetBounds.y,
        width: targetWidth / 2,
        height: targetHeight
      }
    };
  }
  
  // 检测上边缘内侧（分栏插入）
  if (relativeY >= insertThresholdOuter && relativeY < insertThresholdInner) {
    // 插入线显示在窗口中间
    return {
      position: 'insert-top',
      isInsert: true,
      bounds: { 
        x: targetBounds.x, 
        y: targetBounds.y, 
        width: targetWidth, 
        height: lineWidth 
      },
      insertBounds: {
        x: targetBounds.x,
        y: targetBounds.y,
        width: targetWidth,
        height: targetHeight / 2
      }
    };
  }
  
  // 检测下边缘内侧（分栏插入）
  if (relativeY > targetHeight - insertThresholdInner && relativeY <= targetHeight - insertThresholdOuter) {
    // 插入线显示在窗口中间
    return {
      position: 'insert-bottom',
      isInsert: true,
      bounds: { 
        x: targetBounds.x, 
        y: targetBounds.y + targetHeight - lineWidth, 
        width: targetWidth, 
        height: lineWidth 
      },
      insertBounds: {
        x: targetBounds.x,
        y: targetBounds.y + targetHeight / 2,
        width: targetWidth,
        height: targetHeight / 2
      }
    };
  }
  
  // 外侧停靠检测：使用 10% 作为边缘检测阈值
  const thresholdX = targetWidth * 0.1;
  const thresholdY = targetHeight * 0.1;
  
  // 检测左边缘（外侧停靠）
  if (relativeX < thresholdX) {
    const expandedWidth = targetWidth + dragWidth;
    return {
      position: 'left',
      isInsert: false,
      bounds: { 
        x: targetBounds.x - dragWidth,  // 显示在窗口左边
        y: targetBounds.y, 
        width: dragWidth,
        height: targetHeight 
      },
      expandedSize: { width: expandedWidth, height: targetHeight }
    };
  }
  
  // 检测右边缘（外侧停靠）
  if (relativeX > targetWidth - thresholdX) {
    const expandedWidth = targetWidth + dragWidth;
    return {
      position: 'right',
      isInsert: false,
      bounds: { 
        x: targetBounds.x + targetWidth,  // 显示在窗口右边
        y: targetBounds.y, 
        width: dragWidth, 
        height: targetHeight 
      },
      expandedSize: { width: expandedWidth, height: targetHeight }
    };
  }
  
  // 检测上边缘（外侧停靠）
  if (relativeY < thresholdY) {
    const expandedHeight = targetHeight + dragHeight;
    return {
      position: 'top',
      isInsert: false,
      bounds: { 
        x: targetBounds.x, 
        y: targetBounds.y - dragHeight,  // 显示在窗口上方
        width: targetWidth, 
        height: dragHeight 
      },
      expandedSize: { width: targetWidth, height: expandedHeight }
    };
  }
  
  // 检测下边缘（外侧停靠）
  if (relativeY > targetHeight - thresholdY) {
    const expandedHeight = targetHeight + dragHeight;
    return {
      position: 'bottom',
      isInsert: false,
      bounds: { 
        x: targetBounds.x, 
        y: targetBounds.y + targetHeight,  // 显示在窗口下方
        width: targetWidth, 
        height: dragHeight 
      },
      expandedSize: { width: targetWidth, height: expandedHeight }
    };
  }
  
  return null;
}

// 检测容器窗口内部的分栏连接线
// 返回分栏连接线的位置信息，用于插入窗口
function detectSplitLineInContainer(mouseX, mouseY, targetBounds, targetWinData) {
  if (!targetWinData.isDockContainer || !targetWinData.dockTree) {
    return null;
  }
  
  const tree = targetWinData.dockTree;
  const targetLeft = targetBounds.x;
  const targetTop = targetBounds.y;
  const targetWidth = targetBounds.width;
  const targetHeight = targetBounds.height;
  
  // 计算鼠标相对于窗口的位置
  const relativeX = mouseX - targetLeft;
  const relativeY = mouseY - targetTop;
  
  // 分栏线检测阈值（像素）
  const lineThreshold = 15;
  
  // 递归检测分栏线
  const findSplitLine = (node, bounds) => {
    if (node.type === 'window') {
      return null;
    }
    
    if (node.type === 'split') {
      const { direction, children } = node;
      
      // 计算子节点的边界
      let currentPos = 0;
      for (let i = 0; i < children.length - 1; i++) {
        const childSize = calculateTreeSize(children[i]);
        let splitPos;
        
        if (direction === 'horizontal') {
          splitPos = bounds.x + currentPos + childSize.width;
          currentPos += childSize.width;
          
          // 检测垂直分栏线
          const lineX = splitPos;
          if (Math.abs(mouseX - lineX) < lineThreshold && 
              mouseY >= bounds.y && mouseY <= bounds.y + bounds.height) {
            return {
              position: `insert-split-${i}`,
              isInsert: true,
              insertIntoContainer: true,
              containerInsertIndex: i,
              bounds: {
                x: lineX - 2,
                y: bounds.y,
                width: 4,
                height: bounds.height
              }
            };
          }
        } else {
          splitPos = bounds.y + currentPos + childSize.height;
          currentPos += childSize.height;
          
          // 检测水平分栏线
          const lineY = splitPos;
          if (Math.abs(mouseY - lineY) < lineThreshold && 
              mouseX >= bounds.x && mouseX <= bounds.x + bounds.width) {
            return {
              position: `insert-split-${i}`,
              isInsert: true,
              insertIntoContainer: true,
              containerInsertIndex: i,
              bounds: {
                x: bounds.x,
                y: lineY - 2,
                width: bounds.width,
                height: 4
              }
            };
          }
        }
        
        // 递归检测子节点内部的分栏线
        let childBounds;
        if (direction === 'horizontal') {
          childBounds = {
            x: bounds.x + currentPos - childSize.width,
            y: bounds.y,
            width: childSize.width,
            height: bounds.height
          };
        } else {
          childBounds = {
            x: bounds.x,
            y: bounds.y + currentPos - childSize.height,
            width: bounds.width,
            height: childSize.height
          };
        }
        
        const result = findSplitLine(children[i], childBounds);
        if (result) return result;
      }
      
      // 检测最后一个子节点
      const lastChild = children[children.length - 1];
      const lastChildSize = calculateTreeSize(lastChild);
      let lastChildBounds;
      
      if (direction === 'horizontal') {
        lastChildBounds = {
          x: bounds.x + currentPos,
          y: bounds.y,
          width: lastChildSize.width,
          height: bounds.height
        };
      } else {
        lastChildBounds = {
          x: bounds.x,
          y: bounds.y + currentPos,
          width: bounds.width,
          height: lastChildSize.height
        };
      }
      
      return findSplitLine(lastChild, lastChildBounds);
    }
    
    return null;
  };
  
  return findSplitLine(tree, targetBounds);
}

// 创建停靠容器窗口（保留旧版本以兼容分离功能）
function createDockContainerWindow(windowsData, position, targetBounds, dragBounds) {
  const direction = position === 'left' || position === 'right' ? 'horizontal' : 'vertical';
  
  // 获取窗口尺寸
  const win1Size = windowsData[0].size || getDefaultWindowSize(windowsData[0].type);
  const win2Size = windowsData[1].size || getDefaultWindowSize(windowsData[1].type);
  
  // 构建树结构
  const win1Node = createWindowNode(windowsData[0].type, win1Size);
  const win2Node = createWindowNode(windowsData[1].type, win2Size);
  
  let tree;
  if (position === 'left' || position === 'top') {
    tree = createSplitNode(direction, [win1Node, win2Node]);
  } else {
    tree = createSplitNode(direction, [win2Node, win1Node]);
  }
  
  const newSize = calculateTreeSize(tree);
  return createDockContainerWindowFromTree(tree, targetBounds, newSize);
}

// 从容器窗口数据中提取子窗口信息（用于分离功能）
function extractChildWindowInfo(winData, bounds) {
  if (!winData.isDockContainer) {
    // 普通窗口：返回单个窗口信息
    return [{
      type: winData.type,
      size: { width: bounds.width, height: bounds.height }
    }];
  }
  
  // 容器窗口：从树结构中提取
  if (winData.dockTree) {
    const tree = winData.dockTree;
    if (tree.type === 'split' && tree.children) {
      return tree.children.map((child, index) => {
        if (child.type === 'window') {
          return {
            type: child.windowType,
            size: child.size,
            position: index === 0 ? 
              (tree.direction === 'horizontal' ? 'left' : 'top') : 
              (tree.direction === 'horizontal' ? 'right' : 'bottom')
          };
        }
        // 如果是嵌套分栏，返回容器类型
        return {
          type: 'dock-container',
          size: calculateTreeSize(child),
          position: index === 0 ? 
            (tree.direction === 'horizontal' ? 'left' : 'top') : 
            (tree.direction === 'horizontal' ? 'right' : 'bottom')
        };
      });
    }
  }
  
  // 旧格式兼容
  return [
    { type: 'chat', size: { width: bounds.width / 2, height: bounds.height }, position: 'left' },
    { type: 'chat', size: { width: bounds.width / 2, height: bounds.height }, position: 'right' }
  ];
}

// 执行停靠操作 - 使用树形分栏结构
// 支持任意深度的嵌套分栏
// position 可以是：
//   - 'left', 'right', 'top', 'bottom' (外侧停靠，新建分栏)
//   - 'insert-left', 'insert-right', 'insert-top', 'insert-bottom' (分栏插入到单窗口内)
//   - 'insert-split-N' (插入到容器窗口的分栏线位置)
function performDock(dragWindowId, targetWindowId, position, insertIndex) {
  console.log('[Dock] Performing dock:', dragWindowId, '->', targetWindowId, position, 'insertIndex:', insertIndex);
  const dragWinData = windows.get(dragWindowId);
  const targetWinData = windows.get(targetWindowId);
  
  if (!dragWinData || !targetWinData) {
    console.log('[Dock] Missing window data');
    return;
  }
  
  const targetBounds = targetWinData.window.getBounds();
  const dragBounds = dragWinData.window.getBounds();
  
  // 创建拖动窗口的树节点
  const dragNode = createTreeNodeFromWindow(dragWinData, dragBounds);
  
  // 检查是否是插入到容器窗口内部
  const isInsertIntoContainer = position.startsWith('insert-split-');
  
  console.log('[Dock] isInsertIntoContainer:', isInsertIntoContainer, 'isDockContainer:', targetWinData.isDockContainer, 'hasTree:', !!targetWinData.dockTree);
  
  if (isInsertIntoContainer && targetWinData.isDockContainer && targetWinData.dockTree) {
    // 插入到容器窗口内部的分栏线
    const targetTree = targetWinData.dockTree;
    const insertAt = insertIndex !== undefined ? insertIndex : parseInt(position.replace('insert-split-', ''));
    
    console.log('[Dock] Inserting into container at index:', insertAt);
    
    // 递归查找并插入节点
    let foundAndInserted = false;
    
    const insertIntoTree = (node, newNode, targetIndex, depth = 0) => {
      if (node.type === 'window') {
        return { node, inserted: false };
      }
      
      if (node.type === 'split') {
        const newChildren = [];
        
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i];
          
          // 检查是否在当前分栏的连接线位置
          if (i === targetIndex && !foundAndInserted) {
            foundAndInserted = true;
            
            // 获取相邻两个子节点
            const leftChild = node.children[i];
            const rightChild = node.children[i + 1];
            
            if (rightChild) {
              // 计算均分后的尺寸
              let leftSize, middleSize, rightSize;
              if (node.direction === 'horizontal') {
                const totalWidth = calculateTreeSize(leftChild).width + calculateTreeSize(rightChild).width;
                const thirdWidth = totalWidth / 3;
                leftSize = { width: thirdWidth, height: targetBounds.height };
                middleSize = { width: thirdWidth, height: targetBounds.height };
                rightSize = { width: thirdWidth, height: targetBounds.height };
              } else {
                const totalHeight = calculateTreeSize(leftChild).height + calculateTreeSize(rightChild).height;
                const thirdHeight = totalHeight / 3;
                leftSize = { width: targetBounds.width, height: thirdHeight };
                middleSize = { width: targetBounds.width, height: thirdHeight };
                rightSize = { width: targetBounds.width, height: thirdHeight };
              }
              
              // 更新子节点尺寸
              if (leftChild.type === 'window') leftChild.size = leftSize;
              if (rightChild.type === 'window') rightChild.size = rightSize;
              newNode.size = middleSize;
              
              // 添加 leftChild, newNode, rightChild
              newChildren.push(leftChild);
              newChildren.push(newNode);
              // rightChild 将在下一次循环中添加
              continue;
            }
          }
          
          // 递归处理子节点
          const result = insertIntoTree(child, newNode, targetIndex, depth + 1);
          if (result.inserted) {
            newChildren.push(result.node);
            foundAndInserted = true;
          } else {
            newChildren.push(child);
          }
        }
        
        return { node: { ...node, children: newChildren }, inserted: foundAndInserted };
      }
      
      return { node, inserted: false };
    };
    
    const result = insertIntoTree(targetTree, dragNode, insertAt);
    
    if (result.inserted) {
      console.log('[Dock] Successfully inserted into tree');
      
      // 关闭拖动窗口
      try {
        dragWinData.window.close();
        windows.delete(dragWindowId);
      } catch (err) {
        console.error('[Dock] Failed to close drag window:', err);
      }
      
      // 更新容器窗口的树结构
      targetWinData.dockTree = result.node;
      const newType = serializeDockTree(result.node);
      targetWinData.type = newType;
      
      // 通知容器窗口刷新
      targetWinData.window.webContents.send('dock-tree-updated', { tree: result.node, type: newType });
      
      console.log('[Dock] Inserted into container at index:', insertAt);
      hideAllPreviews();
      return;
    } else {
      console.log('[Dock] Failed to insert into tree, falling back to normal dock');
    }
  }
  
  // 创建目标窗口的树节点
  const targetNode = createTreeNodeFromWindow(targetWinData, targetBounds);
  
  // 判断是否为分栏插入
  const isInsert = position.startsWith('insert-') && !isInsertIntoContainer;
  const basePosition = isInsert ? position.replace('insert-', '') : position;
  
  // 根据停靠位置确定分栏方向
  const splitDirection = (basePosition === 'left' || basePosition === 'right') ? 'horizontal' : 'vertical';
  
  // 创建新的分栏树
  let newTree;
  
  if (isInsert) {
    // 分栏插入：均分目标窗口尺寸
    let dragSize, targetSize;
    if (splitDirection === 'horizontal') {
      const halfWidth = targetBounds.width / 2;
      dragSize = { width: halfWidth, height: targetBounds.height };
      targetSize = { width: halfWidth, height: targetBounds.height };
    } else {
      const halfHeight = targetBounds.height / 2;
      dragSize = { width: targetBounds.width, height: halfHeight };
      targetSize = { width: targetBounds.width, height: halfHeight };
    }
    
    // 更新节点尺寸
    if (dragNode.type === 'window') {
      dragNode.size = dragSize;
    }
    if (targetNode.type === 'window') {
      targetNode.size = targetSize;
    }
    
    // 创建分栏
    if (basePosition === 'left' || basePosition === 'top') {
      newTree = createSplitNode(splitDirection, [dragNode, targetNode]);
    } else {
      newTree = createSplitNode(splitDirection, [targetNode, dragNode]);
    }
    
    console.log('[Dock] Insert split:', basePosition, 'dragSize:', dragSize, 'targetSize:', targetSize);
  } else {
    // 外侧停靠：使用原有逻辑
    if (basePosition === 'left' || basePosition === 'top') {
      newTree = createSplitNode(splitDirection, [dragNode, targetNode]);
    } else {
      newTree = createSplitNode(splitDirection, [targetNode, dragNode]);
    }
  }
  
  // 计算新容器的尺寸
  const newSize = isInsert 
    ? { width: targetBounds.width, height: targetBounds.height }
    : calculateTreeSize(newTree);
  
  // 创建容器窗口
  const container = createDockContainerWindowFromTree(newTree, targetBounds, newSize);
  
  // 关闭原来的窗口
  try {
    dragWinData.window.close();
    windows.delete(dragWindowId);
    targetWinData.window.close();
    windows.delete(targetWindowId);
  } catch (err) {
    console.error('[Dock] Failed to close original windows:', err);
  }
  
  console.log('[Dock] Container created:', container.id);
  hideDockPreview();
  hideSeparatePreview();
}

// 从树结构创建停靠容器窗口
function createDockContainerWindowFromTree(tree, targetBounds, containerSize) {
  const id = `dock-container-${Date.now()}`;
  const windowType = serializeDockTree(tree);
  
  console.log('[Dock] Creating container from tree:', id, 'size:', containerSize.width, 'x', containerSize.height);
  console.log('[Dock] Tree structure:', JSON.stringify(tree, null, 2));
  
  const win = new BrowserWindow({
    width: containerSize.width,
    height: containerSize.height,
    x: targetBounds.x,
    y: targetBounds.y,
    minWidth: 400,
    minHeight: 200,
    frame: false,
    resizable: true,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      additionalArguments: [`--window-id=${id}`, `--window-type=${windowType}`],
    },
    show: false,
  });
  
  win.loadURL(isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../out/index.html')}`);
  
  win.once('ready-to-show', () => {
    win.show();
  });
  
  win.on('closed', () => {
    windows.delete(id);
    dockGroups.delete(id);
  });
  
  windows.set(id, { 
    window: win, 
    type: windowType, 
    isDockContainer: true,
    dockTree: tree, // 存储树结构
  });
  
  return { id, window: win };
}

// 解除停靠
function undockWindow(windowId) {
  const winData = windows.get(windowId);
  if (!winData || !winData.dockGroup) return;
  
  const dockGroupId = winData.dockGroup;
  const dockGroup = dockGroups.get(dockGroupId);
  if (!dockGroup) return;
  
  // 移除resize监听器
  if (winData.resizeHandler) {
    winData.window.removeListener('resize', winData.resizeHandler);
    winData.window.removeListener('move', winData.resizeHandler);
    delete winData.resizeHandler;
  }
  
  // 恢复原始大小
  const win = winData.window;
  win.setSize(600, 400);
  
  // 清除停靠状态
  delete winData.dockGroup;
  delete winData.dockPosition;
  
  // 通知渲染进程
  win.webContents.send('dock:state', { isDocked: false });
  
  // 从停靠组中移除另一个窗口
  const otherWindowId = dockGroup.windows.find(id => id !== windowId);
  if (otherWindowId) {
    const otherWinData = windows.get(otherWindowId);
    if (otherWinData) {
      // 移除resize监听器
      if (otherWinData.resizeHandler) {
        otherWinData.window.removeListener('resize', otherWinData.resizeHandler);
        otherWinData.window.removeListener('move', otherWinData.resizeHandler);
        delete otherWinData.resizeHandler;
      }
      
      delete otherWinData.dockGroup;
      delete otherWinData.dockPosition;
      otherWinData.window.webContents.send('dock:state', { isDocked: false });
      // 恢复原始大小
      otherWinData.window.setBounds(dockGroup.originalBounds);
    }
  }
  
  dockGroups.delete(dockGroupId);
}

function createActivityBarWindow() {
  const id = 'activitybar-' + Math.random().toString(36).substr(2, 9);
  
  const win = new BrowserWindow({
    width: 56,
    height: 56,
    x: 0,
    y: 0,
    minWidth: 56,
    minHeight: 56,
    frame: false,
    resizable: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      additionalArguments: [`--window-id=${id}`, '--window-type=activitybar'],
    },
    show: false,
  });

  win.loadURL(isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../out/index.html')}`);

  win.once('ready-to-show', () => {
    win.show();
  });

  win.on('closed', () => {
    windows.delete(id);
    app.quit();
  });

  windows.set(id, { window: win, type: 'activitybar' });
  return { id, window: win };
}

function createFloatingWindow(type, options = {}) {
  const id = Math.random().toString(36).substr(2, 9);
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  
  // 聊天输入窗口使用更小的最小高度
  const isChatInput = type === 'chat-input';
  const minHeight = isChatInput ? 100 : 200;
  
  const isGear = type === 'gear';

  const windowConfig = {
    width: options.width || 600,
    height: options.height || 400,
    x: options.x || Math.floor((screenWidth - (options.width || 600)) / 2),
    y: options.y || Math.floor((screenHeight - (options.height || 400)) / 2),
    minWidth: isGear ? 56 : 300,
    minHeight: isGear ? 200 : minHeight,
    frame: false,
    resizable: !isGear,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      additionalArguments: [`--window-id=${id}`, `--window-type=${type}`],
    },
    show: false,
  };

  const win = new BrowserWindow(windowConfig);
  
  win.loadURL(isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../out/index.html')}`);

  win.once('ready-to-show', () => {
    win.show();
    if (options.alwaysOnTop) {
      win.setAlwaysOnTop(true, 'floating');
    }
  });

  win.on('closed', () => {
    windows.delete(id);
  });

  windows.set(id, { window: win, type });
  
  return { id, window: win };
}

function getAnyWindowById(windowId) {
  const winData = windows.get(windowId);
  if (winData?.window && !winData.window.isDestroyed()) return winData.window;
  return null;
}

function createOrGetPopupWindow(popupId, windowType, parentWindowId) {
  const existing = popupWindows.get(popupId);
  if (existing?.window && !existing.window.isDestroyed()) {
    // windowType 变化时重建
    if (existing.windowType === windowType && existing.parentWindowId === parentWindowId) {
      return existing.window;
    }
    try {
      existing.window.close();
    } catch {}
  }

  const parent = parentWindowId ? getAnyWindowById(parentWindowId) : null;
  const internalId = `popup-${popupId}-${Date.now()}`;

  const win = new BrowserWindow({
    width: 520,
    height: 420,
    x: -9999,
    y: -9999,
    frame: false,
    resizable: false,
    backgroundColor: '#ffffff',
    alwaysOnTop: true,
    focusable: true,
    skipTaskbar: true,
    parent: parent || undefined,
    hasShadow: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      additionalArguments: [
        `--window-id=${internalId}`,
        `--window-type=${windowType}`,
        `--popup-id=${popupId}`,
        `--popup-parent-window-id=${parentWindowId || ''}`,
      ],
    },
    show: false,
  });

  win.loadURL(isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../out/index.html')}`);

  win.on('closed', () => {
    popupWindows.delete(popupId);
  });

  popupWindows.set(popupId, { window: win, windowType, parentWindowId });
  return win;
}

ipcMain.handle('window:create', (event, { type, options }) => {
  const { id, window } = createFloatingWindow(type, options);
  return { id, bounds: window.getBounds() };
});

ipcMain.handle('window:focus', (event, { windowId }) => {
  const winData = windows.get(windowId);
  if (winData?.window && !winData.window.isDestroyed()) {
    try {
      winData.window.show();
      winData.window.focus();
    } catch (e) {
      console.error('[Window] focus failed:', e);
    }
  }
});

ipcMain.handle('window:toggleVisibility', (event, { windowId }) => {
  const winData = windows.get(windowId);
  if (!winData?.window || winData.window.isDestroyed()) {
    return { ok: false, visible: false };
  }

  try {
    if (winData.window.isVisible()) {
      winData.window.hide();
      return { ok: true, visible: false };
    }

    winData.window.show();
    winData.window.focus();
    return { ok: true, visible: true };
  } catch (e) {
    console.error('[Window] toggleVisibility failed:', e);
    return { ok: false, visible: winData.window.isVisible() };
  }
});

ipcMain.handle('popup:show', async (event, payload) => {
  const { popupId, windowType, bounds, parentWindowId, autoHide = true } = payload || {};
  if (!popupId || !windowType || !bounds) {
    return { ok: false, popupId: popupId || 'unknown' };
  }

  const win = createOrGetPopupWindow(popupId, windowType, parentWindowId);

  try {
    let minWidth = 160;
    let minHeight = 120;

    if (windowType === 'popup:vertical-tray') {
      minWidth = 56;
      minHeight = 300;
    } else if (windowType === 'popup:horizontal-tray') {
      minWidth = 170;
      minHeight = 56;
    } else if (windowType?.startsWith('popup:project-menu:')) {
      minWidth = 300;
      minHeight = 260;
    } else if (windowType === 'popup:server-manager') {
      minWidth = 420;
      minHeight = 320;
    }

    win.setBounds({
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.max(minWidth, Math.round(bounds.width)),
      height: Math.max(minHeight, Math.round(bounds.height)),
    });
    win.show();
    win.focus();

    // Auto-hide on blur
    win.removeAllListeners('blur');
    if (autoHide) {
      win.on('blur', () => {
        if (!win.isDestroyed()) {
          win.hide();
        }
      });
    }
  } catch (e) {
    console.error('[Popup] show failed:', e);
    return { ok: false, popupId };
  }

  return { ok: true, popupId };
});

ipcMain.handle('popup:hide', async (event, { popupId }) => {
  const existing = popupWindows.get(popupId);
  if (existing?.window && !existing.window.isDestroyed()) {
    existing.window.hide();
  }
  return { ok: true, popupId };
});

ipcMain.handle('popup:isVisible', async (event, { popupId }) => {
  const existing = popupWindows.get(popupId);
  const visible = !!(existing?.window && !existing.window.isDestroyed() && existing.window.isVisible());
  return { ok: true, popupId, visible };
});

// 停靠相关 IPC
let currentDragWindowId = null;
let currentDockPreview = null;

ipcMain.handle('dock:startDrag', (event, { windowId, bounds }) => {
  try {
    console.log('[Dock] Start drag:', windowId, bounds);
  } catch (e) {
    // Ignore console errors (EPIPE)
  }
  currentDragWindowId = windowId;
  
   // 检查窗口是否存在
   const winData = windows.get(windowId);
   if (!winData) {
     console.log('[Dock] Window not found:', windowId);
     return;
   }
   
   // 允许容器窗口参与停靠（分离时可以停靠到其他窗口）
   // if (winData.isDockContainer) {
   //   console.log('[Dock] Container window cannot dock');
   //   currentDragWindowId = null;
   //   return;
   // }
   
   // 如果窗口之前已停靠，解除停靠（分离出独立窗口）
   if (winData.dockGroup) {
     undockWindow(windowId);
   }
});

ipcMain.handle('dock:move', (event, { windowId, mouseX, mouseY, dragBounds, dragSize }) => {
  if (currentDragWindowId !== windowId) return;
  
  // 检测与其他窗口的停靠
  let foundPreview = null;
  
   for (const [id, targetWinData] of windows) {
     if (id === windowId || targetWinData.type === 'activitybar') continue;
    
    const targetBounds = targetWinData.window.getBounds();
    
    // 首先检测容器窗口内部的分栏线
    if (targetWinData.isDockContainer) {
      const splitLinePreview = detectSplitLineInContainer(mouseX, mouseY, targetBounds, targetWinData);
      if (splitLinePreview) {
        console.log('[Dock] Found split line in container:', splitLinePreview.position, 'for target:', id);
        foundPreview = { ...splitLinePreview, targetWindowId: id };
        break;
      }
    }
    
    // 然后检测普通的停靠位置
    const preview = detectDockPosition(mouseX, mouseY, dragBounds, targetBounds, dragSize);
    
    if (preview) {
      console.log('[Dock] Found preview:', preview.position, 'isInsert:', preview.isInsert, 'for target:', id);
      foundPreview = { ...preview, targetWindowId: id };
      break;
    }
  }
  
  if (foundPreview) {
    currentDockPreview = foundPreview;
    // 根据类型显示不同的预览
    showDockPreviewWithMode(foundPreview.bounds, foundPreview.isInsert);
  } else {
    currentDockPreview = null;
    hideDockPreview();
    hideInsertPreview();
  }
});

ipcMain.handle('dock:endDrag', (event, { windowId }) => {
  console.log('[Dock] End drag:', windowId, 'preview:', currentDockPreview?.position, 'insertIndex:', currentDockPreview?.containerInsertIndex);
  if (currentDragWindowId !== windowId) return { docked: false };
  
  // 如果有预览，执行停靠
  if (currentDockPreview) {
    performDock(
      windowId, 
      currentDockPreview.targetWindowId, 
      currentDockPreview.position,
      currentDockPreview.containerInsertIndex
    );
    currentDragWindowId = null;
    currentDockPreview = null;
    hideAllPreviews();
    return { docked: true };
  }
  
  currentDragWindowId = null;
  hideAllPreviews();
  return { docked: false };
});

ipcMain.handle('dock:undock', (event, { windowId }) => {
  undockWindow(windowId);
});

// 绿色分离预览窗口 IPC
ipcMain.handle('separatePreview:show', (event, { bounds }) => {
  showSeparatePreview(bounds);
});

ipcMain.handle('separatePreview:hide', (event) => {
  hideSeparatePreview();
});

// 蓝色虚线框预览窗口 IPC（局部拖移时显示在窗口外）
ipcMain.handle('localPreview:show', (event, { bounds }) => {
  showLocalPreview(bounds);
});

ipcMain.handle('localPreview:hide', (event) => {
  hideLocalPreview();
});

// 蓝色实线预览窗口 IPC（右键切换模式时显示）
ipcMain.handle('modeSwitchPreview:show', (event, { bounds }) => {
  showModeSwitchPreview(bounds);
});

ipcMain.handle('modeSwitchPreview:hide', (event) => {
  hideModeSwitchPreview();
});

ipcMain.handle('dock:getAllWindows', (event) => {
  const result = [];
  for (const [id, winData] of windows) {
    if (winData.type !== 'activitybar') {
      result.push({
        id,
        type: winData.type,
        bounds: winData.window.getBounds(),
        isVisible: winData.window.isVisible(),
        isDocked: !!winData.dockGroup,
        dockPosition: winData.dockPosition
      });
    }
  }
  return result;
});

// 从容器窗口分离出一个窗口
ipcMain.handle('window:separateFromContainer', async (event, { containerId, windowType, newBounds }) => {
  console.log('[Separate] Separating window:', windowType, 'from container:', containerId);
  
  const containerData = windows.get(containerId);
  if (!containerData || !containerData.isDockContainer) {
    console.log('[Separate] Container not found or not a container');
    return null;
  }
  
  // 获取树结构
  const tree = containerData.dockTree;
  if (!tree) {
    console.log('[Separate] No tree structure found');
    return null;
  }
  
  // 查找要分离的窗口节点
  const findAndRemoveWindow = (node, targetType) => {
    if (node.type === 'window') {
      if (node.windowType === targetType) {
        return { removed: node, remaining: null };
      }
      return null;
    }
    
    if (node.type === 'split') {
      // 尝试从子节点中移除
      for (let i = 0; i < node.children.length; i++) {
        const result = findAndRemoveWindow(node.children[i], targetType);
        if (result) {
          // 移除找到的节点
          const newChildren = node.children.filter((_, idx) => idx !== i);
          
          if (result.remaining) {
            // 如果子节点是分栏，合并其子节点
            newChildren.splice(i, 0, result.remaining);
          }
          
          if (newChildren.length === 0) {
            return { removed: result.removed, remaining: null };
          } else if (newChildren.length === 1) {
            // 只剩一个子节点，直接返回它
            return { removed: result.removed, remaining: newChildren[0] };
          } else {
            // 返回更新后的分栏
            return { 
              removed: result.removed, 
              remaining: { ...node, children: newChildren }
            };
          }
        }
      }
    }
    
    return null;
  };
  
  const result = findAndRemoveWindow(tree, windowType);
  if (!result) {
    console.log('[Separate] Window type not found in container');
    return null;
  }
  
  const containerBounds = containerData.window.getBounds();
  
  // 创建被分离的窗口
  const separatedWindow = createFloatingWindow(windowType, {
    x: newBounds?.x ?? containerBounds.x + 50,
    y: newBounds?.y ?? containerBounds.y + 50,
    width: newBounds?.width ?? result.removed.size?.width ?? 500,
    height: newBounds?.height ?? result.removed.size?.height ?? 400
  });
  console.log('[Separate] Created separated window:', separatedWindow.id);
  
  // 关闭容器窗口
  containerData.window.close();
  windows.delete(containerId);
  
  // 创建剩余窗口
  let remainingWindowId;
  if (result.remaining) {
    if (result.remaining.type === 'window') {
      // 剩余的是单个窗口
      const remainingWin = createFloatingWindow(result.remaining.windowType, {
        x: containerBounds.x,
        y: containerBounds.y,
        width: result.remaining.size?.width ?? containerBounds.width,
        height: result.remaining.size?.height ?? containerBounds.height
      });
      remainingWindowId = remainingWin.id;
    } else {
      // 剩余的是分栏，创建新的容器窗口
      const remainingSize = calculateTreeSize(result.remaining);
      const remainingContainer = createDockContainerWindowFromTree(
        result.remaining, 
        containerBounds, 
        { width: containerBounds.width, height: containerBounds.height }
      );
      remainingWindowId = remainingContainer.id;
    }
    console.log('[Separate] Created remaining window:', remainingWindowId);
  }
  
  return { 
    separatedWindowId: separatedWindow.id,
    remainingWindowId 
  };
});

ipcMain.handle('window:close', (event, { windowId }) => {
  const winData = windows.get(windowId);
  if (winData) {
    winData.window.close();
    windows.delete(windowId);
  }
});

ipcMain.handle('window:move', (event, { windowId, x, y }) => {
  const winData = windows.get(windowId);
  if (winData) {
    winData.window.setPosition(x, y);
  }
});

ipcMain.handle('window:resize', (event, { windowId, width, height }) => {
  const winData = windows.get(windowId);
  if (winData) {
    winData.window.setSize(width, height);
  }
});

ipcMain.handle('window:setOpacity', (event, { windowId, opacity }) => {
  const winData = windows.get(windowId);
  if (winData) {
    winData.window.setOpacity(opacity);
  }
});

ipcMain.handle('window:setAlwaysOnTop', (event, { windowId, alwaysOnTop }) => {
  const winData = windows.get(windowId);
  if (winData) {
    winData.window.setAlwaysOnTop(alwaysOnTop, 'floating');
  }
});

// Alt 键穿透窗口功能
ipcMain.handle('window:setClickThrough', (event, { windowId, enabled, opacity }) => {
  const winData = windows.get(windowId);
  if (winData) {
    // 设置鼠标穿透（forward: true 表示鼠标事件转发到下层窗口）
    winData.window.setIgnoreMouseEvents(enabled, { forward: true });
    // 同时设置透明度
    if (opacity !== undefined) {
      winData.window.setOpacity(opacity);
    }
  }
});

// 切换窗口的始终虚化状态（alt+右键）
ipcMain.handle('alt:toggleAlwaysTransparent', (event, { windowId }) => {
  const winData = windows.get(windowId);
  if (!winData) {
    console.log('[Alt] Window not found:', windowId);
    return { success: false, alwaysTransparent: false };
  }
  
  // 检查窗口是否为顶置状态
  const isAlwaysOnTop = winData.window.isAlwaysOnTop();
  if (!isAlwaysOnTop) {
    console.log('[Alt] Window is not always on top:', windowId);
    return { success: false, alwaysTransparent: false, reason: 'not_always_on_top' };
  }
  
  // 切换始终虚化状态
  if (alwaysTransparentWindowId === windowId) {
    // 取消始终虚化
    alwaysTransparentWindowId = null;
    winData.window.setIgnoreMouseEvents(false, { forward: true });
    winData.window.setOpacity(1);
    console.log('[Alt] Disabled always transparent for:', windowId);
    return { success: true, alwaysTransparent: false };
  } else {
    // 设置为始终虚化
    // 先取消之前窗口的始终虚化
    if (alwaysTransparentWindowId) {
      const prevWinData = windows.get(alwaysTransparentWindowId);
      if (prevWinData && !prevWinData.window.isDestroyed()) {
        prevWinData.window.setIgnoreMouseEvents(false, { forward: true });
        prevWinData.window.setOpacity(1);
        prevWinData.window.webContents.send('alt:alwaysTransparentChanged', { enabled: false });
      }
    }
    
    alwaysTransparentWindowId = windowId;
    
    // 如果当前没有按下 Alt，立即启用虚化
    if (!globalAltPressed) {
      winData.window.setIgnoreMouseEvents(true, { forward: true });
      winData.window.setOpacity(0.51);
    }
    
    console.log('[Alt] Enabled always transparent for:', windowId);
    return { success: true, alwaysTransparent: true };
  }
});

// 获取窗口的始终虚化状态
ipcMain.handle('alt:getAlwaysTransparent', (event, { windowId }) => {
  return { alwaysTransparent: alwaysTransparentWindowId === windowId };
});

// 报告窗口鼠标悬浮状态（用于确定顶层窗口）
ipcMain.handle('alt:reportMouseOver', (event, { windowId, isOver }) => {
  const previousTopmost = topmostWindowId;
  
  if (isOver) {
    topmostWindowId = windowId;
  } else if (topmostWindowId === windowId) {
    topmostWindowId = null;
  }
  
  // 如果 Alt 已按下且悬浮窗口变化，更新穿透状态（排除始终虚化的窗口）
  if (globalAltPressed && previousTopmost !== topmostWindowId) {
    // 取消之前窗口的穿透（如果不是始终虚化的窗口）
    if (previousTopmost && previousTopmost !== alwaysTransparentWindowId) {
      const prevWinData = windows.get(previousTopmost);
      if (prevWinData && !prevWinData.window.isDestroyed()) {
        prevWinData.window.webContents.send('alt:stateChanged', { pressed: false, cancelOthers: true });
      }
    }
    
    // 启用新窗口的穿透（如果不是始终虚化的窗口）
    if (topmostWindowId && topmostWindowId !== alwaysTransparentWindowId) {
      const newWinData = windows.get(topmostWindowId);
      if (newWinData && !newWinData.window.isDestroyed()) {
        newWinData.window.webContents.send('alt:stateChanged', { pressed: true, cancelOthers: false });
      }
    }
  }
});

// Alt 键状态由全局钩子 (uIOhook) 处理，此 IPC 保留作为备用
ipcMain.handle('alt:reportState', (event, { pressed, windowId }) => {
  console.log('[Alt] IPC reportState (handled by global hook):', pressed, 'windowId:', windowId);
  // Alt 键状态现在由 uIOhook 全局钩子处理，这里只记录日志
});

ipcMain.handle('alt:getState', (event) => {
  return { pressed: globalAltPressed, topmostWindowId, alwaysTransparentWindowId };
});

ipcMain.handle('window:minimize', (event, { windowId }) => {
  const winData = windows.get(windowId);
  if (winData) {
    winData.window.minimize();
  }
});

ipcMain.handle('window:getBounds', (event, { windowId }) => {
  const winData = windows.get(windowId);
  if (winData) {
    return winData.window.getBounds();
  }
  return null;
});

ipcMain.handle('window:maximize', (event, { windowId }) => {
  const winData = windows.get(windowId);
  if (winData) {
    if (winData.window.isMaximized()) {
      winData.window.unmaximize();
    } else {
      winData.window.maximize();
    }
  }
});

ipcMain.handle('window:restore', (event, { windowId }) => {
  const winData = windows.get(windowId);
  if (winData) {
    winData.window.restore();
  }
});

ipcMain.handle('dialog:showOpen', async (event, options) => {
  const firstWindow = windows.values().next().value;
  const parentWindow = firstWindow ? firstWindow.window : null;
  const result = await dialog.showOpenDialog(parentWindow, options);
  return result;
});

ipcMain.handle('dialog:showSave', async (event, options) => {
  const firstWindow = windows.values().next().value;
  const parentWindow = firstWindow ? firstWindow.window : null;
  const result = await dialog.showSaveDialog(parentWindow, options);
  return result;
});

// ============================================
// 文件系统 IPC
// ============================================

// 项目存储
const projectStore = new SecureStore('projects');

// 读取目录内容
ipcMain.handle('fs:readDir', async (event, { dirPath }) => {
  try {
    const items = [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      // 跳过隐藏文件（以 . 开头的文件/文件夹）
      if (entry.name.startsWith('.')) continue;
      
      const fullPath = path.join(dirPath, entry.name);
      const stats = fs.statSync(fullPath);
      
      items.push({
        name: entry.name,
        path: fullPath,
        type: entry.isDirectory() ? 'folder' : 'file',
        isDirectory: entry.isDirectory(),
        modifiedTime: stats.mtime.getTime(),
      });
    }
    
    // 按类型排序：文件夹在前，文件在后，然后按名称排序
    items.sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      return a.name.localeCompare(b.name);
    });
    
    return { ok: true, items };
  } catch (error) {
    console.error('[fs:readDir] Error:', error);
    return { ok: false, error: error.message };
  }
});

// 读取文件内容（文本）
ipcMain.handle('fs:readFile', async (event, { filePath, options }) => {
  try {
    const encoding = options?.encoding || 'utf-8';
    const content = fs.readFileSync(filePath, { encoding });
    return { ok: true, content };
  } catch (error) {
    console.error('[fs:readFile] Error:', error);
    return { ok: false, error: error.message };
  }
});

// 写入文件内容（文本）
ipcMain.handle('fs:writeFile', async (event, { filePath, content, options }) => {
  try {
    const encoding = options?.encoding || 'utf-8';
    fs.writeFileSync(filePath, content ?? '', { encoding });
    return { ok: true };
  } catch (error) {
    console.error('[fs:writeFile] Error:', error);
    return { ok: false, error: error.message };
  }
});

// 获取项目列表
ipcMain.handle('project:list', async () => {
  try {
    const projects = projectStore.get('list') || [];
    return { ok: true, projects };
  } catch (error) {
    console.error('[project:list] Error:', error);
    return { ok: false, error: error.message };
  }
});

// 添加项目
ipcMain.handle('project:add', async (event, { name, path: projectPath }) => {
  try {
    const projects = projectStore.get('list') || [];
    
    // 检查是否已存在
    if (projects.some(p => p.path === projectPath)) {
      return { ok: false, error: '项目已存在' };
    }
    
    const newProject = {
      id: 'proj-' + Date.now(),
      name,
      path: projectPath,
      addedAt: Date.now(),
    };
    
    projects.push(newProject);
    projectStore.set('list', projects);
    
    return { ok: true, project: newProject };
  } catch (error) {
    console.error('[project:add] Error:', error);
    return { ok: false, error: error.message };
  }
});

// 删除项目
ipcMain.handle('project:remove', async (event, { projectId }) => {
  try {
    let projects = projectStore.get('list') || [];
    projects = projects.filter(p => p.id !== projectId);
    projectStore.set('list', projects);
    
    return { ok: true };
  } catch (error) {
    console.error('[project:remove] Error:', error);
    return { ok: false, error: error.message };
  }
});

// 打开文件夹选择对话框
ipcMain.handle('dialog:openFolder', async () => {
  const firstWindow = windows.values().next().value;
  const parentWindow = firstWindow ? firstWindow.window : null;
  
  const result = await dialog.showOpenDialog(parentWindow, {
    properties: ['openDirectory'],
    title: '选择项目文件夹',
  });
  
  if (result.canceled || !result.filePaths.length) {
    return { ok: true, canceled: true };
  }
  
  const folderPath = result.filePaths[0];
  const folderName = path.basename(folderPath);
  
  return { ok: true, canceled: false, path: folderPath, name: folderName };
});

ipcMain.handle('ai:status', async () => {
  const now = Date.now();
  // 1s cache
  if (cachedAIStatus && now - cachedAIStatusAt < 1000) {
    return cachedAIStatus;
  }

  const token = aiAuthStore.get('copilot.token');
  const envToken = process.env.COPILOT_GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

  const runtimeSupported = await checkRuntimeSupport();
  if (!runtimeSupported) {
    let bridgeDetail = '';
    try {
      const health = await getBridgeHealth();
      bridgeDetail = ` Bridge=${health.execPath} ${health.nodeVersion}`;
    } catch {}

    cachedAIStatus = {
      backend: 'copilot',
      status: 'error',
      detail: `Runtime missing node:sqlite. Use Node >= 22.13 (or run Copilot SDK bridge in external Node runtime).${bridgeDetail}`,
      lastUpdated: now,
    };
    cachedAIStatusAt = now;
    return cachedAIStatus;
  }

  try {
    // 以 SDK 启动结果为准（包括 useLoggedInUser 模式）
    const startInfo = await ensureCopilotClientStarted();
    const health = await getBridgeHealth().catch(() => null);
    const bridgeInfo = health ? ` | bridge ${health.nodeVersion}` : '';
    cachedAIStatus = {
      backend: 'copilot',
      status: 'connected',
      detail: `${token || envToken ? 'Copilot ready (token)' : `Copilot ready (${startInfo?.authMode || 'logged-in-user'})`}${bridgeInfo}`,
      lastUpdated: now,
    };
    cachedAIStatusAt = now;
    return cachedAIStatus;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Copilot init failed';
    cachedAIStatus = {
      backend: 'copilot',
      status: !token && !envToken ? 'disconnected' : 'error',
      detail: message,
      lastUpdated: now,
    };
    cachedAIStatusAt = now;
    return cachedAIStatus;
  }
});

ipcMain.handle('ai:log:list', async () => {
  return { ok: true, logs: [...aiDebugLogs] };
});

ipcMain.handle('ai:log:clear', async () => {
  aiDebugLogs.splice(0, aiDebugLogs.length);
  broadcastAIEvent('ai:log:clear', { ok: true, at: Date.now() });
  return { ok: true };
});

ipcMain.handle('ai:models', async () => {
  appendAILog('info', 'models', 'list requested');
  try {
    const runtimeSupported = await checkRuntimeSupport();
    if (!runtimeSupported) {
      return {
        ok: false,
        authRequired: false,
        error: 'Runtime missing node:sqlite. Copilot models unavailable in current runtime.',
        models: [
          { id: 'gpt-4.1', label: 'GPT-4.1', rateLabel: '1x' },
          { id: 'gpt-4o-mini', label: 'GPT-4o Mini', rateLabel: '0.4x' },
          { id: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', rateLabel: '1.2x' },
          { id: 'none', label: '本地模式(无云)', rateLabel: '0x' },
        ],
      };
    }

    await ensureCopilotClientStarted();
    const result = await listModelsThroughBridge();
    const rawModels = Array.isArray(result?.models) ? result.models : [];

    const mapped = rawModels
      .filter((m) => m && typeof m.id === 'string')
      .map((m) => {
        const multiplier = typeof m?.billing?.multiplier === 'number' ? m.billing.multiplier : 1;
        const rateLabel = `${multiplier}x`;
        const state = m?.policy?.state;
        const stateSuffix = state === 'disabled' ? ' (不可用)' : state === 'unconfigured' ? ' (未配置)' : '';
        return {
          id: m.id,
          label: `${m.name || m.id}${stateSuffix}`,
          rateLabel,
        };
      });

    if (mapped.length === 0) {
      appendAILog('warn', 'models', 'list returned empty, fallback used');
      return {
        ok: true,
        models: [
          { id: 'gpt-4.1', label: 'GPT-4.1', rateLabel: '1x' },
          { id: 'none', label: '本地模式(无云)', rateLabel: '0x' },
        ],
      };
    }

    appendAILog('info', 'models', 'list success', { count: mapped.length });
    return { ok: true, models: mapped };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list models';
    const authRequired = /not authenticated|authenticate/i.test(message);
    appendAILog(authRequired ? 'warn' : 'error', 'models', 'list failed', { message, authRequired });
    return {
      ok: false,
      error: message,
      authRequired,
      models: [],
    };
  }
});

ipcMain.handle('ai:send', async (event, payload) => {
  appendAILog('info', 'send', 'request received', {
    model: payload?.model,
    messageCount: Array.isArray(payload?.messages) ? payload.messages.length : 0,
  });
  try {
    const runtimeSupported = await checkRuntimeSupport();
    if (!runtimeSupported) {
      return {
        ok: false,
        error: 'Runtime missing node:sqlite. Copilot SDK cannot start in current Electron runtime.',
      };
    }

    // 先确保 SDK 会话可启动（支持 token 与 useLoggedInUser 两种路径）
    await ensureCopilotClientStarted();

    // 验证请求格式
    if (!payload || !payload.messages || !Array.isArray(payload.messages)) {
      return {
        ok: false,
        error: 'Invalid request format. Expected { messages: [...] }',
      };
    }

    // 调用会话管理器发送消息
    const result = await sendMessage(payload.messages, {
      model: payload.model,
      temperature: payload.temperature,
    }, {
      onChunk: (chunk) => {
        try {
          event.sender.send('ai:stream:chunk', chunk);
        } catch {}
      },
      onEnd: (data) => {
        try {
          event.sender.send('ai:stream:end', data);
        } catch {}
      },
      onError: (err) => {
        try {
          event.sender.send('ai:stream:error', err);
        } catch {}
      },
      onOperation: (operation) => {
        try {
          event.sender.send('ai:operation', operation);
        } catch {}
        if (operation?.label) {
          appendAILog('info', 'send.operation', String(operation.label), {
            state: operation?.state,
            detail: operation?.detail,
          });
        }
      },
    });

    appendAILog('info', 'send', 'request completed', {
      ok: !!result?.ok,
      hasResponse: !!result?.response?.message?.content,
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[AI] Error in ai:send:', message);
    appendAILog('error', 'send', 'request failed', { message });
    return {
      ok: false,
      error: `AI backend error: ${message}`,
    };
  }
});

ipcMain.handle('ai:upload', async (event, payload) => {
  appendAILog('info', 'upload', 'upload requested', {
    hasImage: !!payload?.image,
    imageName: payload?.image?.name,
    imageSize: payload?.image?.size,
  });
  try {
    const runtimeSupported = await checkRuntimeSupport();
    if (!runtimeSupported) {
      return {
        ok: false,
        error: 'Runtime missing node:sqlite. Copilot image upload unavailable.',
      };
    }

    const image = payload?.image;
    if (!image) {
      return { ok: false, error: 'Invalid upload payload: image is required.' };
    }

    await ensureCopilotClientStarted();
    const uploaded = await uploadImageThroughBridge(image);
    appendAILog('info', 'upload', 'upload success', { id: uploaded?.id, name: uploaded?.name });
    return { ok: true, image: uploaded };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    appendAILog('error', 'upload', 'upload failed', { message });
    return { ok: false, error: message };
  }
});

ipcMain.handle('ai:auth:status', async () => {
  const token = aiAuthStore.get('copilot.token');
  const user = aiAuthStore.get('copilot.user');
  const expiresAt = aiAuthStore.get('copilot.expiresAt');
  const isExpired = typeof expiresAt === 'number' && Date.now() > expiresAt;
  const envToken = process.env.COPILOT_GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const authDebug = getAuthDebugState();
  const credentialSource = authDebug?.forcedAuthMode === 'logged-in-user'
    ? 'logged-in-user'
    : token
    ? 'store'
    : envToken
    ? 'env'
    : 'none';
  appendAILog('info', 'auth.status', 'status requested', { credentialSource });

  const runtimeSupported = await checkRuntimeSupport();
  if (!runtimeSupported) {
    let bridgeDetail = '';
    try {
      const health = await getBridgeHealth();
      bridgeDetail = ` bridge=${health.execPath} ${health.nodeVersion}`;
    } catch {}

    return {
      state: 'error',
      detail: `Runtime missing node:sqlite (Copilot SDK requires Node >= 22.13).${bridgeDetail ? ` ${bridgeDetail}` : ''}`,
      lastUpdated: Date.now(),
      credentialSource,
      user: typeof user === 'object' ? user : undefined,
    };
  }

  if (isExpired) {
    return {
      state: 'error',
      detail: 'Token expired',
      lastUpdated: Date.now(),
      credentialSource,
      user: typeof user === 'object' ? user : undefined,
    };
  }

  try {
    try {
      await listModelsThroughBridge();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication required';
      if (/not authenticated|authenticate/i.test(message)) {
        appendAILog('warn', 'auth.status', 'not authenticated', { message, credentialSource });
        return {
          state: 'unauthenticated',
          detail: message,
          lastUpdated: Date.now(),
          user: typeof user === 'object' ? user : undefined,
          credentialSource,
        };
      }
      throw error;
    }

    const startInfo = await ensureCopilotClientStarted();
    const health = await getBridgeHealth().catch(() => null);
    const bridgeInfo = health ? ` (bridge ${health.nodeVersion})` : '';
    return {
      state: 'authenticated',
      detail: token || envToken ? `Token available${bridgeInfo}` : `Authenticated via ${startInfo?.authMode || 'logged-in-user'}${bridgeInfo}`,
      lastUpdated: Date.now(),
      credentialSource,
      user: typeof user === 'object' ? user : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Auth check failed';
    appendAILog('error', 'auth.status', 'status failed', { message, credentialSource });
    return {
      state: 'unauthenticated',
      detail: message,
      lastUpdated: Date.now(),
      credentialSource,
      user: typeof user === 'object' ? user : undefined,
    };
  }
});

ipcMain.handle('ai:auth:start', async (event, payload) => {
  appendAILog('info', 'auth.start', 'start requested', {
    hasToken: !!payload?.token,
    tokenLength: typeof payload?.token === 'string' ? payload.token.length : 0,
  });

  const token = payload?.token;
  if (token && typeof token === 'string') {
    setUseLoggedInUserAuth(false);
    const normalizedToken = token.trim();
    if (!normalizedToken) {
      return { ok: false, error: 'Token 不能为空' };
    }

    const prevToken = aiAuthStore.get('copilot.token');
    const prevUser = aiAuthStore.get('copilot.user');
    const prevExpiresAt = aiAuthStore.get('copilot.expiresAt');
    const prevRefreshToken = aiAuthStore.get('copilot.refreshToken');

    try {
      setAuthToken(normalizedToken);
      await ensureCopilotClientStarted();
      await listModelsThroughBridge();

      aiAuthStore.set('copilot.token', normalizedToken);
      if (payload?.user) {
        aiAuthStore.set('copilot.user', payload.user);
      }
      if (payload?.expiresAt) {
        aiAuthStore.set('copilot.expiresAt', payload.expiresAt);
      }
      if (payload?.refreshToken) {
        aiAuthStore.set('copilot.refreshToken', payload.refreshToken);
      }

      appendAILog('info', 'auth.start', 'token validated and persisted', { credentialSource: 'store' });
      return { ok: true };
    } catch (error) {
      setAuthToken(prevToken || null);

      if (typeof prevToken === 'string' && prevToken) {
        aiAuthStore.set('copilot.token', prevToken);
      } else {
        aiAuthStore.delete('copilot.token');
      }
      if (prevUser) {
        aiAuthStore.set('copilot.user', prevUser);
      } else {
        aiAuthStore.delete('copilot.user');
      }
      if (typeof prevExpiresAt === 'number') {
        aiAuthStore.set('copilot.expiresAt', prevExpiresAt);
      } else {
        aiAuthStore.delete('copilot.expiresAt');
      }
      if (typeof prevRefreshToken === 'string' && prevRefreshToken) {
        aiAuthStore.set('copilot.refreshToken', prevRefreshToken);
      } else {
        aiAuthStore.delete('copilot.refreshToken');
      }

      const message = error instanceof Error ? error.message : 'Token validation failed';
      appendAILog('error', 'auth.start', 'token validation failed', { message });
      return { ok: false, error: `Token 校验失败：${message}` };
    }
  }

  try {
    await ensureCopilotClientStarted();
    await listModelsThroughBridge();
    appendAILog('info', 'auth.start', 'logged-in-user auth validated');
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Copilot auth failed';
    appendAILog('error', 'auth.start', 'auth failed without token', { message });
    return { ok: false, error: `${message}. Please run \"gh auth login\" and try again.` };
  }
});

ipcMain.handle('ai:auth:logout', async () => {
  appendAILog('info', 'auth.logout', 'logout requested');
  setUseLoggedInUserAuth(false);
  aiAuthStore.delete('copilot.token');
  aiAuthStore.delete('copilot.user');
  aiAuthStore.delete('copilot.expiresAt');
  aiAuthStore.delete('copilot.refreshToken');
  setAuthToken(null); // 清除内存缓存
  return { ok: true };
});

ipcMain.handle('ai:auth:useLoggedInUser', async () => {
  appendAILog('info', 'auth.mode', 'switch requested', { mode: 'logged-in-user' });

  aiAuthStore.delete('copilot.token');
  aiAuthStore.delete('copilot.user');
  aiAuthStore.delete('copilot.expiresAt');
  aiAuthStore.delete('copilot.refreshToken');

  setAuthToken(null);
  setUseLoggedInUserAuth(true);

  try {
    await ensureCopilotClientStarted();
    await listModelsThroughBridge();
    appendAILog('info', 'auth.mode', 'logged-in-user mode validated');
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Official login unavailable';
    appendAILog('error', 'auth.mode', 'logged-in-user mode failed', { message });

    appendAILog('warn', 'auth.mode', 'trying gh auth token fallback');
    const ghTokenResult = readGhAuthTokenFromCli();

    if (ghTokenResult.ok && ghTokenResult.token) {
      try {
        setUseLoggedInUserAuth(false);
        setAuthToken(ghTokenResult.token);
        await ensureCopilotClientStarted();
        await listModelsThroughBridge();

        aiAuthStore.set('copilot.token', ghTokenResult.token);
        appendAILog('info', 'auth.mode', 'gh token fallback validated', { credentialSource: 'store' });
        return { ok: true, mode: 'gh-token-fallback' };
      } catch (fallbackError) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : 'gh token fallback failed';
        appendAILog('error', 'auth.mode', 'gh token fallback failed', { message: fallbackMessage });
        setAuthToken(null);
        aiAuthStore.delete('copilot.token');
      }
    } else {
      appendAILog('warn', 'auth.mode', 'gh auth token not available', { message: ghTokenResult.error });
    }

    return { ok: false, error: `官方登录态不可用：${message}。请先在终端执行 gh auth login。` };
  }
});

ipcMain.handle('ai:auth:openOfficialLogin', async () => {
  appendAILog('info', 'auth.mode', 'open official login terminal requested');

  try {
    if (process.platform === 'win32') {
      const loginCmd = 'gh auth login -h github.com -p https -w && gh auth status';
      spawn('cmd.exe', ['/c', 'start', 'cmd.exe', '/k', loginCmd], {
        detached: true,
        stdio: 'ignore',
      }).unref();
    } else if (process.platform === 'darwin') {
      spawn('osascript', ['-e', 'tell application "Terminal" to do script "gh auth login -h github.com -p https -w; gh auth status"'], {
        detached: true,
        stdio: 'ignore',
      }).unref();
    } else {
      spawn('x-terminal-emulator', ['-e', 'bash', '-lc', 'gh auth login -h github.com -p https -w; gh auth status; exec bash'], {
        detached: true,
        stdio: 'ignore',
      }).unref();
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to open official login terminal';
    appendAILog('error', 'auth.mode', 'open official login terminal failed', { message });
    return { ok: false, error: `无法打开官方登录终端：${message}` };
  }
});

ipcMain.handle('ai:auth:refresh', async () => {
  const token = aiAuthStore.get('copilot.token');
  const refreshToken = aiAuthStore.get('copilot.refreshToken');
  const expiresAt = aiAuthStore.get('copilot.expiresAt');
  const envToken = process.env.COPILOT_GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

  if (!token && !envToken) {
    return { ok: false, error: 'Not authenticated' };
  }

  if (typeof expiresAt === 'number' && Date.now() > expiresAt) {
    if (!refreshToken) {
      return { ok: false, error: 'Refresh token not available' };
    }

    return { ok: false, error: 'Refresh flow not implemented' };
  }

  try {
    await ensureCopilotClientStarted();
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Copilot refresh failed';
    return { ok: false, error: message };
  }
});

ipcMain.handle('ai:selftest', async () => {
  appendAILog('info', 'selftest', 'selftest requested');
  const startedAt = Date.now();
  const health = await getBridgeHealth().catch(() => null);
  const runtimeSupported = await checkRuntimeSupport();

  let canStart = false;
  let startError;
  let authRequired = false;
  let authError;
  try {
    await ensureCopilotClientStarted();
    canStart = true;

    try {
      await listModelsThroughBridge();
    } catch (error) {
      authError = error instanceof Error ? error.message : 'authentication failed';
      authRequired = /not authenticated|authenticate/i.test(authError);
    }
  } catch (error) {
    startError = error instanceof Error ? error.message : 'start failed';
  }

  const output = {
    ok: runtimeSupported && canStart && !authRequired,
    runtimeSupported,
    canStart,
    startError,
    authRequired,
    authError,
    health,
    checkedAt: startedAt,
  };

  appendAILog(output.ok ? 'info' : 'warn', 'selftest', 'selftest completed', {
    ok: output.ok,
    runtimeSupported,
    canStart,
    authRequired,
    startError,
    authError,
  });

  return output;
});

app.whenReady().then(() => {
  createActivityBarWindow();

  // 启动即预热 Copilot SDK（后台执行，不阻塞 UI）
  (async () => {
    const now = Date.now();
    try {
      const runtimeSupported = await checkRuntimeSupport();
      if (!runtimeSupported) {
        cachedAIStatus = {
          backend: 'copilot',
          status: 'error',
          detail: 'Runtime missing node:sqlite. Skip SDK prewarm.',
          lastUpdated: now,
        };
        cachedAIStatusAt = now;
        console.warn('[AI] Skip prewarm: runtime missing node:sqlite');
        return;
      }

      await ensureCopilotClientStarted();
      cachedAIStatus = {
        backend: 'copilot',
        status: 'connected',
        detail: 'Copilot prewarmed on app startup',
        lastUpdated: now,
      };
      cachedAIStatusAt = now;
      console.log('[AI] Copilot SDK prewarmed on app startup');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Copilot prewarm failed';
      cachedAIStatus = {
        backend: 'copilot',
        status: 'disconnected',
        detail: message,
        lastUpdated: now,
      };
      cachedAIStatusAt = now;
      console.warn('[AI] Copilot prewarm failed (non-blocking):', message);
    }
  })();
  
  // 注册全局快捷键 Alt+T 来切换始终虚化状态（备用方案）
  const ret = globalShortcut.register('Alt+T', () => {
    console.log('[globalShortcut] Alt+T pressed');
    
    // 如果有始终虚化的窗口，取消它
    if (alwaysTransparentWindowId) {
      disableAlwaysTransparent();
      return;
    }
    
    // 否则，查找当前鼠标位置下的 always-on-top 窗口并启用始终虚化
    const { x, y } = screen.getCursorScreenPoint();
    
    for (const [id, winData] of windows) {
      if (winData.type === 'activitybar') continue;
      if (winData.window.isDestroyed()) continue;
      
      const bounds = winData.window.getBounds();
      const isAlwaysOnTop = winData.window.isAlwaysOnTop();
      
      if (isAlwaysOnTop && 
          x >= bounds.x && x <= bounds.x + bounds.width &&
          y >= bounds.y && y <= bounds.y + bounds.height) {
        enableAlwaysTransparent(id);
        break;
      }
    }
  });
  
  if (ret) {
    console.log('[globalShortcut] Alt+T registered successfully');
  } else {
    console.error('[globalShortcut] Failed to register Alt+T');
  }
  
  // 启动全局输入钩子
  uIOhook.start();
  console.log('[uIOhook] Global input hook started');
  console.log('[uIOhook] Alt keycode:', UiohookKey.Alt, '(should be 56)');
  
  // 监听全局键盘事件 - Alt 键
  uIOhook.on(EventType.EVENT_KEY_PRESSED, (e) => {
    console.log('[uIOhook] Key pressed, keycode:', e.keycode);
    if (e.keycode === UiohookKey.Alt) { // Alt 键 (56)
      if (!globalAltPressed) {
        globalAltPressed = true;
        console.log('[uIOhook] Alt pressed, triggering handleAltPressed()');
        handleAltPressed();
      }
    }
  });
  
  uIOhook.on(EventType.EVENT_KEY_RELEASED, (e) => {
    if (e.keycode === UiohookKey.Alt) { // Alt 键 (56)
      if (globalAltPressed) {
        globalAltPressed = false;
        console.log('[uIOhook] Alt released, triggering handleAltReleased()');
        handleAltReleased();
      }
    }
  });
  
  // 监听全局鼠标事件 - 右键点击
  uIOhook.on(EventType.EVENT_MOUSE_PRESSED, (e) => {
    console.log('[uIOhook] Mouse pressed, button:', e.button, 'x:', e.x, 'y:', e.y);
    // 检测右键 (button === 3 是右键)
    if (e.button === 3 && globalAltPressed) {
      console.log('[uIOhook] Alt+RightClick detected at:', e.x, e.y);
      handleAltRightClick(e.x, e.y);
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createActivityBarWindow();
    }
  });
});

// 处理 Alt 键按下
function handleAltPressed() {
  // 获取当前鼠标位置
  const { x, y } = screen.getCursorScreenPoint();
  
  console.log('[Alt] handleAltPressed() called, mouse at:', x, y);
  console.log('[Alt] alwaysTransparentWindowId:', alwaysTransparentWindowId);
  console.log('[Alt] Total windows:', windows.size);
  
  // 查找鼠标位置下的顶层窗口
  let currentTopmostId = null;
  
  // 按 z-order 查找（最后创建的窗口在最上面）
  const windowList = Array.from(windows.entries()).reverse();
  for (const [id, winData] of windowList) {
    if (winData.type === 'activitybar') continue;
    if (winData.window.isDestroyed()) continue;
    
    const bounds = winData.window.getBounds();
    const isOver = x >= bounds.x && x <= bounds.x + bounds.width &&
                   y >= bounds.y && y <= bounds.y + bounds.height;
    console.log('[Alt] Window:', id, 'bounds:', bounds, 'isOver:', isOver);
    
    if (isOver) {
      currentTopmostId = id;
      break;
    }
  }
  
  console.log('[Alt] Found topmostWindow:', currentTopmostId);
  
  // 如果有始终虚化的窗口
  if (alwaysTransparentWindowId) {
    const alwaysWinData = windows.get(alwaysTransparentWindowId);
    if (alwaysWinData && !alwaysWinData.window.isDestroyed()) {
      // 临时禁用穿透（恢复不透明，取消鼠标穿透）
      alwaysWinData.window.setIgnoreMouseEvents(false, { forward: true });
      alwaysWinData.window.setOpacity(1);
      alwaysWinData.window.webContents.send('alt:stateChanged', { pressed: false, suspended: true });
      console.log('[Alt] Suspended always-transparent for:', alwaysTransparentWindowId);
    }
    return; // 始终虚化状态下，只临时禁用穿透，不虚化其他窗口
  }
  
  // 非始终虚化状态：对当前顶层窗口启用临时穿透
  if (currentTopmostId) {
    const targetWinData = windows.get(currentTopmostId);
    if (targetWinData && !targetWinData.window.isDestroyed()) {
      // 直接在主进程设置穿透
      targetWinData.window.setIgnoreMouseEvents(true, { forward: true });
      targetWinData.window.setOpacity(0.51);
      targetWinData.window.webContents.send('alt:stateChanged', { pressed: true });
      console.log('[Alt] Enabled temporary transparent for:', currentTopmostId);
    }
  }
}

// 处理 Alt 键释放
function handleAltReleased() {
  console.log('[Alt] handleAltReleased() called, alwaysTransparent:', alwaysTransparentWindowId);
  
  // 如果有始终虚化的窗口，恢复其状态
  if (alwaysTransparentWindowId) {
    const alwaysWinData = windows.get(alwaysTransparentWindowId);
    if (alwaysWinData && !alwaysWinData.window.isDestroyed()) {
      console.log('[Alt] Restoring always-transparent window:', alwaysTransparentWindowId);
      alwaysWinData.window.setIgnoreMouseEvents(true, { forward: true });
      alwaysWinData.window.setOpacity(0.51);
      alwaysWinData.window.webContents.send('alt:stateChanged', { pressed: true, suspended: false });
      console.log('[Alt] Restored always-transparent for:', alwaysTransparentWindowId);
    }
    return; // 始终虚化状态下，只恢复该窗口
  }
  
  // 非始终虚化状态：所有窗口恢复正常
  console.log('[Alt] Restoring all windows to normal...');
  for (const [id, winData] of windows) {
    if (winData.type !== 'activitybar' && !winData.window.isDestroyed()) {
      console.log('[Alt] Restoring window:', id);
      winData.window.setIgnoreMouseEvents(false, { forward: true });
      winData.window.webContents.send('alt:stateChanged', { pressed: false });
    }
  }
  console.log('[Alt] All windows restored to normal');
}

// 处理 Alt+右键点击 - 切换始终虚化状态
function handleAltRightClick(mouseX, mouseY) {
  console.log('[Alt] Alt+RightClick handling, checking windows at:', mouseX, mouseY);
  
  // 查找鼠标位置下的 always-on-top 窗口
  let targetWindowId = null;
  let targetWindowData = null;
  
  for (const [id, winData] of windows) {
    if (winData.type === 'activitybar') continue;
    if (winData.window.isDestroyed()) continue;
    
    const bounds = winData.window.getBounds();
    const isAlwaysOnTop = winData.window.isAlwaysOnTop();
    
    console.log('[Alt] Checking window:', id, 'bounds:', bounds, 'isAlwaysOnTop:', isAlwaysOnTop);
    
    // 检查鼠标是否在窗口范围内
    if (mouseX >= bounds.x && mouseX <= bounds.x + bounds.width &&
        mouseY >= bounds.y && mouseY <= bounds.y + bounds.height) {
      if (isAlwaysOnTop) {
        targetWindowId = id;
        targetWindowData = winData;
        console.log('[Alt] Found always-on-top window under cursor:', id);
        break;
      }
    }
  }
  
  if (!targetWindowId || !targetWindowData) {
    console.log('[Alt] No always-on-top window under cursor');
    return;
  }
  
  toggleAlwaysTransparent(targetWindowId);
}

// 切换窗口的始终虚化状态
function toggleAlwaysTransparent(windowId) {
  const winData = windows.get(windowId);
  if (!winData) {
    console.log('[Alt] Window not found:', windowId);
    return;
  }
  
  // 检查窗口是否为顶置状态
  const isAlwaysOnTop = winData.window.isAlwaysOnTop();
  if (!isAlwaysOnTop) {
    console.log('[Alt] Window is not always on top:', windowId);
    return;
  }
  
  // 切换始终虚化状态
  if (alwaysTransparentWindowId === windowId) {
    // 取消始终虚化
    disableAlwaysTransparent();
  } else {
    // 设置为始终虚化
    enableAlwaysTransparent(windowId);
  }
}

// 启用始终虚化
function enableAlwaysTransparent(windowId) {
  // 先取消之前窗口的始终虚化
  if (alwaysTransparentWindowId && alwaysTransparentWindowId !== windowId) {
    disableAlwaysTransparent();
  }
  
  const winData = windows.get(windowId);
  if (!winData || winData.window.isDestroyed()) return;
  
  alwaysTransparentWindowId = windowId;
  
  // 如果当前没有按下 Alt，立即启用虚化
  if (!globalAltPressed) {
    winData.window.setIgnoreMouseEvents(true, { forward: true });
    winData.window.setOpacity(0.51);
  }
  
  winData.window.webContents.send('alt:alwaysTransparentChanged', { enabled: true });
  console.log('[Alt] Enabled always transparent for:', windowId);
  
  // 显示取消按钮窗口
  showCancelButton(winData.window);
}

// 禁用始终虚化
function disableAlwaysTransparent() {
  if (!alwaysTransparentWindowId) return;
  
  const winData = windows.get(alwaysTransparentWindowId);
  if (winData && !winData.window.isDestroyed()) {
    winData.window.setIgnoreMouseEvents(false, { forward: true });
    winData.window.setOpacity(1);
    winData.window.webContents.send('alt:alwaysTransparentChanged', { enabled: false });
  }
  
  console.log('[Alt] Disabled always transparent for:', alwaysTransparentWindowId);
  alwaysTransparentWindowId = null;
  
  // 隐藏取消按钮窗口
  hideCancelButton();
}

// 创建取消按钮窗口
function createCancelButtonWindow() {
  if (cancelButtonWindow && !cancelButtonWindow.isDestroyed()) {
    return cancelButtonWindow;
  }
  
  const buttonHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { 
            width: 100%; 
            height: 100%; 
            overflow: hidden; 
            background: transparent;
          }
          .cancel-btn {
            width: 100%;
            height: 100%;
            background: rgba(168, 85, 247, 0.9);
            border: none;
            border-radius: 4px;
            color: white;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            transition: background 0.15s;
          }
          .cancel-btn:hover {
            background: rgba(147, 51, 234, 1);
          }
        </style>
      </head>
      <body>
        <button class="cancel-btn" onclick="cancelTransparent()">取消穿透</button>
        <script>
          const { ipcRenderer } = require('electron');
          function cancelTransparent() {
            ipcRenderer.send('cancel-always-transparent');
          }
        </script>
      </body>
    </html>
  `;
  
  cancelButtonWindow = new BrowserWindow({
    width: 70,
    height: 26,
    x: -9999,
    y: -9999,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    focusable: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    show: false,
  });
  
  cancelButtonWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(buttonHTML));
  
  cancelButtonWindow.on('closed', () => {
    cancelButtonWindow = null;
  });
  
  return cancelButtonWindow;
}

// 显示取消按钮
function showCancelButton(parentWindow) {
  try {
    const btn = createCancelButtonWindow();
    if (btn && parentWindow && !parentWindow.isDestroyed()) {
      const bounds = parentWindow.getBounds();
      // 显示在父窗口右上角
      btn.setBounds({
        x: bounds.x + bounds.width - 80,
        y: bounds.y + 8,
        width: 70,
        height: 26
      });
      btn.show();
      console.log('[Alt] Cancel button shown');
    }
  } catch (err) {
    console.error('[Alt] Failed to show cancel button:', err);
  }
}

// 隐藏取消按钮
function hideCancelButton() {
  try {
    if (cancelButtonWindow && !cancelButtonWindow.isDestroyed()) {
      cancelButtonWindow.hide();
      console.log('[Alt] Cancel button hidden');
    }
  } catch (err) {
    console.error('[Alt] Failed to hide cancel button:', err);
  }
}

// 监听取消按钮点击
ipcMain.on('cancel-always-transparent', () => {
  console.log('[Alt] Cancel button clicked');
  disableAlwaysTransparent();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // 取消注册所有全局快捷键
  globalShortcut.unregisterAll();
  
  // 停止全局输入钩子
  try {
    uIOhook.stop();
    console.log('[uIOhook] Global input hook stopped');
  } catch (err) {
    console.error('[uIOhook] Error stopping:', err);
  }
  
  // 关闭取消按钮窗口
  if (cancelButtonWindow && !cancelButtonWindow.isDestroyed()) {
    cancelButtonWindow.destroy();
  }
  
  windows.forEach((winData) => {
    winData.window.destroy();
  });
  windows.clear();
});

app.on('browser-window-focus', (event, win) => {
  win.webContents.send('app:focus');
});

app.on('browser-window-blur', (event, win) => {
  win.webContents.send('app:blur');
});
