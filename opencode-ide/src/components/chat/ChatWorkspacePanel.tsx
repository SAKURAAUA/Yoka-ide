'use client';

import { ChatHistoryPanel } from './ChatHistoryPanel';
import { ChatInputPanel } from './ChatInputPanel';

export function ChatWorkspacePanel({
  isDocked,
  dockPosition,
}: {
  isDocked?: boolean;
  dockPosition?: 'left' | 'right' | 'top' | 'bottom' | 'center';
}) {
  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden">
      <div className="flex-1 min-h-0 overflow-hidden">
        <ChatHistoryPanel />
      </div>
      <div className="border-t border-gray-200 flex-shrink-0">
        <ChatInputPanel isDocked={isDocked} dockPosition={dockPosition} />
      </div>
    </div>
  );
}

export default ChatWorkspacePanel;
