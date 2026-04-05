// 对话历史管理 Hook

import { useState, useEffect, useCallback } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  preview: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  model: string;
  provider: string;
}

// 从 localStorage 加载会话列表
export function useChatHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);

  // 加载历史
  useEffect(() => {
    const savedSessions = localStorage.getItem('chat-sessions');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        // 转换日期字符串为 Date 对象
        const sessionsWithDates = parsed.map((s: ChatSession) => ({
          ...s,
          messages: s.messages.map((m: Message) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
        }));
        setSessions(sessionsWithDates);
      } catch {
        setSessions([]);
      }
    }
  }, []);

  // 保存到 localStorage
  const saveSessions = useCallback((newSessions: ChatSession[]) => {
    localStorage.setItem('chat-sessions', JSON.stringify(newSessions));
    setSessions(newSessions);
  }, []);

  // 创建新会话
  const createSession = useCallback((model: string, provider: string): ChatSession => {
    const session: ChatSession = {
      id: Date.now().toString(),
      title: '新对话',
      preview: '',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      model,
      provider,
    };
    
    const newSessions = [session, ...sessions];
    saveSessions(newSessions);
    setCurrentSession(session);
    return session;
  }, [sessions, saveSessions]);

  // 更新当前会话
  const updateSession = useCallback((sessionId: string, updates: Partial<ChatSession>) => {
    const newSessions = sessions.map(s => {
      if (s.id === sessionId) {
        const updated = { ...s, ...updates, updatedAt: new Date().toISOString() };
        // 如果有消息，更新预览
        if (updates.messages && updates.messages.length > 0) {
          const lastMessage = updates.messages[updates.messages.length - 1];
          if (lastMessage.role === 'user') {
            updated.preview = lastMessage.content.slice(0, 50);
          }
          // 如果是第一条用户消息，更新标题
          if (updates.messages.length === 1 && lastMessage.role === 'user') {
            updated.title = lastMessage.content.slice(0, 30) + (lastMessage.content.length > 30 ? '...' : '');
          }
        }
        return updated;
      }
      return s;
    });
    
    // 更新当前会话
    if (currentSession?.id === sessionId) {
      setCurrentSession(newSessions.find(s => s.id === sessionId) || null);
    }
    
    saveSessions(newSessions);
  }, [sessions, currentSession, saveSessions]);

  // 添加消息到当前会话
  const addMessage = useCallback((sessionId: string, message: Message) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      const updatedMessages = [...session.messages, message];
      updateSession(sessionId, { messages: updatedMessages });
    }
  }, [sessions, updateSession]);

  // 删除会话
  const deleteSession = useCallback((sessionId: string) => {
    const newSessions = sessions.filter(s => s.id !== sessionId);
    saveSessions(newSessions);
    if (currentSession?.id === sessionId) {
      setCurrentSession(null);
    }
  }, [sessions, currentSession, saveSessions]);

  // 加载指定会话
  const loadSession = useCallback((sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSession(session);
    }
  }, [sessions]);

  // 获取最近的会话
  const getRecentSessions = useCallback((limit: number = 5) => {
    return sessions.slice(0, limit);
  }, [sessions]);

  return {
    sessions,
    currentSession,
    setCurrentSession,
    createSession,
    updateSession,
    addMessage,
    deleteSession,
    loadSession,
    getRecentSessions,
  };
}
