'use client';

import { X } from 'lucide-react';
import { useChatHistory, ChatSession } from '@/hooks/use-chat-history';
import { cn } from '@/lib/utils';

interface HistoryPanelProps {
  onClose: () => void;
  onSelectSession: (session: ChatSession) => void;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  if (diff < oneDay && date.getDate() === now.getDate()) {
    return '今天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 2 * oneDay && date.getDate() === now.getDate() - 1) {
    return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 3 * oneDay) {
    return '前天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

export function HistoryPanel({ onClose, onSelectSession }: HistoryPanelProps) {
  const { sessions, deleteSession } = useChatHistory();

  return (
    <div className="w-72 h-full bg-card border-r border-border flex flex-col">
      {/* 头部 */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-foreground">历史对话</h2>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-accent rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* 搜索框 */}
      <div className="p-3">
        <input
          type="text"
          placeholder="搜索对话记录..."
          className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* 对话列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <p className="text-sm text-muted-foreground mb-1">暂无历史对话</p>
            <p className="text-xs text-muted-foreground">开始一个新对话吧</p>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className="group"
            >
              <button
                onClick={() => onSelectSession(session)}
                className="w-full p-3 text-left rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className="text-sm font-medium text-foreground truncate flex-1">
                    {session.title}
                  </h3>
                  <span className="text-xs text-muted-foreground ml-2 shrink-0">
                    {formatTime(session.updatedAt)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {session.preview || '新对话'}
                </p>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('确定删除这条对话记录？')) {
                    deleteSession(session.id);
                  }
                }}
                className="absolute right-2 top-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-accent rounded transition-all"
              >
                <svg className="w-3 h-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
