'use client';

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { useAppStore } from '@/store';
import {
  Send,
  X,
  ClipboardPaste,
  Loader2,
  Paperclip,
  Image as ImageIcon,
  ListTodo,
  ChevronDown,
  ChevronRight,
  Bot,
  Sparkles,
  CheckCircle2,
  Circle,
  Trash2,
} from 'lucide-react';
import type { AIModelInfo } from '@/types/ai';

interface InputPanelProps {
  isDocked?: boolean;
  dockPosition?: 'left' | 'right' | 'top' | 'bottom' | 'center';
}

type TodoItem = {
  id: string;
  text: string;
  done: boolean;
};

type OperationState = 'running' | 'success' | 'error';

type OperationItem = {
  id: string;
  label: string;
  detail?: string;
  state: OperationState;
};

type AIStreamOperation = {
  eventType?: string;
  label?: string;
  detail?: string;
  state?: OperationState;
};

const DEFAULT_MODEL_OPTIONS = [
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { value: 'none', label: '本地模式(无云)' },
] as const;

const AGENT_OPTIONS = [
  { value: 'general', label: '通用智能体' },
  { value: 'planner', label: '规划智能体' },
  { value: 'coder', label: '编码智能体' },
  { value: 'reviewer', label: '审查智能体' },
] as const;

const OPERATION_HINTS = [
  { id: 'explain', label: '解释当前问题', prompt: '请先解释问题成因，再给出解决步骤。' },
  { id: 'todo', label: '生成待办', prompt: '请生成清晰的待办清单，按优先级排序。' },
  { id: 'implement', label: '直接实装', prompt: '请直接给出可执行的实现方案并落地。' },
  { id: 'verify', label: '验证回归', prompt: '请给出最小回归验证步骤和预期结果。' },
] as const;

