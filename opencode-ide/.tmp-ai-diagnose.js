const {
  checkRuntimeSupport,
  getBridgeHealth,
  ensureCopilotClientStarted,
  listModelsThroughBridge,
  sendMessageStreamThroughBridge,
} = require('./electron/ai/copilotClient');

(async () => {
  try {
    console.log('runtimeSupport=', await checkRuntimeSupport());
    console.log('health=', await getBridgeHealth());
    try {
      const started = await ensureCopilotClientStarted();
      console.log('started=', started);
    } catch (e) {
      console.log('ensureStartedError=', e?.message || String(e));
    }

    try {
      const models = await listModelsThroughBridge();
      console.log('modelsCount=', Array.isArray(models?.models) ? models.models.length : -1);
      if (Array.isArray(models?.models)) {
        console.log('modelsHead=', models.models.slice(0, 5).map(m => ({ id: m.id, name: m.name, state: m?.policy?.state, multiplier: m?.billing?.multiplier })));
      }
    } catch (e) {
      console.log('listModelsError=', e?.message || String(e));
    }

    try {
      const result = await sendMessageStreamThroughBridge([
        { role: 'user', content: '回复pong即可。' }
      ], { model: 'gpt-4.1' }, (event, payload) => {
        if (event === 'ai:operation') {
          console.log('operation=', payload?.label, payload?.detail || '', payload?.state || 'running');
        }
        if (event === 'ai:stream:chunk') {
          const d = payload?.delta || '';
          if (d) console.log('chunk=', d);
        }
        if (event === 'ai:stream:error') {
          console.log('streamError=', payload?.message || payload);
        }
      });
      console.log('sendResultOk=', result?.ok, 'content=', result?.response?.message?.content || '');
    } catch (e) {
      console.log('sendError=', e?.message || String(e));
    }
  } catch (e) {
    console.error('fatal=', e?.message || String(e));
  }
})();
