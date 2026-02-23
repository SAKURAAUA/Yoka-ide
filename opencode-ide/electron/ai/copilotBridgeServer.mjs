import { CopilotClient } from '@github/copilot-sdk';
import readline from 'node:readline';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';

let client = null;
let currentSession = null;
let authModeKey = '';
let lastAuthMode = 'unknown';

function mimeToExt(mimeType = '') {
  if (mimeType.includes('png')) return '.png';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return '.jpg';
  if (mimeType.includes('gif')) return '.gif';
  if (mimeType.includes('webp')) return '.webp';
  return '.bin';
}

function buildPrompt(messages = []) {
  return messages
    .map((msg) => {
      const role = msg?.role || 'user';
      const content = typeof msg?.content === 'string' ? msg.content : '';
      return `${role}: ${content}`;
    })
    .join('\n\n')
    .trim();
}

async function prepareAttachmentsFromMessages(messages = []) {
  const cleanupFiles = [];
  const attachments = [];

  const lastUser = [...messages].reverse().find((m) => m?.role === 'user' && Array.isArray(m?.images) && m.images.length > 0);
  if (!lastUser) {
    return { attachments, cleanupFiles };
  }

  for (const image of lastUser.images) {
    const dataUrl = image?.dataUrl;
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) continue;

    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex < 0) continue;

    const meta = dataUrl.slice(5, commaIndex);
    const base64 = dataUrl.slice(commaIndex + 1);
    const mimeType = image?.mimeType || image?.type || meta.split(';')[0] || 'application/octet-stream';

    const ext = mimeToExt(mimeType);
    const fileName = `copilot-upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const filePath = path.join(os.tmpdir(), fileName);

    const buf = Buffer.from(base64, 'base64');
    await fs.writeFile(filePath, buf);
    cleanupFiles.push(filePath);

    attachments.push({
      type: 'file',
      path: filePath,
      displayName: image?.name || fileName,
    });
  }

  return { attachments, cleanupFiles };
}

function resolveToken(inputToken) {
  if (inputToken === '__USE_LOGGED_IN_USER__') {
    return null;
  }
  return (
    inputToken ||
    process.env.COPILOT_GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    process.env.GITHUB_TOKEN ||
    null
  );
}

async function runtimeSupport() {
  try {
    await import('node:sqlite');
    return { supported: true };
  } catch {
    return { supported: false };
  }
}

async function health() {
  const support = await runtimeSupport();
  return {
    supported: support.supported,
    nodeVersion: process.version,
    execPath: process.execPath,
    pid: process.pid,
    started: !!client,
    authMode: lastAuthMode,
  };
}

async function ensureStarted(inputToken) {
  const support = await runtimeSupport();
  if (!support.supported) {
    throw new Error('No such built-in module: node:sqlite (bridge runtime unsupported)');
  }

  const token = resolveToken(inputToken);
  const nextModeKey = token ? `token:${token}` : 'logged-in-user';

  if (!client || authModeKey !== nextModeKey) {
    client = token ? new CopilotClient({ token }) : new CopilotClient({ useLoggedInUser: true });
    authModeKey = nextModeKey;
    lastAuthMode = token ? 'token' : 'logged-in-user';
    currentSession = null;
  }

  await client.start();
  return { started: true, authMode: token ? 'token' : 'logged-in-user' };
}

async function listModels(inputToken) {
  await ensureStarted(inputToken);
  const models = await client.listModels();
  return {
    models: Array.isArray(models) ? models : [],
  };
}

async function ensureAuthenticated(inputToken) {
  await ensureStarted(inputToken);
  try {
    await client.listModels();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || 'Authentication failed');
    throw new Error(message);
  }
}

async function getOrCreateSession(inputToken, options = {}) {
  await ensureStarted(inputToken);

  if (currentSession) {
    try {
      await currentSession.describe();
      return currentSession;
    } catch {
      currentSession = null;
    }
  }

  currentSession = await client.createSession({
    model: options.model || 'gpt-4.1',
  });

  return currentSession;
}

async function sendMessage(inputToken, messages, options = {}) {
  if (!Array.isArray(messages)) {
    throw new Error('Invalid request format. Expected messages array.');
  }

  await ensureAuthenticated(inputToken);

  const session = await getOrCreateSession(inputToken, options);
  const prompt = buildPrompt(messages);
  const { attachments, cleanupFiles } = await prepareAttachmentsFromMessages(messages);

  let fullResponse = '';
  let messageId = null;
  const timestamp = Date.now();

  try {
    const finalMessage = await session.sendAndWait({
      prompt,
      attachments,
      mode: 'immediate',
    }, 600000);
    messageId = finalMessage?.data?.messageId || null;
    fullResponse = finalMessage?.data?.content || '';
    if (!fullResponse.trim()) {
      throw new Error('AI returned an empty response.');
    }
  } finally {
    await Promise.allSettled(cleanupFiles.map((p) => fs.unlink(p)));
  }

  return {
    ok: true,
    response: {
      message: {
        id: messageId,
        content: fullResponse,
        role: 'assistant',
      },
    },
    metadata: {
      timestamp,
      model: options.model || 'gpt-4.1',
    },
  };
}

async function uploadImage(inputToken, image) {
  await ensureStarted(inputToken);

  if (!image || typeof image !== 'object') {
    throw new Error('Invalid image payload');
  }

  const mimeType = image.mimeType || image.type;
  if (!mimeType || typeof mimeType !== 'string') {
    throw new Error('Invalid image mimeType');
  }

  const size = typeof image.size === 'number' ? image.size : 0;
  if (size <= 0) {
    throw new Error('Invalid image size');
  }

  const id = image.id || `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const name = image.name || 'image';

  return {
    id,
    name,
    mimeType,
    size,
    ...(typeof image.url === 'string' ? { url: image.url } : {}),
    ...(typeof image.dataUrl === 'string' ? { dataUrl: image.dataUrl } : {}),
  };
}

