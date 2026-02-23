const {
  ensureCopilotClientStarted,
  sendMessageThroughBridge,
  sendMessageStreamThroughBridge,
} = require('./copilotClient');

/**
 * 兼容旧接口：bridge 模式下不直接暴露底层 session 对象
 */
async function getOrCreateSession() {
  await ensureCopilotClientStarted();
  return { bridge: true };
}

/**
 * 发送消息并返回完整响应
 */
async function sendMessage(messages, options = {}, streamCallbacks) {
  try {
    await ensureCopilotClientStarted();
    if (streamCallbacks) {
      return await sendMessageStreamThroughBridge(messages, options, (event, payload) => {
        if (event === 'ai:stream:chunk') {
          streamCallbacks.onChunk?.(payload);
        } else if (event === 'ai:stream:end') {
          streamCallbacks.onEnd?.(payload);
        } else if (event === 'ai:stream:error') {
          streamCallbacks.onError?.(payload);
        } else if (event === 'ai:operation') {
          streamCallbacks.onOperation?.(payload);
        }
      });
    }

    return await sendMessageThroughBridge(messages, options);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SessionBridge] Error sending message:', message);
    return {
      ok: false,
      error: `Copilot API error: ${message}`,
    };
  }
}

/**
 * 兼容旧接口
 */
async function destroySession() {
  return;
}

module.exports = {
  getOrCreateSession,
  sendMessage,
  destroySession,
};
