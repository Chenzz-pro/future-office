/**
 * 组织架构同步令牌 Repository
 */

import { dbManager } from '../manager';

export interface SyncTokenDTO {
  id?: string;
  token_name: string;
  token_value?: string;
  token_type?: 'timestamp' | 'page_token';
}

export interface SyncToken {
  id: string;
  token_name: string;
  token_value: string | null;
  last_sync_time: Date | null;
  token_type: 'timestamp' | 'page_token';
  created_at: Date;
  updated_at: Date;
}

export class OrgSyncTokenRepository {
  private tableName = 'org_sync_tokens';

  /**
   * 根据名称获取令牌
   */
  async getByName(name: string): Promise<SyncToken | null> {
    const sql = `SELECT * FROM ${this.tableName} WHERE token_name = ?`;
    const result = await dbManager.query(sql, [name]);
    const rows = result.rows;
    return rows.length > 0 ? this.mapRowToEntity(rows[0]) : null;
  }

  /**
   * 设置令牌值
   */
  async setValue(name: string, value: string | null): Promise<void> {
    const existing = await this.getByName(name);

    if (existing) {
      const sql = `
        UPDATE ${this.tableName}
        SET token_value = ?, last_sync_time = NOW(), updated_at = NOW()
        WHERE token_name = ?
      `;
      await dbManager.query(sql, [value, name]);
    } else {
      const sql = `
        INSERT INTO ${this.tableName} (id, token_name, token_value, token_type)
        VALUES (?, ?, ?, 'timestamp')
      `;
      await dbManager.query(sql, [crypto.randomUUID(), name, value]);
    }
  }

  /**
   * 获取时间戳令牌
   */
  async getTimestampToken(name: string = 'last_sync_timestamp'): Promise<string | null> {
    const token = await this.getByName(name);
    return token?.token_value || null;
  }

  /**
   * 设置时间戳令牌
   */
  async setTimestampToken(timestamp: string, name: string = 'last_sync_timestamp'): Promise<void> {
    await this.setValue(name, timestamp);
  }

  /**
   * 获取分页令牌
   */
  async getPageToken(name: string = 'current_page_token'): Promise<string | null> {
    const token = await this.getByName(name);
    return token?.token_value || null;
  }

  /**
   * 设置分页令牌
   */
  async setPageToken(token: string | null, name: string = 'current_page_token'): Promise<void> {
    await this.setValue(name, token);
  }

  /**
   * 清空令牌
   */
  async clear(name: string): Promise<void> {
    await this.setValue(name, null);
  }

  /**
   * 将数据库行映射为实体
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapRowToEntity(row: any): SyncToken {
    return {
      id: row.id,
      token_name: row.token_name,
      token_value: row.token_value,
      last_sync_time: row.last_sync_time ? new Date(row.last_sync_time) : null,
      token_type: row.token_type,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
}

// 导出单例
export const orgSyncTokenRepository = new OrgSyncTokenRepository();