function writeEvent(requestId, eventName, payload) {
  writeResponse({ type: 'event', id: requestId, event: eventName, payload });
}

function toShortText(input, max = 120) {
  if (typeof input !== 'string') return '';
  const compact = input.replace(/\s+/g, ' ').trim();
  if (!compact) return '';
  return compact.length > max ? `${compact.slice(0, max - 1)}…` : compact;
}

function toObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value;
}

function pickToolTarget(args) {
  const payload = toObject(args);
  if (!payload) return '';

  const direct =
    payload.filePath ||
    payload.path ||
    payload.includePattern ||
    payload.workspaceFolder ||
    payload.url ||
    payload.query ||
    payload.symbolName ||
    payload.command;

  if (typeof direct === 'string' && direct.trim()) {
    return toShortText(direct, 80);
  }

  return '';
}

function mapToolLabel(toolName) {
  const name = String(toolName || '').toLowerCase();
  if (name.includes('read_file')) return '正在读取文件';
  if (name.includes('search') || name.includes('grep') || name.includes('list_dir')) return '正在检索信息';
  if (name.includes('apply_patch') || name.includes('create_file') || name.includes('edit_')) return '正在修改代码';
  if (name.includes('run_in_terminal') || name.includes('create_and_run_task')) return '正在执行命令';
  if (name.includes('fetch_webpage')) return '正在读取网页';
  return '正在调用工具';
}

function mapSessionEventToOperation(event) {
  if (!event || typeof event !== 'object') return null;
  const type = event.type;
  const data = event.data || {};

  if (type === 'assistant.turn_start') {
    return { eventType: type, label: '思考中', detail: '开始分析请求', state: 'running' };
  }

  if (type === 'assistant.intent') {
    return { eventType: type, label: '思考中', detail: toShortText(data.intent, 100) || '正在形成解题意图', state: 'running' };
  }

  if (type === 'assistant.reasoning' || type === 'assistant.reasoning_delta') {
    const text = toShortText(data.content || data.deltaContent, 120);
    return { eventType: type, label: '思考中', detail: text || '正在推理', state: 'running' };
  }

  if (type === 'assistant.message_delta') {
    return { eventType: type, label: '回复中', detail: '正在生成回答', state: 'running' };
  }

  if (type === 'assistant.message') {
    return { eventType: type, label: '回复中', detail: '已生成完整回答', state: 'success' };
  }

  if (type === 'tool.execution_start') {
    const toolName = data.toolName || data.mcpToolName || 'tool';
    const target = pickToolTarget(data.arguments);
    return {
      eventType: type,
      label: mapToolLabel(toolName),
      detail: target ? `${toolName} · ${target}` : `${toolName}`,
      state: 'running',
    };
  }

  if (type === 'tool.execution_progress') {
    return {
      eventType: type,
      label: '工具执行中',
      detail: toShortText(data.progressMessage, 120) || '处理中',
      state: 'running',
    };
  }

  if (type === 'tool.execution_complete') {
    const ok = !!data.success;
    return {
      eventType: type,
      label: ok ? '工具执行完成' : '工具执行失败',
      detail: data.toolCallId ? `toolCallId: ${data.toolCallId}` : undefined,
      state: ok ? 'success' : 'error',
    };
  }

  if (type === 'session.warning') {
    return {
      eventType: type,
      label: '处理中',
      detail: toShortText(data.message, 120) || '出现警告',
      state: 'running',
    };
  }

  if (type === 'session.error') {
    return {
      eventType: type,
      label: '请求异常',
      detail: toShortText(data.message, 120) || '会话错误',
      state: 'error',
    };
  }

  if (type === 'session.idle' || type === 'assistant.turn_end') {
    return { eventType: type, label: '处理完成', detail: '智能体已结束本轮处理', state: 'success' };
  }

  return null;
}

