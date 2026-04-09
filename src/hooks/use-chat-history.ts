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
// 返回 null 表示未登录，返回字符串表示用户 ID（sys_org_person.fd_id）
function getCurrentUserId(): string | null {
  const userId = localStorage.getItem('current-user-id');

  console.log('[getCurrentUserId] localStorage 读取:', {
    currentUserId: userId,
  });

  if (!userId) {
    console.error('[getCurrentUserId] 未找到 current-user-id，用户未登录');
    return null; // 返回 null 表示未登录
  }

  // 兼容校验：支持 UUID 格式、MD5/MD4/MD2 格式（31-32位十六进制字符串）
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const mdHashRegex = /^[0-9a-f]{31,32}$/i;
  
  if (!uuidRegex.test(userId) && !mdHashRegex.test(userId)) {
    console.error('[getCurrentUserId] current-user-id 格式无效:', userId);
    // 不直接返回 null，而是尝试从 currentUser 中获取
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      try {
        const user = JSON.parse(currentUser);
        if (user?.id) {
          console.log('[getCurrentUserId] 从 currentUser 中获取到 userId:', user.id);
          return user.id;
        }
      } catch (e) {
        console.error('[getCurrentUserId] 解析 currentUser 失败:', e);
      }
    }
    return null;
  }

  console.log('[getCurrentUserId] 用户 ID 有效:', userId);
  return userId;
}

/**
 * 获取当前用户完整信息
 */
export function getCurrentUser(): {
  userId: string | null;
  deptId: string | null;
  role: string;
  roleId: string | null;
  username: string | null;
  personName: string | null;
  mobile?: string | null;
  rtxAccount?: string | null;
} {
  // 优先从 currentUser 获取完整信息
  const currentUserStr = localStorage.getItem('currentUser');
  if (currentUserStr) {
    try {
      const currentUser = JSON.parse(currentUserStr);
      return {
        userId: currentUser.id || null,
        deptId: currentUser.deptId || null,
        role: currentUser.role?.code || currentUser.role || 'user',
        roleId: currentUser.role?.id || null,
        username: currentUser.username || null,
        personName: currentUser.personName || null,
        mobile: currentUser.mobile || null,
        rtxAccount: currentUser.rtxAccount || null,
      };
    } catch (e) {
      console.error('[getCurrentUser] 解析 currentUser 失败:', e);
    }
  }

  // 降级：从 current-user-id 获取
  const userId = localStorage.getItem('current-user-id');
  return {
    userId: userId || null,
    deptId: null,
    role: 'user',
    roleId: null,
    username: null,
    personName: null,
  };
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

  // 检查是否已登录
  if (!userId) {
    const error = new Error('用户未登录，请先登录');
    console.error('[fetchWithAuth] 用户未登录:', {
      url,
      method: options.method || 'GET',
    });
    throw error;
  }

  console.log('[fetchWithAuth] 发起请求:', {
    url,
    method: options.method || 'GET',
    userId,
    hasBody: !!options.body,
  });

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
    console.error('[fetchWithAuth] 请求失败:', {
      url,
      status: response.status,
      statusText: response.statusText,
      error,
    });
    throw new Error(error.error || '请求失败');
  }

  return response.json();
}

