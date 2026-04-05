/**
 * API Keys Repository
 * 管理大模型 API 密钥的数据访问
 */

import { dbManager } from '../manager';

export interface ApiKey {
  id: string;
  userId?: string;
  name: string;
  provider: 'openai' | 'claude' | 'deepseek' | 'doubao' | 'custom';
  apiKey: string;
  baseUrl?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ApiKeyRepository {
  async create(data: Omit<ApiKey, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = crypto.randomUUID();
    const now = new Date();

    const query = `
      INSERT INTO api_keys (id, user_id, name, provider, api_key, base_url, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await dbManager.query(query, [
      id,
      data.userId || 'system',
      data.name,
      data.provider,
      data.apiKey,
      data.baseUrl || null,
      data.isActive ? 1 : 0,
      now,
      now,
    ]);

    return id;
  }

  async findAll(): Promise<ApiKey[]> {
    const query = `
      SELECT id, user_id as userId, name, provider, api_key as apiKey, base_url as baseUrl, is_active as isActive, created_at as createdAt, updated_at as updatedAt
      FROM api_keys
      ORDER BY created_at DESC
    `;

    const { rows } = await dbManager.query<ApiKey>(query);
    return rows;
  }

  async findByUserId(userId: string): Promise<ApiKey[]> {
    const query = `
      SELECT id, user_id as userId, name, provider, api_key as apiKey, base_url as baseUrl, is_active as isActive, created_at as createdAt, updated_at as updatedAt
      FROM api_keys
      WHERE user_id = ?
      ORDER BY created_at DESC
    `;

    const { rows } = await dbManager.query<ApiKey>(query, [userId]);
    return rows;
  }

  async findById(id: string): Promise<ApiKey | null> {
    const query = `
      SELECT id, user_id as userId, name, provider, api_key as apiKey, base_url as baseUrl, is_active as isActive, created_at as createdAt, updated_at as updatedAt
      FROM api_keys
      WHERE id = ?
    `;

    const { rows } = await dbManager.query<ApiKey>(query, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  async update(id: string, data: Partial<ApiKey>): Promise<boolean> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.provider !== undefined) {
      updates.push('provider = ?');
      values.push(data.provider);
    }
    if (data.apiKey !== undefined) {
      updates.push('api_key = ?');
      values.push(data.apiKey);
    }
    if (data.baseUrl !== undefined) {
      updates.push('base_url = ?');
      values.push(data.baseUrl);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(data.isActive ? 1 : 0);
    }

    if (updates.length === 0) return false;

    updates.push('updated_at = ?');
    values.push(new Date());
    values.push(id);

    const query = `UPDATE api_keys SET ${updates.join(', ')} WHERE id = ?`;
    const { affectedRows } = await dbManager.query(query, values);
    return (affectedRows || 0) > 0;
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM api_keys WHERE id = ?';
    const { affectedRows } = await dbManager.query(query, [id]);
    return (affectedRows || 0) > 0;
  }
}