function extractTodosFromText(text: string): TodoItem[] {
  const lines = text.split('\n');
  const result: TodoItem[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const unchecked = trimmed.match(/^[-*]\s*\[\s\]\s+(.+)$/);
    const checked = trimmed.match(/^[-*]\s*\[[xX]\]\s+(.+)$/);
    const numbered = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (unchecked) {
      result.push({
        id: `todo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: unchecked[1],
        done: false,
      });
    } else if (checked) {
      result.push({
        id: `todo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: checked[1],
        done: true,
      });
    } else if (numbered) {
      result.push({
        id: `todo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: numbered[1],
        done: false,
      });
    }
  }

  return result;
}

function mergeTodos(prev: TodoItem[], next: TodoItem[]): TodoItem[] {
  if (next.length === 0) return prev;

  const normalize = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();
  const byText = new Map(prev.map((item) => [normalize(item.text), item]));

  for (const item of next) {
    const key = normalize(item.text);
    const existing = byText.get(key);
    if (!existing) {
      byText.set(key, item);
      continue;
    }
    byText.set(key, {
      ...existing,
      done: existing.done || item.done,
    });
  }

  return Array.from(byText.values()).slice(0, 40);
}

function summarizeMessagesForMemory(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  limit = 10
): string {
  const lines = messages
    .map((msg) => {
      const content = (msg.content || '').replace(/\s+/g, ' ').trim();
      if (!content) return '';
      const short = content.length > 140 ? `${content.slice(0, 139)}…` : content;
      return `${msg.role === 'user' ? '用户' : '助手'}：${short}`;
    })
    .filter(Boolean);

  if (lines.length === 0) return '';
  return lines.slice(-limit).map((line, index) => `${index + 1}. ${line}`).join('\n');
}

function mergeMemorySummary(previous: string, next: string, maxLines = 14, maxChars = 1800): string {
  const prevLines = previous.split('\n').map((line) => line.trim()).filter(Boolean);
  const nextLines = next.split('\n').map((line) => line.trim()).filter(Boolean);
  const merged = [...prevLines, ...nextLines];

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const line of merged) {
    const normalized = line.replace(/\s+/g, ' ').toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push(line);
  }

  const limited = deduped.slice(-maxLines);
  const joined = limited.join('\n');
  if (joined.length <= maxChars) {
    return joined;
  }
  return joined.slice(joined.length - maxChars);
}

function buildAgentSystemPrompt(agent: string) {
  if (agent === 'planner') {
    return '你是规划智能体。请优先产出结构化步骤、依赖关系和风险提示。';
  }
  if (agent === 'coder') {
    return '你是编码智能体。请优先提供可执行实现与最小改动方案。';
  }
  if (agent === 'reviewer') {
    return '你是审查智能体。请重点检查正确性、边界条件和回归风险。';
  }
  return '你是通用智能体。请简洁、准确地回答并给出可执行建议。';
}

export function ChatInputPanel({ isDocked, dockPosition }: InputPanelProps = {}) {
  const [input, setInput] = useState('');
  const [hasClipboardImage, setHasClipboardImage] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4.1');
  const [selectedAgent, setSelectedAgent] = useState<string>('general');
  const [todoCollapsed, setTodoCollapsed] = useState(false);
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [operations, setOperations] = useState<OperationItem[]>([]);
  const [showReasoning, setShowReasoning] = useState(false);
  const [reasoningTimeline, setReasoningTimeline] = useState<Array<{ id: string; time: number; label: string; detail?: string }>>([]);
  const [backendHint, setBackendHint] = useState<string>('后端检查中...');
  const [models, setModels] = useState<AIModelInfo[]>([]);
  const [streamPreview, setStreamPreview] = useState('');
  const streamBufferRef = useRef('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { 
    addMessage, 
    messages,
    activeConversationId,
    conversations,
    conversationSummaries,
    conversationGroupMemories,
    upsertConversationSummary,
    upsertConversationGroupMemory,
    imageAttachments, 
    addImageAttachment, 
    removeImageAttachment, 
    clearImageAttachments,
    isLoading,
    setIsLoading,
    activeBackend
  } = useAppStore();

  const CONTEXT_MESSAGE_LIMIT = 16;
  const CONTEXT_COMPRESSION_TRIGGER = 24;
  
  // 竖条模式时隐藏提示
  const hidePlaceholder = isDocked && (dockPosition === 'left' || dockPosition === 'right');
  const placeholder = hidePlaceholder ? "" : "输入消息... (Ctrl+V 粘贴图片)";
  
  // 竖条模式样式（左右停靠时）
  const isVerticalBar = isDocked && (dockPosition === 'left' || dockPosition === 'right');

  const pushOperation = (label: string, detail?: string) => {
    const id = `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const operation: OperationItem = { id, label, detail, state: 'running' };
    setOperations((prev) => [operation, ...prev].slice(0, 6));
    return id;
  };

  const updateOperation = (id: string, patch: Partial<OperationItem>) => {
    setOperations((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const appendOperationEvent = (next: { label: string; detail?: string; state?: OperationState }) => {
    setOperations((prev) => {
      const latest = prev[0];
      const normalizedState = next.state || 'running';
      if (latest && latest.label === next.label && latest.detail === next.detail && latest.state === normalizedState) {
        return prev;
      }
      const item: OperationItem = {
        id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        label: next.label,
        detail: next.detail,
        state: normalizedState,
      };
      return [item, ...prev].slice(0, 12);
    });
  };

  const appendReasoningEvent = (next: { label: string; detail?: string }) => {
    setReasoningTimeline((prev) => {
      const latest = prev[0];
      if (latest && latest.label === next.label && latest.detail === next.detail) {
        return prev;
      }
      const item = {
        id: `reason-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        time: Date.now(),
        label: next.label,
        detail: next.detail,
      };
      return [item, ...prev].slice(0, 40);
    });
  };

  const toggleTodo = (id: string) => {
    setTodoItems((prev) => prev.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)));
  };

  const removeTodo = (id: string) => {
    setTodoItems((prev) => prev.filter((todo) => todo.id !== id));
  };

  const clearCompletedTodos = () => {
    setTodoItems((prev) => prev.filter((todo) => !todo.done));
  };
  
  // 检测剪贴板是否有图片
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          const imageType = item.types.find(type => type.startsWith('image/'));
          setHasClipboardImage(!!imageType);
          return;
        }
      } catch {
        // 剪贴板访问被拒绝
      }
      setHasClipboardImage(false);
    };
    
    checkClipboard();
    
    // 监听焦点事件重新检测剪贴板
    const handleFocus = () => checkClipboard();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  useEffect(() => {
    const checkBackend = async () => {
      if (activeBackend !== 'copilot') {
        setBackendHint(`当前后端: ${activeBackend}（暂未接入发送能力）`);
        return;
      }

      if (!window.electronAPI?.ai?.selftest) {
        setBackendHint('后端不可用');
        return;
      }

      try {
        const result = await window.electronAPI.ai.selftest();
        if (result.ok) {
          const version = result.health?.nodeVersion || 'unknown';
          setBackendHint(`Bridge 已连接 (${version})`);
        } else if (result.authRequired) {
          setBackendHint(`Bridge 已连接但未认证：${result.authError || '请先登录 Copilot'}`);
        } else {
          setBackendHint(result.startError || result.authError || '后端自检失败');
        }
      } catch {
        setBackendHint('后端自检失败');
      }
    };

    checkBackend();
  }, [activeBackend]);

  useEffect(() => {
    const applyDefaultModels = () => {
      setModels(DEFAULT_MODEL_OPTIONS.map((item) => ({
        id: item.value,
        label: item.label,
        rateLabel: item.value === 'gpt-4o-mini' ? '0.4x' : item.value === 'none' ? '0x' : '1x',
      })));
    };

    const loadModels = async () => {
      if (activeBackend !== 'copilot') {
        applyDefaultModels();
        return;
      }

      try {
        const result = await window.electronAPI?.ai?.models?.();
        if (result?.ok && Array.isArray(result.models) && result.models.length > 0) {
          setModels(result.models);
          setSelectedModel((current) => (
            result.models!.some((m) => m.id === current) ? current : result.models![0].id
          ));
          return;
        }

        if (result?.authRequired) {
          setModels([
            { id: 'auth-required', label: '请先认证 Copilot（模型不可用）', rateLabel: '-' },
          ]);
          setSelectedModel('auth-required');
          if (result.error) {
            setBackendHint(`模型拉取失败：${result.error}`);
          }
          return;
        }

        if (result?.error) {
          setModels([
            { id: 'model-unavailable', label: '模型列表暂不可用', rateLabel: '-' },
          ]);
          setSelectedModel('model-unavailable');
          setBackendHint(`模型拉取失败：${result.error}`);
          return;
        }
      } catch {
      }

      applyDefaultModels();
    };

    loadModels();

    const onFocus = () => {
      loadModels();
    };
    const onAuthUpdated = () => {
      loadModels();
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('ai-auth-updated', onAuthUpdated as EventListener);

    const timer = window.setInterval(() => {
      loadModels();
    }, 20000);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('ai-auth-updated', onAuthUpdated as EventListener);
      window.clearInterval(timer);
    };
  }, [activeBackend]);
  
  const handleSubmit = async () => {
    if ((!input.trim() && imageAttachments.length === 0) || isLoading) return;
    
    const userMessage = input;
    const images = imageAttachments.length > 0 ? [...imageAttachments] : undefined;
    
    addMessage({
      role: 'user',
      content: userMessage,
      images
    });
    
    setInput('');
    clearImageAttachments();
    setIsLoading(true);
    setStreamPreview('');
    setReasoningTimeline([]);
    streamBufferRef.current = '';

    let hasStreamError = false;
    let streamErrorMessage = '';
    let hasStreamEnd = false;
    
    try {
      if (!window.electronAPI?.ai) {
        throw new Error('AI backend unavailable');
      }
      if (activeBackend !== 'copilot') {
        throw new Error(`当前后端 ${activeBackend} 暂未接入发送能力`);
      }
      if (selectedModel === 'auth-required') {
        throw new Error('Copilot 未认证，请先完成登录后再发送。');
      }
      if (selectedModel === 'model-unavailable') {
        throw new Error('模型列表不可用，请稍后重试。');
      }

      let backendImages = images?.map((img) => ({
        id: img.id,
        name: img.name,
        mimeType: img.type,
        size: img.size,
        dataUrl: img.dataUrl,
      }));

      const uploadOp = pushOperation('上传附件', backendImages?.length ? `${backendImages.length} 个文件` : '无附件');
      if (backendImages && backendImages.length > 0 && window.electronAPI.ai.upload) {
        const uploaded = await Promise.all(
          backendImages.map(async (img) => {
            try {
              const result = await window.electronAPI.ai.upload({ image: img });
              return result.ok && result.image
                ? { ...img, ...result.image }
                : img;
            } catch {
              return img;
            }
          })
        );
        backendImages = uploaded;
      }
      updateOperation(uploadOp, { state: 'success', detail: backendImages?.length ? '上传完成' : '跳过' });

      const selectedModelInfo = models.find((m) => m.id === selectedModel);
      const sendOp = pushOperation('请求智能体', `${selectedAgent} / ${selectedModelInfo?.label || selectedModel}`);

      if (
        window.electronAPI.ai.onStreamChunk &&
        window.electronAPI.ai.onStreamError &&
        window.electronAPI.ai.removeStreamListeners
      ) {
        window.electronAPI.ai.removeStreamListeners();

        window.electronAPI.ai.onStreamChunk((chunk) => {
          const delta = typeof chunk?.delta === 'string'
            ? chunk.delta
            : typeof chunk?.content === 'string'
            ? chunk.content
            : '';

          if (!delta) return;

          streamBufferRef.current += delta;
          setStreamPreview(streamBufferRef.current);
        });

        window.electronAPI.ai.onStreamError((error) => {
          hasStreamError = true;
          streamErrorMessage = error?.message || '流式响应异常';
        });

        window.electronAPI.ai.onStreamEnd(() => {
          hasStreamEnd = true;
        });

        if (window.electronAPI.ai.onOperation) {
          window.electronAPI.ai.onOperation((operation: AIStreamOperation) => {
            const label = typeof operation?.label === 'string' && operation.label.trim()
              ? operation.label
              : '智能体处理中';
            const detail = typeof operation?.detail === 'string' && operation.detail.trim()
              ? operation.detail
              : undefined;
            const state: OperationState = operation?.state === 'success' || operation?.state === 'error'
              ? operation.state
              : 'running';

            appendOperationEvent({ label, detail, state });

            const eventType = typeof operation?.eventType === 'string' ? operation.eventType : '';
            if (
              /reasoning|intent|turn_start|turn_end|heartbeat|tool\./i.test(eventType) ||
              /思考|工具|处理中|回复中/.test(label)
            ) {
              appendReasoningEvent({ label, detail });
            }
          });
        }
      }

      const todoContext = todoItems
        .filter((todo) => !todo.done)
        .map((todo, idx) => `${idx + 1}. ${todo.text}`)
        .join('\n');

      const activeConversation = conversations.find((conv) => conv.id === activeConversationId);
      const currentProjectId = activeConversation?.projectId || 'default-project';
      const storedConversationMemory = conversationSummaries[activeConversationId]?.summary || '';
      const storedGroupMemory = conversationGroupMemories[currentProjectId]?.summary || '';

      const overflowMessages = messages.length > CONTEXT_COMPRESSION_TRIGGER
        ? messages.slice(0, messages.length - CONTEXT_MESSAGE_LIMIT)
        : [];
      const overflowSummary = summarizeMessagesForMemory(
        overflowMessages.map((msg) => ({ role: msg.role as 'user' | 'assistant', content: msg.content })),
        8
      );

      const sessionMemory = mergeMemorySummary(storedConversationMemory, overflowSummary);
      if (sessionMemory && sessionMemory !== storedConversationMemory) {
        upsertConversationSummary(activeConversationId, sessionMemory, messages.length);
      }

      const systemPrompt = `${buildAgentSystemPrompt(selectedAgent)}${todoContext ? `\n\n当前待办:\n${todoContext}` : ''}${storedGroupMemory ? `\n\n对话组记忆（跨会话）：\n${storedGroupMemory}` : ''}${sessionMemory ? `\n\n会话简要记忆（压缩）：\n${sessionMemory}` : ''}`;

      const historyMessages = messages
        .slice(-CONTEXT_MESSAGE_LIMIT)
        .map((msg) => ({ role: msg.role as 'user' | 'assistant', content: msg.content }));

      const request = {
        messages: [
          {
            role: 'system' as const,
            content: systemPrompt,
          },
          ...historyMessages,
          {
            role: 'user' as const,
            content: userMessage,
            images: backendImages,
          },
        ],
        model: selectedModel === 'none' || selectedModel === 'auth-required' || selectedModel === 'model-unavailable'
          ? undefined
          : selectedModel,
        stream: true,
      };

      const result = await window.electronAPI.ai.send(request);

      if (hasStreamError && !result.ok) {
        throw new Error(streamErrorMessage || result.error || 'AI response failed');
      }

      const streamedContent = streamBufferRef.current.trim();
      if (!result.ok && !streamedContent) {
        throw new Error(result.error || 'AI response failed');
      }

      if (!result.ok && streamedContent) {
        updateOperation(sendOp, { state: 'success', detail: '已返回部分流式内容' });
        addMessage({
          role: 'assistant',
          content: streamedContent,
        });

        const turnSummary = summarizeMessagesForMemory([
          { role: 'user', content: userMessage },
          { role: 'assistant', content: streamedContent },
        ], 4);
        upsertConversationSummary(
          activeConversationId,
          mergeMemorySummary(conversationSummaries[activeConversationId]?.summary || '', turnSummary),
          messages.length + 2
        );
        upsertConversationGroupMemory(
          currentProjectId,
          mergeMemorySummary(conversationGroupMemories[currentProjectId]?.summary || '', turnSummary, 12, 1200),
          activeConversationId
        );

        const extractedFromStream = extractTodosFromText(streamedContent);
        if (extractedFromStream.length > 0) {
          setTodoItems((prev) => mergeTodos(prev, extractedFromStream));
        }
        setStreamPreview('');
        return;
      }

      if (!result.response?.message?.content && !streamedContent) {
        throw new Error(result.error || 'AI response failed');
      }

      updateOperation(sendOp, { state: 'success', detail: '响应完成' });

      const assistantContent = streamedContent.length > 0
        ? streamBufferRef.current
        : result.response?.message?.content ?? '';

      const turnSummary = summarizeMessagesForMemory([
        { role: 'user', content: userMessage },
        { role: 'assistant', content: assistantContent },
      ], 4);

      upsertConversationSummary(
        activeConversationId,
        mergeMemorySummary(conversationSummaries[activeConversationId]?.summary || '', turnSummary),
        messages.length + 2
      );
      upsertConversationGroupMemory(
        currentProjectId,
        mergeMemorySummary(conversationGroupMemories[currentProjectId]?.summary || '', turnSummary, 12, 1200),
        activeConversationId
      );

      const extractedTodos = extractTodosFromText(assistantContent);
      if (extractedTodos.length > 0) {
        setTodoItems((prev) => mergeTodos(prev, extractedTodos));
      }

      addMessage({
        role: 'assistant',
        content: assistantContent,
      });
      setStreamPreview('');
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : '处理请求时出错，请重试。';
      const isStreamTimeout = /Bridge request timeout:\s*sendMessageStream/i.test(rawMessage);
      const streamedContent = streamBufferRef.current.trim();

      if (isStreamTimeout && streamedContent) {
        const opId = pushOperation('请求超时，已保留流式内容');
        updateOperation(opId, { state: 'success', detail: '主请求超时，但已收到部分回答' });
        addMessage({
          role: 'assistant',
          content: streamedContent,
        });

        const activeConversation = conversations.find((conv) => conv.id === activeConversationId);
        const currentProjectId = activeConversation?.projectId || 'default-project';
        const turnSummary = summarizeMessagesForMemory([
          { role: 'user', content: userMessage },
          { role: 'assistant', content: streamedContent },
        ], 4);
        upsertConversationSummary(
          activeConversationId,
          mergeMemorySummary(conversationSummaries[activeConversationId]?.summary || '', turnSummary),
          messages.length + 2
        );
        upsertConversationGroupMemory(
          currentProjectId,
          mergeMemorySummary(conversationGroupMemories[currentProjectId]?.summary || '', turnSummary, 12, 1200),
          activeConversationId
        );

        const extractedTodos = extractTodosFromText(streamedContent);
        if (extractedTodos.length > 0) {
          setTodoItems((prev) => mergeTodos(prev, extractedTodos));
        }
        setStreamPreview('');
        return;
      }

      const message = isStreamTimeout
        ? hasStreamEnd
          ? '请求结束确认超时，请重试一次。'
          : '请求超时：模型思考时间较长，请重试或缩短问题范围。'
        : rawMessage;
      const opId = pushOperation('请求失败');
      updateOperation(opId, { state: 'error', detail: message });
      addMessage({
        role: 'assistant',
        content: message,
      });
    } finally {
      if (window.electronAPI?.ai?.removeStreamListeners) {
        window.electronAPI.ai.removeStreamListeners();
      }
      streamBufferRef.current = '';
      setIsLoading(false);
    }
  };
  
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            addImageAttachment({
              dataUrl: reader.result as string,
              name: file.name || '粘贴的图片.png',
              type: file.type,
              size: file.size
            });
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };
  
  const pendingTodoCount = todoItems.filter((todo) => !todo.done).length;
  
  return (
    <div className={`flex bg-white h-full w-full ${isVerticalBar ? 'flex-row w-12 min-w-[48px]' : 'flex-col p-2 gap-2'}`}>
      {!isVerticalBar && (
        <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-500">模型</div>
              <select
                className="h-7 rounded border border-gray-200 bg-white px-2 text-xs text-gray-700"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                {(models.length > 0 ? models : DEFAULT_MODEL_OPTIONS.map((item) => ({ id: item.value, label: item.label, rateLabel: item.value === 'none' ? '0x' : '1x' }))).map((item) => (
                  <option key={item.id} value={item.id}>{item.label} · {item.rateLabel}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-500">智能体</div>
              <select
                className="h-7 rounded border border-gray-200 bg-white px-2 text-xs text-gray-700"
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
              >
                {AGENT_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {OPERATION_HINTS.map((hint) => (
              <button
                key={hint.id}
                className="h-6 rounded-full border border-pink-200 bg-pink-50 px-2 text-[11px] text-pink-700 hover:bg-pink-100"
                onClick={() => setInput((prev) => (prev ? `${prev}\n${hint.prompt}` : hint.prompt))}
                title={hint.prompt}
              >
                <Sparkles size={12} className="inline mr-1" />
                {hint.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded border border-gray-200 bg-gray-50">
              <button
                className="w-full flex items-center justify-between px-2 py-1.5 text-left text-xs text-gray-700"
                onClick={() => setTodoCollapsed((v) => !v)}
              >
                <span className="inline-flex items-center gap-1">
                  <ListTodo size={12} />
                  待办事项 ({pendingTodoCount})
                </span>
                {todoCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              </button>

              {!todoCollapsed && (
                <div className="px-2 pb-2 space-y-1 max-h-28 overflow-auto">
                  {todoItems.length === 0 ? (
                    <div className="text-[11px] text-gray-400">暂无待办，AI 响应中的 checklist 会自动同步。</div>
                  ) : (
                    todoItems.map((todo) => (
                      <div key={todo.id} className="flex items-center gap-1">
                        <button onClick={() => toggleTodo(todo.id)} className="text-gray-500 hover:text-gray-700">
                          {todo.done ? <CheckCircle2 size={13} className="text-green-600" /> : <Circle size={13} />}
                        </button>
                        <span className={`text-[11px] flex-1 ${todo.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {todo.text}
                        </span>
                        <button onClick={() => removeTodo(todo.id)} className="text-gray-400 hover:text-red-500">
                          <X size={11} />
                        </button>
                      </div>
                    ))
                  )}

                  {todoItems.some((todo) => todo.done) && (
                    <button
                      className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700"
                      onClick={clearCompletedTodos}
                    >
                      <Trash2 size={11} />
                      清理已完成
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="rounded border border-gray-200 bg-gray-50 px-2 py-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-gray-700 inline-flex items-center gap-1">
                  <Bot size={12} />
                  操作提示
                </div>
                <button
                  className="text-[11px] text-blue-600 hover:text-blue-700"
                  onClick={() => setShowReasoning((prev) => !prev)}
                >
                  {showReasoning ? '收起思考过程' : '显示思考过程'}
                </button>
              </div>
              <div className="mt-1 space-y-1 max-h-28 overflow-auto">
                <div className="text-[11px] text-gray-500">{backendHint}</div>
                {isLoading && streamPreview && (
                  <div className="text-[11px] text-blue-600 whitespace-pre-wrap break-words border border-blue-100 bg-blue-50 rounded p-1">
                    {streamPreview}
                  </div>
                )}
                {operations.length === 0 ? (
                  <div className="text-[11px] text-gray-400">暂无运行中的操作</div>
                ) : (
                  operations.map((op) => (
                    <div key={op.id} className="text-[11px] text-gray-600">
                      <span className={op.state === 'success' ? 'text-green-600' : op.state === 'error' ? 'text-red-600' : 'text-blue-600'}>
                        {op.state === 'running' ? '●' : op.state === 'success' ? '✓' : '✕'}
                      </span>{' '}
                      {op.label}{op.detail ? ` · ${op.detail}` : ''}
                    </div>
                  ))
                )}
              </div>

              {showReasoning && (
                <div className="mt-2 border-t border-gray-200 pt-2 max-h-28 overflow-auto space-y-1">
                  {reasoningTimeline.length === 0 ? (
                    <div className="text-[11px] text-gray-400">暂无思考过程事件</div>
                  ) : (
                    reasoningTimeline.map((item) => (
                      <div key={item.id} className="text-[11px] text-gray-600">
                        <span className="text-gray-400">[{new Date(item.time).toLocaleTimeString()}]</span>{' '}
                        {item.label}{item.detail ? ` · ${item.detail}` : ''}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 图片附件 - 竖条模式下隐藏 */}
      {!isVerticalBar && imageAttachments.length > 0 && (
        <div className="flex flex-wrap gap-1 flex-shrink-0">
          {imageAttachments.map((img) => (
            <div key={img.id} className="relative w-16 h-16 rounded overflow-hidden border border-gray-200">
              <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
              <button 
                className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center cursor-pointer text-white hover:bg-black/80"
                onClick={() => removeImageAttachment(img.id)}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* 输入区域 - 自动填满剩余空间 */}
      <div className={`${isVerticalBar ? 'flex-1 relative h-full w-full' : 'flex-1 relative min-h-[120px]'}`}>
        <textarea
          ref={textareaRef}
          className={`w-full h-full rounded-lg bg-gray-50 border border-gray-200 text-sm resize-none focus:border-blue-500 focus:outline-none ${isVerticalBar ? 'p-2 writing-vertical-rl text-center' : 'p-3 pb-10'}`}
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={isLoading}
        />
        
        {/* 发送按钮 - 竖条模式下居中显示在底部 */}
        {isVerticalBar ? (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
            <button
              className="w-8 h-8 rounded flex items-center justify-center bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={handleSubmit}
              disabled={(!input.trim() && imageAttachments.length === 0) || isLoading}
              title="发送 (Enter)"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        ) : (
          /* 右下角按钮组 */
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            {/* 附加文件按钮 */}
            <button
              className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
              title="附加文件"
            >
              <Paperclip size={16} />
            </button>
            
            {/* 剪贴板粘贴按钮 - 有图片时高亮 */}
            {hasClipboardImage && (
              <button
                className="w-7 h-7 rounded flex items-center justify-center text-blue-500 hover:bg-blue-50 transition-colors"
                title="粘贴剪贴板图片"
                onClick={async () => {
                  try {
                    const clipboardItems = await navigator.clipboard.read();
                    for (const item of clipboardItems) {
                      const imageType = item.types.find(type => type.startsWith('image/'));
                      if (imageType) {
                        const blob = await item.getType(imageType);
                        const reader = new FileReader();
                        reader.onload = () => {
                          addImageAttachment({
                            dataUrl: reader.result as string,
                            name: '剪贴板图片.png',
                            type: imageType,
                            size: blob.size
                          });
                        };
                        reader.readAsDataURL(blob);
                      }
                    }
                  } catch {
                    console.log('剪贴板访问被拒绝');
                  }
                }}
              >
                <ImageIcon size={16} />
              </button>
            )}
            
            {/* 发送按钮 */}
            <button
              className="w-8 h-7 rounded flex items-center justify-center bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={handleSubmit}
              disabled={(!input.trim() && imageAttachments.length === 0) || isLoading}
              title="发送 (Enter)"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
