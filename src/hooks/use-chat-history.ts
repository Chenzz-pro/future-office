// 对话历史管理 Hook - 支持数据库持久化

import { useState, useEffect, useCallback } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
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
  agentId?: string;
}

// 降级策略：本地存储的会话（标记为待同步）
interface PendingSyncSession {
  sessionId: string;
  action: 'create' | 'update' | 'delete';
  data: ChatSession;
  timestamp: number;
}

const STORAGE_KEY_SESSIONS = 'chat-sessions';
const STORAGE_KEY_PENDING = 'chat-sessions-pending';

// 获取当前用户 ID
function getCurrentUserId(): string {
  const userId = localStorage.getItem('current-user-id');
  if (!userId) {
    console.warn('[useChatHistory] 未找到 current-user-id，使用默认值 "user"');
    return 'user'; // 默认使用 'user'
  }
  return userId;
}

// 降级到 localStorage
function saveToLocal(sessions: ChatSession[]) {
  localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
}

function loadFromLocal(): ChatSession[] {
  const saved = localStorage.getItem(STORAGE_KEY_SESSIONS);
  if (!saved) return [];
  
  try {
    const parsed = JSON.parse(saved);
    return parsed.map((s: ChatSession) => ({
      ...s,
      messages: s.messages.map((m: Message) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })),
    }));
  } catch {
    return [];
  }
}

// 获取待同步的操作
function getPendingSync(): PendingSyncSession[] {
  const saved = localStorage.getItem(STORAGE_KEY_PENDING);
  if (!saved) return [];
  
  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

// 保存待同步的操作
function savePendingSync(pending: PendingSyncSession[]) {
  localStorage.setItem(STORAGE_KEY_PENDING, JSON.stringify(pending));
}

// API 调用辅助函数
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const userId = getCurrentUserId();
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      'X-User-ID': userId,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '请求失败');
  }

  return response.json();
}

