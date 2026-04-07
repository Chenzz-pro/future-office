/**
 * 组织架构同步日志 Repository
 */

import { dbManager } from '../manager';

export interface SyncLogDTO {
  id?: string;
  sync_type: 'full' | 'incremental';
  sync_mode?: 'time' | 'org' | 'all';
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  begin_time_stamp?: string;
  end_time_stamp?: string;
  next_time_stamp?: string;
  org_scope?: Record<string, unknown>;
  return_org_type?: Record<string, unknown>;
  triggered_by?: string;
  operator_id?: string;
  operator_name?: string;
  remark?: string;
}

export interface SyncLog {
  id: string;
  sync_type: 'full' | 'incremental';
  sync_mode: 'time' | 'org' | 'all';
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  start_time: Date;
  end_time: Date | null;
  duration_seconds: number | null;
  begin_time_stamp: string | null;
  end_time_stamp: string | null;
  next_time_stamp: string | null;
  org_scope: Record<string, unknown> | null;
  return_org_type: Record<string, unknown> | null;
  total_count: number;
  org_count: number;
  dept_count: number;
  post_count: number;
  group_count: number;
  person_count: number;
  insert_count: number;
  update_count: number;
  delete_count: number;
  error_count: number;
  error_message: string | null;
  error_details: Record<string, unknown> | null;
  triggered_by: string | null;
  operator_id: string | null;
  operator_name: string | null;
  remark: string | null;
  created_at: Date;
  updated_at: Date;
}

export class OrgSyncLogRepository {
  private tableName = 'org_sync_logs';

  /**
   * 创建同步日志
   */
  async create(dto: SyncLogDTO): Promise<string> {
    const id = dto.id || crypto.randomUUID();
    const sql = `
      INSERT INTO ${this.tableName} (
        id, sync_type, sync_mode, status, begin_time_stamp,
        end_time_stamp, next_time_stamp, org_scope, return_org_type,
        triggered_by, operator_id, operator_name, remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await dbManager.query(sql, [
      id,
      dto.sync_type,
      dto.sync_mode || 'all',
      dto.status,
      dto.begin_time_stamp || null,
      dto.end_time_stamp || null,
      dto.next_time_stamp || null,
      dto.org_scope ? JSON.stringify(dto.org_scope) : null,
      dto.return_org_type ? JSON.stringify(dto.return_org_type) : null,
      dto.triggered_by || null,
      dto.operator_id || null,
      dto.operator_name || null,
      dto.remark || null
    ]);

    return id;
  }

  /**
   * 更新同步日志
   */
  async update(id: string, updates: Partial<SyncLogDTO & {
    end_time_stamp?: string;
    next_time_stamp?: string;
    total_count?: number;
    org_count?: number;
    dept_count?: number;
    post_count?: number;
    group_count?: number;
    person_count?: number;
    insert_count?: number;
    update_count?: number;
    delete_count?: number;
    error_count?: number;
    error_message?: string;
    error_details?: Record<string, unknown>;
    duration_seconds?: number;
  }>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }

    if (updates.end_time_stamp !== undefined) {
      fields.push('end_time_stamp = ?');
      values.push(updates.end_time_stamp);
    }

    if (updates.next_time_stamp !== undefined) {
      fields.push('next_time_stamp = ?');
      values.push(updates.next_time_stamp);
    }

    if (updates.total_count !== undefined) {
      fields.push('total_count = ?');
      values.push(updates.total_count);
    }

    if (updates.org_count !== undefined) {
      fields.push('org_count = ?');
      values.push(updates.org_count);
    }

    if (updates.dept_count !== undefined) {
      fields.push('dept_count = ?');
      values.push(updates.dept_count);
    }

    if (updates.post_count !== undefined) {
      fields.push('post_count = ?');
      values.push(updates.post_count);
    }

    if (updates.group_count !== undefined) {
      fields.push('group_count = ?');
      values.push(updates.group_count);
    }

    if (updates.person_count !== undefined) {
      fields.push('person_count = ?');
      values.push(updates.person_count);
    }

    if (updates.insert_count !== undefined) {
      fields.push('insert_count = ?');
      values.push(updates.insert_count);
    }

    if (updates.update_count !== undefined) {
      fields.push('update_count = ?');
      values.push(updates.update_count);
    }

    if (updates.delete_count !== undefined) {
      fields.push('delete_count = ?');
      values.push(updates.delete_count);
    }

    if (updates.error_count !== undefined) {
      fields.push('error_count = ?');
      values.push(updates.error_count);
    }

    if (updates.error_message !== undefined) {
      fields.push('error_message = ?');
      values.push(updates.error_message);
    }

    if (updates.error_details !== undefined) {
      fields.push('error_details = ?');
      values.push(JSON.stringify(updates.error_details));
    }

    if (updates.duration_seconds !== undefined) {
      fields.push('duration_seconds = ?');
      values.push(updates.duration_seconds);
    }

    if (fields.length === 0) {
      return;
    }

    const sql = `UPDATE ${this.tableName} SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);

