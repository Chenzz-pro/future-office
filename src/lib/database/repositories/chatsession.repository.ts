// 对话会话数据访问层

import { dbManager } from '../manager';

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  agentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export class ChatSessionRepository {
  /**
   * 创建对话会话
   */
  async create(session: Omit<ChatSession, 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = session.id || crypto.randomUUID();
    const sql = `
      INSERT INTO chat_sessions (id, user_id, title, agent_id)
      VALUES (?, ?, ?, ?)
    `;
    await dbManager.query(sql, [
      id,
      session.userId,
      session.title,
      session.agentId || null,
    ]);
    return id;
  }

  /**
   * 根据 ID 查找会话
   */
  async findById(id: string): Promise<ChatSession | null> {
    const sql = 'SELECT * FROM chat_sessions WHERE id = ?';
    const { rows } = await dbManager.query<ChatSession>(sql, [id]);
    const row = rows[0];

    if (!row) return null;

    // MySQL 返回下划线命名，转换为 TypeScript 驼峰命名
    return {
      id: (row as any).id as string,
      userId: (row as any).user_id as string,
      title: (row as any).title as string,
      agentId: ((row as any).agent_id === null || (row as any).agent_id === undefined) ? undefined : (row as any).agent_id as string,
      createdAt: (row as any).created_at as Date,
      updatedAt: (row as any).updated_at as Date,
    };
  }

  /**
   * 获取用户的所有会话
   */
  async findByUserId(userId: string, limit: number = 50): Promise<ChatSession[]> {
    const sql = `
      SELECT * FROM chat_sessions
      WHERE user_id = ?
      ORDER BY updated_at DESC
      LIMIT ?
    `;
    const { rows } = await dbManager.query(sql, [userId, limit]);

    // MySQL 返回下划线命名，转换为 TypeScript 驼峰命名
    return (rows as any[]).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      userId: row.user_id as string,
      title: row.title as string,
      agentId: (row.agent_id === null || row.agent_id === undefined) ? undefined : row.agent_id as string,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    }));
  }

  /**
   * 更新会话
   */
  async update(id: string, updates: Partial<Omit<ChatSession, 'id' | 'createdAt'>>): Promise<boolean> {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      params.push(updates.title);
    }
    if (updates.agentId !== undefined) {
      fields.push('agent_id = ?');
      params.push(updates.agentId);
    }

    if (fields.length === 0) return false;

    params.push(id);
    const sql = `UPDATE chat_sessions SET ${fields.join(', ')} WHERE id = ?`;
    const { affectedRows } = await dbManager.query(sql, params);
    return (affectedRows || 0) > 0;
  }

  /**
   * 删除会话（级联删除消息）
   */
  async delete(id: string): Promise<boolean> {
    const sql = 'DELETE FROM chat_sessions WHERE id = ?';
    const { affectedRows } = await dbManager.query(sql, [id]);
    return (affectedRows || 0) > 0;
  }

  /**
   * 获取会话的所有消息
   */
  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    const sql = `
      SELECT * FROM chat_messages
      WHERE session_id = ?
      ORDER BY created_at ASC
    `;
    const { rows } = await dbManager.query(sql, [sessionId]);

    // MySQL 返回下划线命名，转换为 TypeScript 驼峰命名
    return (rows as any[]).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      sessionId: row.session_id as string,
      role: row.role as 'user' | 'assistant' | 'system',
      content: row.content as string,
      metadata: (row.metadata === null || row.metadata === undefined) ? undefined : row.metadata as Record<string, unknown>,
      createdAt: row.created_at as Date,
    }));
  }

  /**
   * 添加消息
   */
  async addMessage(message: Omit<ChatMessage, 'id' | 'createdAt'>): Promise<string> {
    const id = crypto.randomUUID();
    const sql = `
      INSERT INTO chat_messages (id, session_id, role, content, metadata)
      VALUES (?, ?, ?, ?, ?)
    `;
    await dbManager.query(sql, [
      id,
      message.sessionId,
      message.role,
      message.content,
      message.metadata ? JSON.stringify(message.metadata) : null,
    ]);

    // 更新会话的 updated_at
    await dbManager.query('UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
      message.sessionId,
    ]);

    return id;
  }

  /**
   * 删除消息
   */
  async deleteMessage(id: string): Promise<boolean> {
    const sql = 'DELETE FROM chat_messages WHERE id = ?';
    const { affectedRows } = await dbManager.query(sql, [id]);
    return (affectedRows || 0) > 0;
  }
}

export const chatSessionRepository = new ChatSessionRepository();
