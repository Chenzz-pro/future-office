// EKP 配置数据访问层

import { dbManager } from '../manager';

export interface EkpConfig {
  id: string;
  userId: string;
  ekpAddress: string;
  username?: string;
  password?: string;
  authType: 'basic' | 'oauth' | 'none';
  config?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class EkpConfigRepository {
  /**
   * 创建 EKP 配置
   */
  async create(config: Omit<EkpConfig, 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = config.id || crypto.randomUUID();
    const sql = `
      INSERT INTO ekp_configs (id, user_id, ekp_address, username, password, auth_type, config)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await dbManager.query(sql, [
      id,
      config.userId,
      config.ekpAddress,
      config.username || null,
      config.password || null,
      config.authType,
      config.config ? JSON.stringify(config.config) : null,
    ]);
    return id;
  }

  /**
   * 根据 ID 查找配置
   */
  async findById(id: string): Promise<EkpConfig | null> {
    const sql = 'SELECT * FROM ekp_configs WHERE id = ?';
    const { rows } = await dbManager.query<EkpConfig>(sql, [id]);
    return rows[0] ? this.parseJsonFields(rows[0]) : null;
  }

  /**
   * 获取用户的所有 EKP 配置
   */
  async findByUserId(userId: string): Promise<EkpConfig[]> {
    const sql = `
      SELECT * FROM ekp_configs
      WHERE user_id = ?
      ORDER BY created_at DESC
    `;
    const { rows } = await dbManager.query<EkpConfig>(sql, [userId]);
    return rows.map(row => this.parseJsonFields(row));
  }

  /**
   * 更新配置
   */
  async update(id: string, updates: Partial<Omit<EkpConfig, 'id' | 'createdAt'>>): Promise<boolean> {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (updates.ekpAddress !== undefined) {
      fields.push('ekp_address = ?');
      params.push(updates.ekpAddress);
    }
    if (updates.username !== undefined) {
      fields.push('username = ?');
      params.push(updates.username);
    }
    if (updates.password !== undefined) {
      fields.push('password = ?');
      params.push(updates.password);
    }
    if (updates.authType !== undefined) {
      fields.push('auth_type = ?');
      params.push(updates.authType);
    }
    if (updates.config !== undefined) {
      fields.push('config = ?');
      params.push(JSON.stringify(updates.config));
    }

    if (fields.length === 0) return false;

    params.push(id);
    const sql = `UPDATE ekp_configs SET ${fields.join(', ')} WHERE id = ?`;
    const { affectedRows } = await dbManager.query(sql, params);
    return (affectedRows || 0) > 0;
  }

  /**
   * 删除配置
   */
  async delete(id: string): Promise<boolean> {
    const sql = 'DELETE FROM ekp_configs WHERE id = ?';
    const { affectedRows } = await dbManager.query(sql, [id]);
    return (affectedRows || 0) > 0;
  }

  /**
   * 解析 JSON 字段
   */
  private parseJsonFields(config: EkpConfig): EkpConfig {
    return {
      ...config,
      config: config.config && typeof config.config === 'string'
        ? JSON.parse(config.config)
        : config.config,
    };
  }
}

export const ekpConfigRepository = new EkpConfigRepository();
