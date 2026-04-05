// API Keys 数据访问层

import { dbManager } from '../manager';

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  provider: 'openai' | 'claude' | 'deepseek' | 'doubao' | 'custom';
  apiKey: string;
  baseUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ApiKeyRepository {
  /**
   * 创建 API Key
   */
  async create(apiKey: Omit<ApiKey, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = crypto.randomUUID();
    const sql = `
      INSERT INTO api_keys (id, user_id, name, provider, api_key, base_url, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await dbManager.query(sql, [
      id,
      apiKey.userId,
      apiKey.name,
      apiKey.provider,
      apiKey.apiKey,
      apiKey.baseUrl || null,
      apiKey.isActive,
    ]);
    return id;
  }

  /**
   * 根据 ID 查找 API Key
   */
  async findById(id: string): Promise<ApiKey | null> {
    const sql = 'SELECT * FROM api_keys WHERE id = ?';
    const { rows } = await dbManager.query<ApiKey>(sql, [id]);
    return rows[0] || null;
  }

  /**
   * 获取用户的所有 API Keys
   */
  async findByUserId(userId: string): Promise<ApiKey[]> {
    const sql = 'SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC';
    const { rows } = await dbManager.query<ApiKey>(sql, [userId]);
    return rows;
  }

  /**
   * 获取用户激活的 API Keys
   */
  async findActiveByUserId(userId: string): Promise<ApiKey[]> {
    const sql = `
      SELECT * FROM api_keys
      WHERE user_id = ? AND is_active = true
      ORDER BY created_at DESC
    `;
    const { rows } = await dbManager.query<ApiKey>(sql, [userId]);
    return rows;
  }

  /**
   * 根据 provider 查找用户的 API Key
   */
  async findByProvider(userId: string, provider: string): Promise<ApiKey | null> {
    const sql = `
      SELECT * FROM api_keys
      WHERE user_id = ? AND provider = ? AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const { rows } = await dbManager.query<ApiKey>(sql, [userId, provider]);
    return rows[0] || null;
  }

  /**
   * 更新 API Key
   */
  async update(id: string, updates: Partial<Omit<ApiKey, 'id' | 'createdAt'>>): Promise<boolean> {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      params.push(updates.name);
    }
    if (updates.apiKey !== undefined) {
      fields.push('api_key = ?');
      params.push(updates.apiKey);
    }
    if (updates.baseUrl !== undefined) {
      fields.push('base_url = ?');
      params.push(updates.baseUrl);
    }
    if (updates.isActive !== undefined) {
      fields.push('is_active = ?');
      params.push(updates.isActive);
    }

    if (fields.length === 0) return false;

    params.push(id);
    const sql = `UPDATE api_keys SET ${fields.join(', ')} WHERE id = ?`;
    const { affectedRows } = await dbManager.query(sql, params);
    return (affectedRows || 0) > 0;
  }

  /**
   * 删除 API Key
   */
  async delete(id: string): Promise<boolean> {
    const sql = 'DELETE FROM api_keys WHERE id = ?';
    const { affectedRows } = await dbManager.query(sql, [id]);
    return (affectedRows || 0) > 0;
  }
}

export const apiKeyRepository = new ApiKeyRepository();
