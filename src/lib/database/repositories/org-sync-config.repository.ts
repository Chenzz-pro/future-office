/**
 * 组织架构同步配置 Repository
 */

import { dbManager } from '../manager';

export interface SyncConfig {
  id: string;
  config_key: string;
  config_value: string;
  config_type: 'string' | 'number' | 'boolean' | 'json';
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export class OrgSyncConfigRepository {
  private tableName = 'org_sync_config';

  /**
   * 根据key获取配置值
   */
  async getByKey(key: string): Promise<unknown> {
    const sql = `SELECT * FROM ${this.tableName} WHERE config_key = ?`;
    const result = await dbManager.query(sql, [key]);
    const rows = result.rows;

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0] as SyncConfig;
    return this.parseValue(row.config_value, row.config_type);
  }

  /**
   * 获取字符串配置
   */
  async getString(key: string, defaultValue?: string): Promise<string | undefined> {
    const value = await this.getByKey(key);
    return value !== null ? String(value) : defaultValue;
  }

  /**
   * 获取数字配置
   */
  async getNumber(key: string, defaultValue?: number): Promise<number | undefined> {
    const value = await this.getByKey(key);
    return value !== null ? Number(value) : defaultValue;
  }

  /**
   * 获取布尔配置
   */
  async getBoolean(key: string, defaultValue?: boolean): Promise<boolean | undefined> {
    const value = await this.getByKey(key);
    return value !== null ? Boolean(value) : defaultValue;
  }

  /**
   * 获取JSON配置
   */
  async getJSON<T = Record<string, unknown>>(key: string, defaultValue?: T): Promise<T | undefined> {
    const value = await this.getByKey(key);
    return value !== null ? (value as T) : defaultValue;
  }

  /**
   * 设置配置值
   */
  async setKey(key: string, value: unknown, type: 'string' | 'number' | 'boolean' | 'json' = 'string'): Promise<void> {
    const existing = await this.getConfigByKey(key);

    if (existing) {
      // 更新
      const sql = `
        UPDATE ${this.tableName}
        SET config_value = ?, config_type = ?, updated_at = NOW()
        WHERE config_key = ?
      `;
      await dbManager.query(sql, [this.stringifyValue(value, type), type, key]);
    } else {
      // 插入
      const sql = `
        INSERT INTO ${this.tableName} (id, config_key, config_value, config_type, description)
        VALUES (?, ?, ?, ?, ?)
      `;
      await dbManager.query(sql, [
        crypto.randomUUID(),
        key,
        this.stringifyValue(value, type),
        type,
        null
      ]);
    }
  }

  /**
   * 获取配置
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async getConfigByKey(key: string): Promise<any> {
    const sql = `SELECT * FROM ${this.tableName} WHERE config_key = ?`;
    const result = await dbManager.query(sql, [key]);
    const rows = result.rows;
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 解析配置值
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseValue(value: string, type: string): any {
    switch (type) {
      case 'string':
        return value;
      case 'number':
        return Number(value);
      case 'boolean':
        return value === 'true';
      case 'json':
        return JSON.parse(value);
      default:
        return value;
    }
  }

  /**
   * 序列化配置值
   */
  private stringifyValue(value: unknown, type: string): string {
    switch (type) {
      case 'string':
        return String(value);
      case 'number':
        return String(Number(value));
      case 'boolean':
        return String(Boolean(value));
      case 'json':
        return JSON.stringify(value);
      default:
        return String(value);
    }
  }
}

// 导出单例
export const orgSyncConfigRepository = new OrgSyncConfigRepository();