// 数据库持久化版本的对话历史 Hook
export function useChatHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [isOnline, setIsOnline] = useState(true); // 数据库是否可用

  // 加载历史
  useEffect(() => {
    async function loadSessions() {
      try {
        const result = await fetchWithAuth('/api/chat/sessions');

        if (result.success) {
          // 转换数据库格式为前端格式
          const dbSessions: ChatSession[] = result.data.map((s: Record<string, unknown>) => ({
            id: s.id as string,
            title: s.title as string,
            preview: '', // 需要加载消息后更新
            messages: [],
            createdAt: s.createdAt as string,
            updatedAt: s.updatedAt as string,
            model: 'default',
            provider: 'default',
            agentId: s.agentId as string | undefined,
          }));

          // 并行加载每个会话的消息
          const sessionsWithMessages = await Promise.all(
            dbSessions.map(async (session) => {
              try {
                const messagesResult = await fetchWithAuth(`/api/chat/sessions/${session.id}/messages`);
                if (messagesResult.success && messagesResult.data.length > 0) {
                  const messages: Message[] = messagesResult.data.map((m: Record<string, unknown>) => ({
                    id: m.id as string,
                    role: m.role as 'user' | 'assistant' | 'system',
                    content: m.content as string,
                    timestamp: new Date(m.createdAt as string),
                  }));

                  // 更新预览
                  const lastMessage = messages[messages.length - 1];
                  const preview = lastMessage?.content?.slice(0, 50) || '';

                  // 如果有消息，更新标题（使用第一条用户消息）
                  const firstUserMessage = messages.find(m => m.role === 'user');
                  const title = firstUserMessage
                    ? (firstUserMessage.content.slice(0, 30) + (firstUserMessage.content.length > 30 ? '...' : ''))
                    : session.title;

                  return {
                    ...session,
                    messages,
                    preview,
                    title,
                  };
                }
                // 如果没有消息，返回 null，稍后过滤掉
                console.log('[useChatHistory] 会话没有消息，将被过滤:', session.id);
                return null;
              } catch (error) {
                console.error('[useChatHistory] 加载会话消息失败:', session.id, error);
                return null;
              }
            })
          );

          // 过滤掉没有消息的会话
          const validSessions = sessionsWithMessages.filter((s): s is ChatSession => s !== null);

          console.log('[useChatHistory] 加载完成:', {
            total: dbSessions.length,
            valid: validSessions.length,
            filtered: dbSessions.length - validSessions.length,
          });

          setSessions(validSessions);
          setIsOnline(true);
        }
      } catch (error) {
        console.error('[useChatHistory] 从数据库加载失败，降级到 localStorage:', error);
        // 降级到 localStorage
        const localSessions = loadFromLocal();
        setSessions(localSessions);
        setIsOnline(false);
      }
    }

    loadSessions();
  }, []);

  // 创建新会话
  const createSession = useCallback(async (model: string, provider: string): Promise<ChatSession> => {
    const session: ChatSession = {
      id: crypto.randomUUID(),
      title: '新对话',
      preview: '',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      model,
      provider,
    };

    try {
      // 尝试保存到数据库
      const result = await fetchWithAuth('/api/chat/sessions', {
        method: 'POST',
        body: JSON.stringify({ title: session.title }),
      });

      if (result.success) {
        // 使用数据库返回的 ID
        session.id = result.data.id;
      }
    } catch (error) {
      console.error('[useChatHistory] 创建会话失败，降级到 localStorage:', error);
      // 标记为待同步
      const pending = getPendingSync();
      pending.push({
        sessionId: session.id,
        action: 'create',
        data: session,
        timestamp: Date.now(),
      });
      savePendingSync(pending);
      setIsOnline(false);
    }

    // 保存到 localStorage（降级或作为缓存）
    const newSessions = [session, ...sessions];
    saveToLocal(newSessions);
    setSessions(newSessions);
    setCurrentSession(session);

    return session;
  }, [sessions]);

  // 更新当前会话
  const updateSession = useCallback(async (sessionId: string, updates: Partial<ChatSession>) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const updated = { ...session, ...updates, updatedAt: new Date().toISOString() };
    
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

    // 更新当前会话
    const newSessions = sessions.map(s => s.id === sessionId ? updated : s);
    saveToLocal(newSessions);
    setSessions(newSessions);

    if (currentSession?.id === sessionId) {
      setCurrentSession(updated);
    }

    // 尝试同步到数据库
    try {
      if (isOnline) {
        await fetchWithAuth(`/api/chat/sessions/${sessionId}`, {
          method: 'PUT',
          body: JSON.stringify({ title: updated.title }),
        });
      }
    } catch (error) {
      console.error('[useChatHistory] 更新会话失败，标记为待同步:', error);
      const pending = getPendingSync();
      const existingIndex = pending.findIndex(p => p.sessionId === sessionId && p.action === 'update');
      
      if (existingIndex >= 0) {
        pending[existingIndex] = {
          sessionId,
          action: 'update',
          data: updated,
          timestamp: Date.now(),
        };
      } else {
        pending.push({
          sessionId,
          action: 'update',
          data: updated,
          timestamp: Date.now(),
        });
      }
      savePendingSync(pending);
      setIsOnline(false);
    }
  }, [sessions, currentSession, isOnline]);

  // 添加消息到当前会话
  const addMessage = useCallback(async (sessionId: string, message: Message) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      console.warn('[addMessage] 会话不存在:', sessionId);
      return;
    }

    const updatedMessages = [...session.messages, message];
    await updateSession(sessionId, { messages: updatedMessages });

    // 尝试保存消息到数据库（不管 isOnline 状态如何，都尝试保存）
    try {
      console.log('[addMessage] 保存消息到数据库:', {
        sessionId,
        role: message.role,
        content: message.content.substring(0, 50),
        isOnline,
      });

      const response = await fetchWithAuth(`/api/chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          role: message.role,
          content: message.content,
        }),
      });

      if (response.success) {
        console.log('[addMessage] 消息保存成功');
        // 如果之前是离线状态，现在保存成功了，设置为在线
        if (!isOnline) {
          console.log('[addMessage] 消息保存成功，设置在线状态');
          setIsOnline(true);
        }
      } else {
        console.error('[addMessage] 消息保存失败:', response);
        setIsOnline(false);
      }
    } catch (error) {
      console.error('[addMessage] 添加消息失败，标记为待同步:', error);
      setIsOnline(false);
    }
  }, [sessions, updateSession, isOnline]);

  // 删除会话
  const deleteSession = useCallback(async (sessionId: string) => {
    const newSessions = sessions.filter(s => s.id !== sessionId);
    saveToLocal(newSessions);
    setSessions(newSessions);

    if (currentSession?.id === sessionId) {
      setCurrentSession(null);
    }

    // 尝试从数据库删除
    try {
      if (isOnline) {
        await fetchWithAuth(`/api/chat/sessions/${sessionId}`, {
          method: 'DELETE',
        });
      }
    } catch (error) {
      console.error('[useChatHistory] 删除会话失败，标记为待同步:', error);
      const pending = getPendingSync();
      const existingIndex = pending.findIndex(p => p.sessionId === sessionId);
      
      if (existingIndex >= 0) {
        pending.splice(existingIndex, 1);
      } else {
        const deletedSession = sessions.find(s => s.id === sessionId);
        if (deletedSession) {
          pending.push({
            sessionId,
            action: 'delete',
            data: deletedSession,
            timestamp: Date.now(),
          });
        }
      }
      savePendingSync(pending);
      setIsOnline(false);
    }
  }, [sessions, currentSession, isOnline]);

  // 加载指定会话
  const loadSession = useCallback(async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSession(session);
      
      // 尝试从数据库加载最新消息
      try {
        if (isOnline) {
          const result = await fetchWithAuth(`/api/chat/sessions/${sessionId}/messages`);
          if (result.success && result.data.length > session.messages.length) {
            const messages: Message[] = result.data.map((m: Record<string, unknown>) => ({
              id: m.id as string,
              role: m.role as 'user' | 'assistant' | 'system',
              content: m.content as string,
              timestamp: new Date(m.createdAt as string),
            }));

            await updateSession(sessionId, { messages });
          }
        }
      } catch (error) {
        console.error('[useChatHistory] 加载消息失败:', error);
      }
    }
  }, [sessions, updateSession, isOnline]);

  // 获取最近的会话
  const getRecentSessions = useCallback((limit: number = 5) => {
    return sessions.slice(0, limit);
  }, [sessions]);

  // 重试同步待同步的操作
  const retrySync = useCallback(async () => {
    const pending = getPendingSync();
    if (pending.length === 0) return;

    console.log('[useChatHistory] 开始重试同步', pending.length, '个待同步操作');

    for (const item of pending) {
      try {
        if (item.action === 'create') {
          await fetchWithAuth('/api/chat/sessions', {
            method: 'POST',
            body: JSON.stringify({ title: item.data.title }),
          });
        } else if (item.action === 'update') {
          await fetchWithAuth(`/api/chat/sessions/${item.sessionId}`, {
            method: 'PUT',
            body: JSON.stringify({ title: item.data.title }),
          });
        } else if (item.action === 'delete') {
          await fetchWithAuth(`/api/chat/sessions/${item.sessionId}`, {
            method: 'DELETE',
          });
        }
        
        // 同步成功，移除
        const newPending = pending.filter(p => p.sessionId !== item.sessionId);
        savePendingSync(newPending);
      } catch (error) {
        console.error('[useChatHistory] 重试同步失败:', item.sessionId, error);
      }
    }

    // 重试成功后，重新加载会话列表
    setIsOnline(true);
    window.location.reload();
  }, []);

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
    isOnline,
    retrySync,
  };
}
