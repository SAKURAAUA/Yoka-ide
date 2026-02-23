'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Globe, RefreshCw, ArrowLeft, ArrowRight, Home, X, ExternalLink, Loader2 } from 'lucide-react';

export interface BrowserEditorProps {
  initialUrl?: string;
  onUrlChange?: (url: string) => void;
  onSave?: (html: string) => void;
}

/**
 * BrowserEditor - A browser-like component with address bar for previewing HTML
 */
export function BrowserEditor({
  initialUrl = 'about:blank',
  onUrlChange,
}: BrowserEditorProps) {
  const [url, setUrl] = useState(initialUrl);
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([initialUrl]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Normalize URL
  const normalizeUrl = useCallback((input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return 'about:blank';
    
    // Check if it's already a valid URL
    try {
      new URL(trimmed);
      return trimmed;
    } catch {
      // Not a valid URL, treat as search or domain
      if (trimmed.includes('.') && !trimmed.includes(' ')) {
        // Likely a domain
        return `https://${trimmed}`;
      }
      // Treat as search query
      return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
    }
  }, []);

  // Handle URL submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const normalizedUrl = normalizeUrl(inputUrl);
    setUrl(normalizedUrl);
    
    // Update history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(normalizedUrl);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    onUrlChange?.(normalizedUrl);
  }, [inputUrl, history, historyIndex, normalizeUrl, onUrlChange]);

  // Navigate back
  const handleBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setUrl(history[newIndex]);
      setInputUrl(history[newIndex]);
    }
  }, [history, historyIndex]);

  // Navigate forward
  const handleForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setUrl(history[newIndex]);
      setInputUrl(history[newIndex]);
    }
  }, [history, historyIndex]);

  // Refresh
  const handleRefresh = useCallback(() => {
    setUrl('about:blank');
    setTimeout(() => {
      const currentUrl = history[historyIndex];
      setUrl(currentUrl);
    }, 10);
  }, [history, historyIndex]);

  // Go home
  const handleHome = useCallback(() => {
    const homeUrl = 'about:blank';
    setUrl(homeUrl);
    setInputUrl(homeUrl);
  }, []);

  // Handle iframe load
  const handleLoad = useCallback(() => {
    setIsLoading(false);
    
    // Try to get the current URL from the iframe (may not work due to security)
    try {
      if (iframeRef.current?.contentWindow?.location.href) {
        const iframeUrl = iframeRef.current.contentWindow.location.href;
        if (iframeUrl !== 'about:blank') {
          setInputUrl(iframeUrl);
        }
      }
    } catch {
      // Cross-origin restriction - can't access iframe URL
    }
  }, []);

  // Open in external browser
  const handleOpenExternal = useCallback(() => {
    window.open(url, '_blank');
  }, [url]);

  // Security: restrict iframe capabilities
  const isSecureUrl = url.startsWith('http://') || url.startsWith('https://') || url === 'about:blank';
  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Address Bar */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 border-b border-gray-200">
        {/* Navigation buttons */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleBack}
            disabled={!canGoBack}
            className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
            title="后退"
          >
            <ArrowLeft size={16} />
          </button>
          <button
            onClick={handleForward}
            disabled={!canGoForward}
            className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
            title="前进"
          >
            <ArrowRight size={16} />
          </button>
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded hover:bg-gray-200"
            title="刷新"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleHome}
            className="p-1.5 rounded hover:bg-gray-200"
            title="主页"
          >
            <Home size={16} />
          </button>
        </div>

        {/* URL Input */}
        <form onSubmit={handleSubmit} className="flex-1 flex items-center">
          <div className="flex-1 flex items-center bg-white border border-gray-300 rounded px-2 py-1">
            <Globe size={14} className="text-gray-400 mr-2 flex-shrink-0" />
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className="flex-1 text-sm outline-none min-w-0"
              placeholder="输入网址或搜索..."
            />
            {isLoading && (
              <Loader2 size={14} className="animate-spin text-blue-500" />
            )}
          </div>
        </form>

        {/* Actions */}
        <div className="flex items-center gap-0.5 ml-1">
          <button
            onClick={handleOpenExternal}
            disabled={url === 'about:blank'}
            className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40"
            title="在浏览器中打开"
          >
            <ExternalLink size={16} />
          </button>
        </div>
      </div>

      {/* Browser Content */}
      <div className="flex-1 overflow-hidden bg-white">
        {url === 'about:blank' ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Globe size={48} className="mb-4 opacity-50" />
            <p className="text-sm">输入网址开始浏览</p>
            <p className="text-xs mt-2">支持 http:// 和 https:// 网址</p>
          </div>
        ) : isSecureUrl ? (
          <iframe
            ref={iframeRef}
            src={url}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            onLoad={handleLoad}
            title="网页预览"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-red-400">
            <X size={48} className="mb-4" />
            <p className="text-sm">不支持不安全的网址</p>
            <p className="text-xs mt-2">请使用 http:// 或 https:// 网址</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default BrowserEditor;
