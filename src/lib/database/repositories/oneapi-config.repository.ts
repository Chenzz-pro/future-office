/**
 * OneAPI配置数据访问层
 * 用于管理oneapi_configs表的数据操作
 */

import { v4 as uuidv4 } from 'uuid';

export interface OneAPIConfig {
  id: string;
  name: string;
  description?: string;
  base_url: string;
  api_key: string;
  model: string;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateOneAPIConfigParams {
  name: string;
  description?: string;
  base_url: string;
  api_key: string;
  model: string;
  enabled?: boolean;
}

export interface UpdateOneAPIConfigParams {
  name?: string;
  description?: string;
  base_url?: string;
  api_key?: string;
  model?: string;
  enabled?: boolean;
}

export class OneAPIConfigRepository {
  private pool: any;

  constructor(pool: any) {
    this.pool = pool;
  }

  /**
   * 创建oneAPI配置
   */
  async create(params: CreateOneAPIConfigParams): Promise<string> {
    const id = uuidv4();
    const {
      name,
      description,
      base_url,
      api_key,
      model,
      enabled = true,
    } = params;

    const sql = `
      INSERT INTO oneapi_configs
      (id, name, description, base_url, api_key, model, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await this.pool.execute(sql, [
      id,
      name,
      description || null,
      base_url,
      api_key,
      model,
      enabled,
    ]);

    return id;
  }

  /**
   * Upsert oneAPI配置（如果名称存在则更新，否则创建）
   */
  async upsert(params: CreateOneAPIConfigParams & { id?: string }): Promise<string> {
    const {
      name,
      description,
      base_url,
      api_key,
      model,
      enabled = true,
      id,
    } = params;

    // 如果提供了ID，使用ID更新
    if (id) {
      await this.update(id, {
        name,
        description,
        base_url,
        api_key,
        model,
        enabled,
      });
      return id;
    }

    // 检查名称是否已存在
    const existing = await this.findByName(name);

    if (existing) {
      // 更新现有配置
      await this.update(existing.id, {
        name,
        description,
        base_url,
        api_key,
        model,
        enabled,
      });
      return existing.id;
    }

    // 创建新配置
    return await this.create(params);
  }

  /**
   * 根据ID获取oneAPI配置
   */
  async findById(id: string): Promise<OneAPIConfig | null> {
    const sql = 'SELECT * FROM oneapi_configs WHERE id = ?';
    const [rows] = await this.pool.execute(sql, [id]);

    if (!rows || rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return this.mapRowToConfig(row);
  }

  /**
   * 根据名称获取oneAPI配置
   */
  async findByName(name: string): Promise<OneAPIConfig | null> {
    const sql = 'SELECT * FROM oneapi_configs WHERE name = ?';
    const [rows] = await this.pool.execute(sql, [name]);

    if (!rows || rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return this.mapRowToConfig(row);
  }

  /**
   * 获取所有oneAPI配置
   */
  async findAll(): Promise<OneAPIConfig[]> {
    const sql = 'SELECT * FROM oneapi_configs ORDER BY created_at DESC';
    const [rows] = await this.pool.execute(sql);

    return rows.map((row: any) => this.mapRowToConfig(row));
  }

  /**
   * 获取启用的oneAPI配置
   */
  async findEnabled(): Promise<OneAPIConfig[]> {
    const sql = 'SELECT * FROM oneapi_configs WHERE enabled = 1 ORDER BY created_at DESC';
    const [rows] = await this.pool.execute(sql);

    return rows.map((row: any) => this.mapRowToConfig(row));
  }

  /**
   * 更新oneAPI配置
   */
  async update(id: string, params: UpdateOneAPIConfigParams): Promise<boolean> {
    const updates: string[] = [];
    const values: any[] = [];

    if (params.name !== undefined) {
      updates.push('name = ?');
      values.push(params.name);
    }
    if (params.description !== undefined) {
      updates.push('description = ?');
      values.push(params.description);
    }
    if (params.base_url !== undefined) {
      updates.push('base_url = ?');
      values.push(params.base_url);
    }
    if (params.api_key !== undefined) {
      updates.push('api_key = ?');
      values.push(params.api_key);
    }
    if (params.model !== undefined) {
      updates.push('model = ?');
      values.push(params.model);
    }
    if (params.enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(params.enabled);
    }

    if (updates.length === 0) {
      return false;
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const sql = `
      UPDATE oneapi_configs
      SET ${updates.join(', ')}
      WHERE id = ?
    `;

    const [result] = await this.pool.execute(sql, values);
    return (result as any).affectedRows > 0;
  }

  /**
   * 删除oneAPI配置
   */
  async delete(id: string): Promise<boolean> {
    const sql = 'DELETE FROM oneapi_configs WHERE id = ?';
    const [result] = await this.pool.execute(sql, [id]);

    return (result as any).affectedRows > 0;
  }

  /**
   * 切换启用状态
   */
  async toggleEnabled(id: string): Promise<boolean> {
    const sql = 'UPDATE oneapi_configs SET enabled = NOT enabled, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const [result] = await this.pool.execute(sql, [id]);

    return (result as any).affectedRows > 0;
  }

  /**
   * 检查表是否存在
   */
  async tableExists(): Promise<boolean> {
    const sql = `
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'oneapi_configs'
    `;

    const [rows] = await this.pool.execute(sql);
    const row = rows[0] as { count: number };
    return row.count > 0;
  }

  /**
   * 创建表
   */
  async createTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS oneapi_configs (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description VARCHAR(500),
        base_url VARCHAR(500) NOT NULL,
        api_key VARCHAR(500) NOT NULL,
        model VARCHAR(100) NOT NULL,
        enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_name (name),
        KEY idx_enabled (enabled),
        KEY idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await this.pool.execute(sql);
  }

  /**
   * 将数据库行映射到OneAPIConfig对象
   */
  private mapRowToConfig(row: any): OneAPIConfig {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      base_url: row.base_url,
      api_key: row.api_key,
      model: row.model,
      enabled: Boolean(row.enabled),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }
}