// 数据库持久化版本的对话历史 Hook
export function useChatHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [isOnline, setIsOnline] = useState(true); // 数据库是否可用
  const [userId, setUserId] = useState<string | null>(null); // 当前用户 ID

  // 监听用户登录状态变化
  useEffect(() => {
    const checkUserId = () => {
      const currentUserId = getCurrentUserId();
      console.log('[useChatHistory] 检查用户 ID:', currentUserId);
      setUserId(currentUserId);
    };

    // 立即检查一次
    checkUserId();

    // 监听 localStorage 变化
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'current-user-id') {
        console.log('[useChatHistory] 检测到 current-user-id 变化:', e.newValue);
        checkUserId();
      }
    };

    // 使用定时器定期检查（处理同页面登录的情况）
    const intervalId = setInterval(checkUserId, 1000);

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
    };
  }, []);

  // 加载历史 - 当 userId 变化时重新加载
  useEffect(() => {
    async function loadSessions() {
      // 检查是否已登录
      if (!userId) {
        console.log('[useChatHistory] 用户未登录，跳过加载会话');
        setSessions([]);
        return;
      }

      try {
        const result = await fetchWithAuth('/api/chat/sessions');

        if (result.success) {
          // 转换数据库格式为前端格式
          const dbSessions: ChatSession[] = result.data.map((s: Record<string, unknown>) => {
            // 处理 createdAt 和 updatedAt（可能是字符串或 Date 对象）
            const createdAtValue = s.createdAt;
            const updatedAtValue = s.updatedAt;

            // 转换为 ISO 字符串
            const createdAt = typeof createdAtValue === 'string'
              ? createdAtValue
              : (createdAtValue as Date).toISOString();
            const updatedAt = typeof updatedAtValue === 'string'
              ? updatedAtValue
              : (updatedAtValue as Date).toISOString();

            return {
              id: s.id as string,
              title: s.title as string,
              preview: '', // 需要加载消息后更新
              messages: [],
              createdAt,
              updatedAt,
              model: 'default',
              provider: 'default',
              agentId: s.agentId as string | undefined,
            };
          });

          // 并行加载每个会话的消息
          const sessionsWithMessages = await Promise.all(
            dbSessions.map(async (session) => {
              try {
                const messagesResult = await fetchWithAuth(`/api/chat/sessions/${session.id}/messages`);
                if (messagesResult.success && messagesResult.data.length > 0) {
                  const messages: Message[] = messagesResult.data.map((m: Record<string, unknown>) => {
                    // 处理 createdAt（可能是字符串或 Date 对象）
                    const createdAtValue = m.createdAt;
                    const createdAt = typeof createdAtValue === 'string'
                      ? createdAtValue
                      : (createdAtValue as Date).toISOString();

                    return {
                      id: m.id as string,
                      role: m.role as 'user' | 'assistant' | 'system',
                      content: m.content as string,
                      timestamp: new Date(createdAt),
                    };
                  });

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
                // 如果没有消息，仍然保留会话，只是消息为空
                console.log('[useChatHistory] 会话没有消息，但保留会话:', session.id);
                return {
                  ...session,
                  messages: [],
                  preview: '暂无消息',
                };
              } catch (error) {
                console.error('[useChatHistory] 加载会话消息失败:', session.id, error);
                // 即使加载失败，也保留会话，只是消息为空
                return {
                  ...session,
                  messages: [],
                  preview: '消息加载失败',
                };
              }
            })
          );

          // 不再过滤掉没有消息的会话
          console.log('[useChatHistory] 从数据库加载完成:', {
            total: dbSessions.length,
            valid: sessionsWithMessages.length,
          });

          setSessions(sessionsWithMessages.filter((s): s is ChatSession => s !== null));
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
  }, [userId]); // 当 userId 变化时重新加载

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

  // 添加消息到指定会话
  const addMessage = useCallback(async (sessionId: string, message: Message) => {
    console.log('[addMessage] 开始添加消息到会话:', sessionId, {
      role: message.role,
      content: message.content.substring(0, 50),
    });

    // 先从 sessions 中查找会话
    let session = sessions.find(s => s.id === sessionId);

    // 如果在 sessions 中找不到，尝试从 currentSession 中查找
    if (!session && currentSession?.id === sessionId) {
      console.log('[addMessage] 在 sessions 中未找到，使用 currentSession');
      session = currentSession;
    }

    // 如果还是找不到，创建一个临时会话
    if (!session) {
      console.warn('[addMessage] 会话不存在，创建临时会话:', sessionId);
      session = {
        id: sessionId,
        title: '新对话',
        preview: '',
        messages: [message],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        model: 'default',
        provider: 'default',
      };
      // 添加到 sessions 列表
      const newSessions = [session, ...sessions];
      setSessions(newSessions);
      setCurrentSession(session);
      console.log('[addMessage] 临时会话已创建并添加到 sessions');
    }

    console.log('[addMessage] 找到会话:', session.id, '当前消息数:', session.messages.length);

    const updatedMessages = [...session.messages, message];
    console.log('[addMessage] 更新后的消息数:', updatedMessages.length);

    await updateSession(sessionId, { messages: updatedMessages });
    console.log('[addMessage] 会话已更新');

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
    console.log('[useChatHistory] 开始加载会话:', sessionId);

    // 从 sessions 列表中查找会话
    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      console.log('[useChatHistory] 会话不在列表中，尝试从数据库直接加载');
      // 如果会话不在列表中，尝试从数据库直接加载
      try {
        // 1. 先获取会话信息
        const sessionResult = await fetchWithAuth(`/api/chat/sessions/${sessionId}`);
        if (!sessionResult.success) {
          console.error('[useChatHistory] 加载会话信息失败');
          return;
        }

        const sessionData = sessionResult.data;
        const loadedSession: ChatSession = {
          id: sessionData.id,
          title: sessionData.title,
          preview: '',
          messages: [],
          createdAt: sessionData.createdAt,
          updatedAt: sessionData.updatedAt,
          model: 'default',
          provider: 'default',
        };

        // 2. 加载消息
        const messagesResult = await fetchWithAuth(`/api/chat/sessions/${sessionId}/messages`);
        if (messagesResult.success && messagesResult.data.length > 0) {
          const messages: Message[] = messagesResult.data.map((m: Record<string, unknown>) => {
            // 处理 createdAt（可能是字符串或 Date 对象）
            const createdAtValue = m.createdAt;
            const createdAt = typeof createdAtValue === 'string'
              ? createdAtValue
              : (createdAtValue as Date).toISOString();

            return {
              id: m.id as string,
              role: m.role as 'user' | 'assistant' | 'system',
              content: m.content as string,
              timestamp: new Date(createdAt),
            };
          });

          // 更新预览和标题
          const lastMessage = messages[messages.length - 1];
          loadedSession.preview = lastMessage?.content?.slice(0, 50) || '';
          loadedSession.messages = messages;

          const firstUserMessage = messages.find(m => m.role === 'user');
          if (firstUserMessage) {
            loadedSession.title = firstUserMessage.content.slice(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '');
          }
        }

        setCurrentSession(loadedSession);
        console.log('[useChatHistory] 从数据库直接加载会话成功:', sessionId);
        return;
      } catch (error) {
        console.error('[useChatHistory] 从数据库直接加载会话失败:', error);
        return;
      }
    }

    // 会话在列表中，先设置当前会话
    setCurrentSession(session);

    // 始终从数据库加载最新消息，不管 session.messages 是否为空
    try {
      if (isOnline) {
        const result = await fetchWithAuth(`/api/chat/sessions/${sessionId}/messages`);
        if (result.success) {
          const messages: Message[] = result.data.map((m: Record<string, unknown>) => {
            // 处理 createdAt（可能是字符串或 Date 对象）
            const createdAtValue = m.createdAt;
            const createdAt = typeof createdAtValue === 'string'
              ? createdAtValue
              : (createdAtValue as Date).toISOString();

            return {
              id: m.id as string,
              role: m.role as 'user' | 'assistant' | 'system',
              content: m.content as string,
              timestamp: new Date(createdAt),
            };
          });

          console.log('[useChatHistory] 加载消息成功:', {
            sessionId,
            messageCount: messages.length,
          });

          // 直接更新 currentSession 的消息，避免依赖 updateSession 的异步特性
          const updatedSession = {
            ...session,
            messages,
            preview: messages.length > 0 ? messages[messages.length - 1].content.slice(0, 50) : '',
            updatedAt: new Date().toISOString(),
          };

          setCurrentSession(updatedSession);

          // 同时也更新 sessions 列表中的会话
          const newSessions = sessions.map(s => s.id === sessionId ? updatedSession : s);
          saveToLocal(newSessions);
          setSessions(newSessions);
        }
      }
    } catch (error) {
      console.error('[useChatHistory] 加载消息失败:', error);
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

// 导出 getCurrentUserId 函数供其他组件使用
export { getCurrentUserId };