    await dbManager.query(sql, values);
  }

  /**
   * 根据ID查询
   */
  async findById(id: string): Promise<SyncLog | null> {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    const result = await dbManager.query(sql, [id]);
    const rows = result.rows;
    return rows.length > 0 ? this.mapRowToEntity(rows[0]) : null;
  }

  /**
   * 获取最后一次成功同步
   */
  async getLastSuccessfulSync(): Promise<SyncLog | null> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE status = 'completed'
      ORDER BY end_time DESC
      LIMIT 1
    `;
    const result = await dbManager.query(sql);
    const rows = result.rows;
    return rows.length > 0 ? this.mapRowToEntity(rows[0]) : null;
  }

  /**
   * 获取最后一次同步（无论成功还是失败）
   */
  async getLastSync(): Promise<SyncLog | null> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE status IN ('completed', 'failed', 'cancelled')
      ORDER BY end_time DESC
      LIMIT 1
    `;
    const result = await dbManager.query(sql);
    const rows = result.rows;
    return rows.length > 0 ? this.mapRowToEntity(rows[0]) : null;
  }

  /**
   * 查询正在运行的同步
   */
  async findRunningSync(): Promise<SyncLog | null> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE status = 'running'
      ORDER BY start_time DESC
      LIMIT 1
    `;
    const result = await dbManager.query(sql);
    const rows = result.rows;
    return rows.length > 0 ? this.mapRowToEntity(rows[0]) : null;
  }

  /**
   * 将数据库行映射为实体
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapRowToEntity(row: any): SyncLog {
    return {
      id: row.id,
      sync_type: row.sync_type,
      sync_mode: row.sync_mode,
      status: row.status,
      start_time: new Date(row.start_time),
      end_time: row.end_time ? new Date(row.end_time) : null,
      duration_seconds: row.duration_seconds,
      begin_time_stamp: row.begin_time_stamp,
      end_time_stamp: row.end_time_stamp,
      next_time_stamp: row.next_time_stamp,
      org_scope: row.org_scope ? JSON.parse(row.org_scope) : null,
      return_org_type: row.return_org_type ? JSON.parse(row.return_org_type) : null,
      total_count: row.total_count,
      org_count: row.org_count,
      dept_count: row.dept_count,
      post_count: row.post_count,
      group_count: row.group_count,
      person_count: row.person_count,
      insert_count: row.insert_count,
      update_count: row.update_count,
      delete_count: row.delete_count,
      error_count: row.error_count,
      error_message: row.error_message,
      error_details: row.error_details ? JSON.parse(row.error_details) : null,
      triggered_by: row.triggered_by,
      operator_id: row.operator_id,
      operator_name: row.operator_name,
      remark: row.remark,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
}

// 导出单例
export const orgSyncLogRepository = new OrgSyncLogRepository();
