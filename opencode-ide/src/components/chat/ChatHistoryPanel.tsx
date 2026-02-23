'use client';

import { useRef, useEffect } from 'react';
import { useAppStore } from '@/store';
import { Image as ImageIcon, Trash2 } from 'lucide-react';

export function ChatHistoryPanel() {
  const { messages, clearMessages } = useAppStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center p-10">
            <ImageIcon size={64} className="mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">开始对话</h3>
            <p className="text-sm">输入消息或从剪贴板粘贴图片</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id} className={`mb-4 max-w-full ${msg.role === 'user' ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
                {msg.images && msg.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {msg.images.map((img) => (
                      <img 
                        key={img.id} 
                        src={img.dataUrl} 
                        alt={img.name}
                        className="max-w-[200px] max-h-[150px] rounded-lg border border-gray-200"
                      />
                    ))}
                  </div>
                )}
                <div className={`px-4 py-3 rounded-lg max-w-[80%] leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 border border-gray-200'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {messages.length > 0 && (
        <div className="p-2 border-t border-gray-100">
          <button 
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded"
            onClick={() => clearMessages()}
          >
            <Trash2 size={12} />
            <span>清空聊天</span>
          </button>
        </div>
      )}
    </div>
  );
}
