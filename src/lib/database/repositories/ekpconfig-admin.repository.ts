/**
 * EKP Config Repository
 * 管理蓝凌 EKP 配置的数据访问
 */

import { dbManager } from '../manager';

// System User ID - 用于管理员后台创建的系统级配置
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

export interface EKPConfig {
  id: string;
  userId?: string;
  baseUrl: string;
  username: string;
  password: string;
  apiPath: string;
  serviceId: string;
  leaveTemplateId: string;
  expenseTemplateId: string;
  enabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface EKPConfigRow {
  id: string;
  userId: string;
  baseUrl: string;
  username: string;
  password: string;
  config: string;
  createdAt: Date;
  updatedAt: Date;
}

export class EKPConfigRepository {
  async create(data: Omit<EKPConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = crypto.randomUUID();
    const now = new Date();

    const query = `
      INSERT INTO ekp_configs (id, user_id, ekp_address, username, password, config, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // 将配置信息存储到 JSON 字段中
    const configJson = JSON.stringify({
      apiPath: data.apiPath,
      serviceId: data.serviceId,
      leaveTemplateId: data.leaveTemplateId,
      expenseTemplateId: data.expenseTemplateId,
      enabled: data.enabled,
    });

    await dbManager.query(query, [
      id,
      data.userId || SYSTEM_USER_ID,
      data.baseUrl,
      data.username,
      data.password,
      configJson,
      now,
      now,
    ]);

    return id;
  }

  async findAll(): Promise<EKPConfig[]> {
    const query = `
      SELECT id, user_id as userId, ekp_address as baseUrl, username, password, config, created_at as createdAt, updated_at as updatedAt
      FROM ekp_configs
      ORDER BY created_at DESC
    `;

    const { rows } = await dbManager.query<EKPConfigRow>(query);
    return rows.map(row => this.parseConfig(row));
  }

  async findByUserId(userId: string): Promise<EKPConfig | null> {
    const query = `
      SELECT id, user_id as userId, ekp_address as baseUrl, username, password, config, created_at as createdAt, updated_at as updatedAt
      FROM ekp_configs
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const { rows } = await dbManager.query<EKPConfigRow>(query, [userId]);
    return rows.length > 0 ? this.parseConfig(rows[0]) : null;
  }

  async findById(id: string): Promise<EKPConfig | null> {
    const query = `
      SELECT id, user_id as userId, ekp_address as baseUrl, username, password, config, created_at as createdAt, updated_at as updatedAt
      FROM ekp_configs
      WHERE id = ?
    `;

    const { rows } = await dbManager.query<EKPConfigRow>(query, [id]);
    return rows.length > 0 ? this.parseConfig(rows[0]) : null;
  }

  async findSystemConfig(): Promise<EKPConfig | null> {
    const query = `
      SELECT id, user_id as userId, ekp_address as baseUrl, username, password, config, created_at as createdAt, updated_at as updatedAt
      FROM ekp_configs
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const { rows } = await dbManager.query<EKPConfigRow>(query, [SYSTEM_USER_ID]);
    return rows.length > 0 ? this.parseConfig(rows[0]) : null;
  }

  async update(id: string, data: Partial<EKPConfig>): Promise<boolean> {
    const updates: string[] = [];
    const values: unknown[] = [];

    // 获取现有配置
    const existing = await this.findById(id);
    if (!existing) return false;

    // 合并配置
    const mergedConfig = {
      apiPath: data.apiPath ?? existing.apiPath,
      serviceId: data.serviceId ?? existing.serviceId,
      leaveTemplateId: data.leaveTemplateId ?? existing.leaveTemplateId,
      expenseTemplateId: data.expenseTemplateId ?? existing.expenseTemplateId,
      enabled: data.enabled !== undefined ? data.enabled : existing.enabled,
    };

    if (data.baseUrl !== undefined) {
      updates.push('ekp_address = ?');
      values.push(data.baseUrl);
    }
    if (data.username !== undefined) {
      updates.push('username = ?');
      values.push(data.username);
    }
    if (data.password !== undefined) {
      updates.push('password = ?');
      values.push(data.password);
    }

    // 更新 JSON 配置
    updates.push('config = ?');
    values.push(JSON.stringify(mergedConfig));

    updates.push('updated_at = ?');
    values.push(new Date());
    values.push(id);

    const query = `UPDATE ekp_configs SET ${updates.join(', ')} WHERE id = ?`;
    const { affectedRows } = await dbManager.query(query, values);
    return (affectedRows || 0) > 0;
  }

  async upsert(data: Omit<EKPConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const existing = await this.findSystemConfig();

    if (existing) {
      await this.update(existing.id, data);
      return existing.id;
    } else {
      return await this.create(data);
    }
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM ekp_configs WHERE id = ?';
    const { affectedRows } = await dbManager.query(query, [id]);
    return (affectedRows || 0) > 0;
  }

  private parseConfig(row: EKPConfigRow): EKPConfig {
    const config = typeof row.config === 'string' ? JSON.parse(row.config) : row.config || {};

    return {
      id: row.id,
      userId: row.userId,
      baseUrl: row.baseUrl,
      username: row.username,
      password: row.password,
      apiPath: config.apiPath || '',
      serviceId: config.serviceId || '',
      leaveTemplateId: config.leaveTemplateId || '',
      expenseTemplateId: config.expenseTemplateId || '',
      enabled: config.enabled ?? false,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
