/**
 * 组织架构同步明细 Repository
 */

import { dbManager } from '../manager';

export interface SyncDetailDTO {
  sync_log_id: string;
  data_type: 'org' | 'dept' | 'group' | 'post' | 'person';
  action: 'insert' | 'update' | 'delete' | 'skip' | 'error';
  ekp_id: string;
  ekp_lunid?: string;
  local_id?: string;
  ekp_name?: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  error_message?: string;
  error_code?: string;
  batch_no?: number;
  is_processed?: boolean;
}

export interface SyncDetail {
  id: string;
  sync_log_id: string;
  data_type: 'org' | 'dept' | 'group' | 'post' | 'person';
  action: 'insert' | 'update' | 'delete' | 'skip' | 'error';
  ekp_id: string;
  ekp_lunid: string | null;
  local_id: string | null;
  ekp_name: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  error_message: string | null;
  error_code: string | null;
  batch_no: number | null;
  is_processed: boolean;
  created_at: Date;
}

export class OrgSyncDetailRepository {
  private tableName = 'org_sync_details';

  /**
   * 批量插入同步明细
   */
  async batchInsert(details: SyncDetailDTO[]): Promise<void> {
    if (details.length === 0) {
      return;
    }

    const sql = `
      INSERT INTO ${this.tableName} (
        id, sync_log_id, data_type, action, ekp_id, ekp_lunid,
        local_id, ekp_name, old_data, new_data, error_message,
        error_code, batch_no, is_processed
      ) VALUES ?
    `;

    const values = details.map((detail) => [
      crypto.randomUUID(),
      detail.sync_log_id,
      detail.data_type,
      detail.action,
      detail.ekp_id,
      detail.ekp_lunid || null,
      detail.local_id || null,
      detail.ekp_name || null,
      detail.old_data ? JSON.stringify(detail.old_data) : null,
      detail.new_data ? JSON.stringify(detail.new_data) : null,
      detail.error_message || null,
      detail.error_code || null,
      detail.batch_no || null,
      detail.is_processed ?? true
    ]);

    await dbManager.query(sql, [values]);
  }

  /**
   * 根据同步日志ID查询明细
   */
  async findBySyncLogId(syncLogId: string): Promise<SyncDetail[]> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE sync_log_id = ?
      ORDER BY created_at DESC
    `;
    const result = await dbManager.query(sql, [syncLogId]);
    const rows = result.rows;
    return rows.map((row: unknown) => this.mapRowToEntity(row));
  }

  /**
   * 统计同步明细
   */
  async getStatsBySyncLogId(syncLogId: string): Promise<{
    insert: number;
    update: number;
    delete: number;
    skip: number;
    error: number;
    byType: Record<string, Record<string, number>>;
  }> {
    const sql = `
      SELECT action, data_type, COUNT(*) as count
      FROM ${this.tableName}
      WHERE sync_log_id = ?
      GROUP BY action, data_type
    `;
    const result = await dbManager.query(sql, [syncLogId]);
    const rows = result.rows;

    const stats = {
      insert: 0,
      update: 0,
      delete: 0,
      skip: 0,
      error: 0,
      byType: {
        org: { insert: 0, update: 0, delete: 0, skip: 0, error: 0 },
        dept: { insert: 0, update: 0, delete: 0, skip: 0, error: 0 },
        group: { insert: 0, update: 0, delete: 0, skip: 0, error: 0 },
        post: { insert: 0, update: 0, delete: 0, skip: 0, error: 0 },
        person: { insert: 0, update: 0, delete: 0, skip: 0, error: 0 }
      }
    };

    for (const row of rows) {
      const action = row.action;
      const dataType = row.data_type;
      const count = Number(row.count);

      stats[action] += count;
      if (stats.byType[dataType]) {
        stats.byType[dataType][action] += count;
      }
    }

    return stats;
  }

  /**
   * 将数据库行映射为实体
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapRowToEntity(row: any): SyncDetail {
    return {
      id: row.id,
      sync_log_id: row.sync_log_id,
      data_type: row.data_type,
      action: row.action,
      ekp_id: row.ekp_id,
      ekp_lunid: row.ekp_lunid,
      local_id: row.local_id,
      ekp_name: row.ekp_name,
      old_data: row.old_data ? JSON.parse(row.old_data) : null,
      new_data: row.new_data ? JSON.parse(row.new_data) : null,
      error_message: row.error_message,
      error_code: row.error_code,
      batch_no: row.batch_no,
      is_processed: !!row.is_processed,
      created_at: new Date(row.created_at)
    };
  }
}

// 导出单例
export const orgSyncDetailRepository = new OrgSyncDetailRepository();