async function sendMessageStream(requestId, inputToken, messages, options = {}) {
  if (!Array.isArray(messages)) {
    throw new Error('Invalid request format. Expected messages array.');
  }

  await ensureAuthenticated(inputToken);

  const session = await getOrCreateSession(inputToken, options);
  const prompt = buildPrompt(messages);
  const { attachments, cleanupFiles } = await prepareAttachmentsFromMessages(messages);

  let fullResponse = '';
  let messageId = null;
  const timestamp = Date.now();
  let offAny = null;
  let offDelta = null;
  let offMessage = null;

  try {
    offAny = session.on((event) => {
      const operation = mapSessionEventToOperation(event);
      if (operation) {
        writeEvent(requestId, 'ai:operation', operation);
      }
    });

    offDelta = session.on('assistant.message_delta', (event) => {
      const text = event?.data?.deltaContent || '';
      if (!text) return;
      fullResponse += text;
      writeEvent(requestId, 'ai:stream:chunk', {
        id: messageId,
        content: fullResponse,
        delta: text,
      });
    });

    offMessage = session.on('assistant.message', (event) => {
      fullResponse = event?.data?.content || fullResponse;
    });

    const finalMessage = await session.sendAndWait({
      prompt,
      attachments,
      mode: 'immediate',
    }, 180000);

    messageId = finalMessage?.data?.messageId || null;
    if (finalMessage?.data?.content) {
      fullResponse = finalMessage.data.content;
    }

    if (!fullResponse.trim()) {
      throw new Error('AI returned an empty response.');
    }

    writeEvent(requestId, 'ai:stream:end', {
      id: messageId,
      finishReason: 'stop',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Stream failed';
    writeEvent(requestId, 'ai:stream:error', { message });
    throw error;
  } finally {
    if (typeof offDelta === 'function') offDelta();
    if (typeof offMessage === 'function') offMessage();
    if (typeof offAny === 'function') offAny();
    await Promise.allSettled(cleanupFiles.map((p) => fs.unlink(p)));
  }

  return {
    ok: true,
    response: {
      message: {
        id: messageId,
        content: fullResponse,
        role: 'assistant',
      },
    },
    metadata: {
      timestamp,
      model: options.model || 'gpt-4.1',
    },
  };
}

async function handleRequest(method, params) {
  switch (method) {
    case 'runtimeSupport':
      return runtimeSupport();
    case 'health':
      return health();
    case 'ensureStarted':
      return ensureStarted(params?.token);
    case 'sendMessage':
      return sendMessage(params?.token, params?.messages, params?.options || {});
    case 'listModels':
      return listModels(params?.token);
    case 'uploadImage':
      return uploadImage(params?.token, params?.image);
    case 'sendMessageStream':
      return sendMessageStream(params?.requestId, params?.token, params?.messages, params?.options || {});
    default:
      throw new Error(`Unknown method: ${method}`);
  }
}

function writeResponse(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

rl.on('line', async (line) => {
  if (!line || !line.trim()) return;

  let request;
  try {
    request = JSON.parse(line);
  } catch {
    return;
  }

  const id = request?.id;
  if (typeof id !== 'number') return;

  try {
    const params = request.params || {};
    if (request.method === 'sendMessageStream') {
      params.requestId = id;
    }
    const result = await handleRequest(request.method, params);
    writeResponse({ id, ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bridge request failed';
    writeResponse({ id, ok: false, error: message });
  }
});
