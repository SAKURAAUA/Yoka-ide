'use client';

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { useAppStore } from '@/store';
import { Send, Image as ImageIcon, X, ClipboardPaste, Loader2, AlertCircle, Trash2, Pin } from 'lucide-react';

function useLongPress(callback: () => void, duration: number = 800) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isPressing, setIsPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const start = () => {
    setIsPressing(true);
    const startTime = Date.now();
    
    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(elapsed / duration, 1);
      setProgress(newProgress);
      
      if (newProgress < 1) {
        requestAnimationFrame(updateProgress);
      }
    };
    
    timerRef.current = setTimeout(() => {
      callback();
      setIsPressing(false);
      setProgress(0);
    }, duration);
    
    requestAnimationFrame(updateProgress);
  };
  
  const stop = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setIsPressing(false);
    setProgress(0);
  };
  
  return { start, stop, isPressing, progress };
}

function ChatInput() {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { 
    addMessage, 
    imageAttachments, 
    addImageAttachment, 
    removeImageAttachment, 
    clearImageAttachments,
    isLoading,
    setIsLoading
  } = useAppStore();
  
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
    
    try {
      if (!window.electronAPI?.ai) {
        throw new Error('AI backend unavailable');
      }

      let backendImages = images?.map((img) => ({
        id: img.id,
        name: img.name,
        mimeType: img.type,
        size: img.size,
        dataUrl: img.dataUrl,
      }));

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

      const request = {
        messages: [
          {
            role: 'user' as const,
            content: userMessage,
            images: backendImages,
          },
        ],
      };

      const result = await window.electronAPI.ai.send(request);

      if (!result.ok || !result.response?.message?.content) {
        throw new Error(result.error || 'AI response failed');
      }

      addMessage({
        role: 'assistant',
        content: result.response.message.content,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '处理请求时出错，请重试。';
      addMessage({
        role: 'assistant',
        content: message,
      });
    } finally {
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
  
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);
  
  return (
    <div className="flex flex-col p-3 bg-[#252526] border-t border-[#3c3c3c]">
      {imageAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {imageAttachments.map((img) => (
            <div key={img.id} className="relative w-20 h-20 rounded overflow-hidden border border-[#3c3c3c]">
              <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
              <button 
                className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center cursor-pointer text-white text-xs"
                onClick={() => removeImageAttachment(img.id)}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          className="flex-1 min-h-[40px] max-h-[200px] p-2.5 rounded-lg bg-[#3c3c3c] border border-[#3c3c3c] text-sm resize-none focus:border-[#0078d4] focus:outline-none"
          placeholder="输入消息或粘贴图片..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          rows={1}
          disabled={isLoading}
        />
        <button
          className="flex items-center justify-center w-7 h-7 rounded hover:bg-[#37373d] disabled:opacity-50"
          title="从剪贴板粘贴"
          disabled={isLoading}
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
              console.log('剪贴板访问被拒绝或没有图片');
            }
          }}
        >
          <ClipboardPaste size={20} />
        </button>
        <button
          className="flex items-center justify-center w-10 h-10 bg-[#0078d4] rounded-lg text-white hover:bg-[#1e90ff] disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSubmit}
          disabled={(!input.trim() && imageAttachments.length === 0) || isLoading}
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}

function WindowTitlebar({ title, onClose, windowId }: { title: string; onClose?: () => void; windowId?: string }) {
  const { toggleAlwaysOnTop, windows } = useAppStore();
  const currentWindow = windowId ? windows.find(w => w.id === windowId) : null;
  const isPinned = currentWindow?.alwaysOnTop || false;
  
  const { start: startLongPress, stop: stopLongPress, isPressing, progress } = useLongPress(
    () => {
      if (windowId) {
        toggleAlwaysOnTop(windowId);
      }
    },
    800
  );
  
  return (
    <div 
      className={`h-9 flex items-center justify-between px-3 bg-gradient-to-b from-[#37373d] to-[#2d2d2d] border-b border-[#3c3c3c] select-none cursor-move ${isPinned ? 'border-l-2 border-l-[#0078d4]' : ''}`}
      onMouseDown={startLongPress}
      onMouseUp={stopLongPress}
      onMouseLeave={stopLongPress}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{title}</span>
        {isPinned && <Pin size={14} className="text-[#0078d4]" />}
        {isPressing && (
          <div className="relative w-5 h-5">
            <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" fill="none" stroke="#3c3c3c" strokeWidth="2" />
              <circle 
                cx="10" cy="10" r="8" 
                fill="none" 
                stroke="#0078d4" 
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="50"
                strokeDashoffset={50 - progress * 50}
              />
            </svg>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button 
          className={`p-1 rounded hover:bg-[#37373d] ${isPinned ? 'text-[#0078d4]' : ''}`}
          onClick={() => windowId && toggleAlwaysOnTop(windowId)}
          title="切换置顶（或长按标题栏）"
        >
          <Pin size={14} />
        </button>
        <button 
          className="p-1 rounded hover:bg-[#37373d]"
          onClick={onClose}
          title="关闭"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export function ChatPanel({ isFloating, windowId, onClose }: { isFloating?: boolean; windowId?: string; onClose?: () => void }) {
  const { messages, clearMessages, configStatus, windows } = useAppStore();
  const [authStatus, setAuthStatus] = useState<import('@/types').AIAuthStatus | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentWindow = windowId ? windows.find(w => w.id === windowId) : null;

  const refreshAuthStatus = async () => {
    if (!window.electronAPI?.aiAuth) {
      return;
    }

    setAuthBusy(true);
    try {
      const status = await window.electronAPI.aiAuth.status();
      setAuthStatus(status);
    } finally {
      setAuthBusy(false);
    }
  };

  useEffect(() => {
    refreshAuthStatus();
  }, []);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const content = (
    <>
      <div className="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-[#3c3c3c] text-xs font-semibold uppercase tracking-wider text-[#858585]">
        <div className="flex items-center gap-2">
          <span>聊天</span>
          {authStatus && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
              authStatus.state === 'authenticated'
                ? 'border-green-500/60 text-green-400'
                : authStatus.state === 'error'
                  ? 'border-red-500/60 text-red-400'
                  : 'border-[#3c3c3c] text-[#8a8a8a]'
            }`}>
              {authStatus.state === 'authenticated' ? '已登录' : authStatus.state === 'error' ? '登录异常' : '未登录'}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button
            className="flex items-center justify-center h-7 px-2 rounded hover:bg-[#37373d] text-[10px]"
            title="刷新登录状态"
            disabled={authBusy}
            onClick={refreshAuthStatus}
          >
            刷新
          </button>
          {authStatus?.state === 'authenticated' ? (
            <button
              className="flex items-center justify-center h-7 px-2 rounded hover:bg-[#37373d] text-[10px]"
              title="退出登录"
              disabled={authBusy}
              onClick={async () => {
                if (!window.electronAPI?.aiAuth) return;
                setAuthBusy(true);
                try {
                  await window.electronAPI.aiAuth.logout();
                  await refreshAuthStatus();
                } finally {
                  setAuthBusy(false);
                }
              }}
            >
              退出
            </button>
          ) : (
            <button
              className="flex items-center justify-center h-7 px-2 rounded hover:bg-[#37373d] text-[10px]"
              title="连接 Copilot"
              disabled={authBusy}
              onClick={async () => {
                if (!window.electronAPI?.aiAuth) return;
                setAuthBusy(true);
                try {
                  const result = await window.electronAPI.aiAuth.start({});
                  if (!result.ok) {
                    throw new Error(result.error || '登录失败');
                  }
                  await refreshAuthStatus();
                } catch (error) {
                  console.error(error);
                  window.alert(error instanceof Error ? error.message : '登录失败');
                } finally {
                  setAuthBusy(false);
                }
              }}
            >
              连接
            </button>
          )}
          {messages.length > 0 && (
            <button 
              className="flex items-center justify-center w-7 h-7 rounded hover:bg-[#37373d]"
              title="清空聊天"
              onClick={() => clearMessages()}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
      
      {configStatus === 'not_configured' && (
        <div className="m-3 p-3 bg-red-500/10 rounded-lg border border-red-500 flex items-center gap-2.5">
          <AlertCircle size={20} className="text-red-500" />
          <div className="flex-1">
            <div className="font-medium mb-0.5">AI 未配置</div>
            <div className="text-xs text-[#858585]">
              点击设置（齿轮）图标添加 API 密钥
            </div>
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#858585] text-center p-10">
            <ImageIcon size={64} className="mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">开始对话</h3>
            <p className="text-sm">输入消息或从剪贴板粘贴图片</p>
            {currentWindow?.alwaysOnTop && (
              <p className="mt-4 text-xs text-[#0078d4]">
                <Pin size={12} className="inline mr-1" />
                窗口已置顶（长按标题栏切换）
              </p>
            )}
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`mb-4 max-w-full ${msg.role === 'user' ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
              {msg.images && msg.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {msg.images.map((img) => (
                    <img 
                      key={img.id} 
                      src={img.dataUrl} 
                      alt={img.name}
                      className="max-w-[200px] max-h-[150px] rounded-lg border border-[#3c3c3c]"
                    />
                  ))}
                </div>
              )}
              <div className={`px-4 py-3 rounded-lg max-w-[80%] leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-[#0078d4] text-white' 
                  : 'bg-[#2d2d2d] border border-[#3c3c3c]'
              }`}>
                {msg.content}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput />
    </>
  );
  
  if (isFloating) {
    return (
      <div className="flex flex-col h-full bg-[#1e1e1e]">
        <WindowTitlebar title="聊天" onClose={onClose} windowId={windowId} />
        <div className="flex-1 flex flex-col overflow-hidden">
          {content}
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      {content}
    </div>
  );
}
