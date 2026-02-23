'use client';

import { useMemo, useState } from 'react';
import { useAppStore } from '@/store';

type ConversationItem = {
  id: string;
  title: string;
};

type ConversationGroup = {
  id: string;
  title: string;
  items: ConversationItem[];
};

export function ConversationListMenu({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const conversations = useAppStore((s) => s.conversations);
  const activeConversationId = useAppStore((s) => s.activeConversationId);
  const setActiveConversation = useAppStore((s) => s.setActiveConversation);
  const upsertConversation = useAppStore((s) => s.upsertConversation);

  // 这里先用“真实结构”的列表（对话组/对话），后续可直接替换为后端/本地持久化数据
  const groups = useMemo<ConversationGroup[]>(() => {
    const projectConversations = conversations.filter((c) => c.projectId === projectId);
    if (projectConversations.length > 0) {
      return [
        {
          id: `g-${projectId}-dynamic`,
          title: '对话组',
          items: projectConversations.map((c) => ({ id: c.id, title: c.title })),
        },
      ];
    }

    const base = projectId.slice(-2);
    return [
      {
        id: `g-${projectId}-1`,
        title: '对话组',
        items: [
          { id: `c-${base}-1`, title: '对话' },
          { id: `c-${base}-2`, title: '对话' },
          { id: `c-${base}-3`, title: '对话' },
          { id: `c-${base}-4`, title: '对话' },
        ],
      },
      {
        id: `g-${projectId}-2`,
        title: '对话组',
        items: [
          { id: `c-${base}-5`, title: '对话' },
          { id: `c-${base}-6`, title: '对话' },
        ],
      },
    ];
  }, [projectId, conversations]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of groups) init[g.id] = true;
    return init;
  });

  const [activeId, setActiveId] = useState<string | null>(activeConversationId);

  return (
    <div className="h-full w-full bg-white">
      <div className="px-4 pt-3 pb-2 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-900">{projectName || '项目名称'}</div>
          <div className="flex items-center gap-2 px-2 py-1 border border-gray-200 rounded-full bg-white">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-gray-700">状态</span>
          </div>
        </div>
      </div>

      <div className="p-2 overflow-auto" style={{ height: 'calc(100% - 48px)' }}>
        {groups.map((g) => {
          const isOpen = expanded[g.id] ?? true;
          return (
            <div key={g.id} className="mb-2">
              <button
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 text-left"
                onClick={() => setExpanded((s) => ({ ...s, [g.id]: !isOpen }))}
              >
                <span className="text-gray-500 text-xs" aria-hidden>
                  {isOpen ? '▾' : '▸'}
                </span>
                <span className="text-sm text-gray-800">{g.title}</span>
              </button>

              {isOpen && (
                <div className="pl-5">
                  {g.items.map((it) => (
                    <button
                      key={it.id}
                      className={`w-full px-2 py-1.5 rounded text-left text-sm transition-colors ${
                        activeId === it.id ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        setActiveId(it.id);
                        upsertConversation({ id: it.id, title: it.title, projectId });
                        setActiveConversation(it.id);
                      }}
                      title={it.title}
                    >
                      {it.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
