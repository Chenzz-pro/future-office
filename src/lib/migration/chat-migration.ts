/**
 * 聊天数据迁移工具
 * 将 localStorage 的会话和消息数据迁移到数据库
 */

import { chatSessionRepository, dbManager } from '@/lib/database';

export interface LocalStorageSession {
  id: string;
  title: string;
  preview: string;
  messages: LocalStorageMessage[];
  createdAt: string;
  updatedAt: string;
  model: string;
  provider: string;
  agentId?: string;
}

export interface LocalStorageMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string | Date;
}

/**
 * 从 localStorage 读取会话数据
 */
function loadSessionsFromLocalStorage(): LocalStorageSession[] {
  try {
    const stored = localStorage.getItem('chat-sessions');
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return parsed.map((s: Record<string, unknown>) => ({
      ...s,
      messages: (s.messages as Array<Record<string, unknown>>).map((m: Record<string, unknown>) => ({
        ...m,
        timestamp: new Date(m.timestamp as string),
      })),
    }));
  } catch (error) {
    console.error('[Migration] 读取会话数据失败:', error);
    return [];
  }
}

/**
 * 迁移单个会话及其消息
 */
async function migrateSession(localSession: LocalStorageSession, userId: string): Promise<boolean> {
  try {
    console.log(`[Migration] 开始迁移会话: ${localSession.title}`);

    // 检查会话是否已存在（通过原 ID）
    const existing = await chatSessionRepository.findById(localSession.id);
    if (existing) {
      console.log(`[Migration] 会话已存在，跳过: ${localSession.id}`);
      return true;
    }

    // 创建会话
    await chatSessionRepository.create({
      id: localSession.id,
      userId,
      title: localSession.title,
      agentId: localSession.agentId,
    });

    // 迁移消息
    for (const msg of localSession.messages) {
      await chatSessionRepository.addMessage({
        sessionId: localSession.id,
        role: msg.role,
        content: msg.content,
      });
    }

    console.log(`[Migration] 会话迁移成功: ${localSession.title}`);
    return true;
  } catch (error) {
    console.error(`[Migration] 会话迁移失败: ${localSession.title}`, error);
    return false;
  }
}

/**
 * 执行完整的数据迁移
 */
export async function migrateChatData(userId: string): Promise<{
  success: boolean;
  migratedCount: number;
  failedCount: number;
  message: string;
}> {
  console.log('[Migration] 开始数据迁移...');

  // 检查数据库连接
  if (!dbManager.isConnected()) {
    return {
      success: false,
      migratedCount: 0,
      failedCount: 0,
      message: '数据库未连接，请先配置数据库',
    };
  }

  const sessions = loadSessionsFromLocalStorage();
  console.log(`[Migration] 找到 ${sessions.length} 个会话需要迁移`);

  let migratedCount = 0;
  let failedCount = 0;

  for (const session of sessions) {
    const success = await migrateSession(session, userId);
    if (success) {
      migratedCount++;
    } else {
      failedCount++;
    }
  }

  // 清空 localStorage（可选，仅在全部成功时）
  if (migratedCount > 0 && failedCount === 0) {
    localStorage.removeItem('chat-sessions');
    localStorage.removeItem('chat-sessions-pending');
    console.log('[Migration] 已清空 localStorage 数据');
  }

  const message = `迁移完成：成功 ${migratedCount} 个，失败 ${failedCount} 个`;
  console.log(`[Migration] ${message}`);

  return {
    success: failedCount === 0,
    migratedCount,
    failedCount,
    message,
  };
}

/**
 * 获取迁移预览（不执行实际迁移）
 */
export async function getMigrationPreview(): Promise<{
  totalCount: number;
  totalMessages: number;
  sessions: Array<{
    id: string;
    title: string;
    messageCount: number;
    createdAt: string;
  }>;
}> {
  const sessions = loadSessionsFromLocalStorage();
  
  return {
    totalCount: sessions.length,
    totalMessages: sessions.reduce((sum, s) => sum + s.messages.length, 0),
    sessions: sessions.map(s => ({
      id: s.id,
      title: s.title,
      messageCount: s.messages.length,
      createdAt: s.createdAt,
    })),
  };
}
