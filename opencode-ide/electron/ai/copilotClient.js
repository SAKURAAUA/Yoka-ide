const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const readline = require('readline');

let bridgeProcess = null;
let bridgeReadline = null;
let requestId = 0;
let cachedToken = null;
let forcedAuthMode = null; // 'logged-in-user' | null
const pendingRequests = new Map();

function getAuthToken() {
  if (forcedAuthMode === 'logged-in-user') {
    return '__USE_LOGGED_IN_USER__';
  }
  return (
    cachedToken ||
    process.env.COPILOT_GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    process.env.GITHUB_TOKEN ||
    null
  );
}

function setAuthToken(token) {
  cachedToken = token || null;
  if (cachedToken) {
    forcedAuthMode = null;
  }
  console.log(`[CopilotBridge] Auth token set (${cachedToken ? 'present' : 'cleared'})`);
}

function setUseLoggedInUserAuth(enabled) {
  forcedAuthMode = enabled ? 'logged-in-user' : null;
  if (enabled) {
    cachedToken = null;
  }
  console.log(`[CopilotBridge] Auth mode ${forcedAuthMode || 'auto'}`);
}

function getAuthDebugState() {
  const hasEnvToken = !!(
    process.env.COPILOT_GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    process.env.GITHUB_TOKEN
  );

  return {
    forcedAuthMode,
    hasCachedToken: !!cachedToken,
    hasEnvToken,
  };
}

function getBridgeNodeCommand() {
  const envPath = process.env.COPILOT_BRIDGE_NODE_PATH || process.env.NODE_BINARY;
  if (envPath) return envPath;

  const nvmNode = 'C:\\nvm4w\\nodejs\\node.exe';
  if (fs.existsSync(nvmNode)) {
    return nvmNode;
  }

  return 'node';
}

function getBridgeScriptPath() {
  return path.join(__dirname, 'copilotBridgeServer.mjs');
}

function handleBridgeMessage(line) {
  let payload;
  try {
    payload = JSON.parse(line);
  } catch {
    return;
  }

  if (payload?.type === 'event' && typeof payload.id === 'number') {
    const pendingEvent = pendingRequests.get(payload.id);
    pendingEvent?.touch?.();
    if (pendingEvent?.onEvent) {
      pendingEvent.onEvent(payload.event, payload.payload);
    }
    return;
  }

  const pending = pendingRequests.get(payload.id);
  if (!pending) return;

  pendingRequests.delete(payload.id);
  if (payload.ok) {
    pending.resolve(payload.result);
  } else {
    pending.reject(new Error(payload.error || 'Bridge request failed'));
  }
}

function rejectAllPending(errorMessage) {
  for (const [, pending] of pendingRequests) {
    pending.reject(new Error(errorMessage));
  }
  pendingRequests.clear();
}

function startBridgeProcess() {
  if (bridgeProcess && !bridgeProcess.killed) {
    return bridgeProcess;
  }

  const nodeCommand = getBridgeNodeCommand();
  const bridgeScript = getBridgeScriptPath();

  bridgeProcess = spawn(nodeCommand, [bridgeScript], {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
    env: {
      ...process.env,
      COPILOT_BRIDGE_MODE: '1',
    },
  });

  bridgeProcess.on('error', (error) => {
    console.error('[CopilotBridge] process error:', error);
    rejectAllPending(`Bridge process error: ${error.message}`);
  });

  bridgeProcess.on('exit', (code, signal) => {
    const reason = `Bridge exited (code=${code}, signal=${signal || 'none'})`;
    console.warn('[CopilotBridge]', reason);
    rejectAllPending(reason);
    if (bridgeReadline) {
      bridgeReadline.close();
      bridgeReadline = null;
    }
    bridgeProcess = null;
  });

  if (bridgeProcess.stdout) {
    bridgeReadline = readline.createInterface({
      input: bridgeProcess.stdout,
      crlfDelay: Infinity,
    });
    bridgeReadline.on('line', handleBridgeMessage);
  }

  if (bridgeProcess.stderr) {
    bridgeProcess.stderr.on('data', (buf) => {
      const text = String(buf || '').trim();
      if (!text) return;
      console.warn('[CopilotBridge:stderr]', text);
    });
  }

  return bridgeProcess;
}

function terminateBridgeProcess(reason = 'manual-terminate') {
  if (!bridgeProcess || bridgeProcess.killed) return;
  try {
    bridgeProcess.kill();
    console.warn('[CopilotBridge] terminated:', reason);
  } catch {}
}

function callBridge(method, params = {}, timeoutMs = 30000, onEvent) {
  return new Promise((resolve, reject) => {
    const proc = startBridgeProcess();
    if (!proc || !proc.stdin || proc.stdin.destroyed) {
      reject(new Error('Bridge process stdin unavailable'));
      return;
    }

    const id = ++requestId;
    let timer = null;
    const resetTimer = () => {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        pendingRequests.delete(id);
        terminateBridgeProcess(`request-timeout:${method}`);
        reject(new Error(`Bridge request timeout: ${method}`));
      }, timeoutMs);
    };
    resetTimer();

    pendingRequests.set(id, {
      onEvent,
      touch: resetTimer,
      resolve: (result) => {
        if (timer) clearTimeout(timer);
        resolve(result);
      },
      reject: (error) => {
        if (timer) clearTimeout(timer);
        reject(error);
      },
    });

    try {
      proc.stdin.write(`${JSON.stringify({ id, method, params })}\n`);
    } catch (error) {
      if (timer) clearTimeout(timer);
      pendingRequests.delete(id);
      reject(error instanceof Error ? error : new Error('Bridge write failed'));
    }
  });
}

async function checkRuntimeSupport() {
  try {
    const result = await callBridge('runtimeSupport', {}, 8000);
    return !!result?.supported;
  } catch {
    return false;
  }
}

async function getBridgeHealth() {
  return callBridge('health', {}, 8000);
}

async function ensureCopilotClientStarted() {
  const token = getAuthToken();
  return callBridge('ensureStarted', { token }, 30000);
}

async function sendMessageThroughBridge(messages, options = {}) {
  const token = getAuthToken();
  return callBridge('sendMessage', { token, messages, options }, 180000);
}

async function listModelsThroughBridge() {
  const token = getAuthToken();
  return callBridge('listModels', { token }, 30000);
}

async function uploadImageThroughBridge(image) {
  const token = getAuthToken();
  return callBridge('uploadImage', { token, image }, 30000);
}

async function sendMessageStreamThroughBridge(messages, options = {}, onEvent) {
  const token = getAuthToken();
  return callBridge('sendMessageStream', { token, messages, options }, 600000, onEvent);
}

module.exports = {
  ensureCopilotClientStarted,
  setAuthToken,
  setUseLoggedInUserAuth,
  getAuthDebugState,
  checkRuntimeSupport,
  getBridgeHealth,
  sendMessageThroughBridge,
  listModelsThroughBridge,
  uploadImageThroughBridge,
  sendMessageStreamThroughBridge,
};
