/**
 * EKP官方接口Repository
 * 管理蓝凌EKP官方接口的数据访问
 */

import { dbManager } from '../manager';

export interface EKPOfficialInterface {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  enabled: boolean;
  metadata: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EKPOfficialInterfaceMetadata {
  params?: string[];
  requestTemplate?: Record<string, unknown>;
  responseParser?: Record<string, unknown>;
  version?: string;
  isSystem?: boolean;
}

export class EKPOfficialInterfaceRepository {
  // 根据代码获取接口
  async findByCode(code: string): Promise<EKPOfficialInterface | null> {
    const query = `
      SELECT * FROM ekp_official_interfaces
      WHERE code = ? AND enabled = 1
    `;
    const { rows } = await dbManager.query(query, [code]);
    return rows.length > 0 ? this.parseRow(rows[0]) : null;
  }

  // 获取所有启用的接口
  async findAll(enabled: boolean = true): Promise<EKPOfficialInterface[]> {
    const query = `
      SELECT * FROM ekp_official_interfaces
      WHERE enabled = ?
      ORDER BY category, name
    `;
    const { rows } = await dbManager.query(query, [enabled ? 1 : 0]);
    return rows.map(row => this.parseRow(row));
  }

  // 获取所有接口（包括禁用的）
  async findAllIncludingDisabled(): Promise<EKPOfficialInterface[]> {
    const query = `
      SELECT * FROM ekp_official_interfaces
      ORDER BY category, name
    `;
    const { rows } = await dbManager.query(query);
    return rows.map(row => this.parseRow(row));
  }

  // 获取所有接口（包括禁用的）
  async findAllIncludeDisabled(): Promise<EKPOfficialInterface[]> {
    const query = `
      SELECT * FROM ekp_official_interfaces
      ORDER BY category, name
    `;
    const { rows } = await dbManager.query(query);
    return rows.map(row => this.parseRow(row));
  }

  // 批量查询
  async findByCodes(codes: string[]): Promise<Map<string, EKPOfficialInterface>> {
    if (codes.length === 0) return new Map();

    const placeholders = codes.map(() => '?').join(',');
    const query = `
      SELECT * FROM ekp_official_interfaces
      WHERE code IN (${placeholders})
    `;
    const { rows } = await dbManager.query(query, codes);
    const result = new Map<string, EKPOfficialInterface>();
    for (const row of rows as any[]) {
      const parsed = this.parseRow(row);
      result.set(parsed.code, parsed);
    }
    return result;
  }

  // 根据分类获取接口
  async findByCategory(category: string): Promise<EKPOfficialInterface[]> {
    const query = `
      SELECT * FROM ekp_official_interfaces
      WHERE category = ? AND enabled = 1
      ORDER BY name
    `;
    const { rows } = await dbManager.query(query, [category]);
    return rows.map(row => this.parseRow(row));
  }

  // 搜索接口
  async search(keyword: string): Promise<EKPOfficialInterface[]> {
    const query = `
      SELECT * FROM ekp_official_interfaces
      WHERE code LIKE ? OR name LIKE ? OR description LIKE ?
      ORDER BY category, name
    `;
    const likeKeyword = `%${keyword}%`;
    const { rows } = await dbManager.query(query, [likeKeyword, likeKeyword, likeKeyword]);
    return rows.map(row => this.parseRow(row));
  }

  // 获取所有分类
  async getCategories(): Promise<string[]> {
    const query = `
      SELECT DISTINCT category FROM ekp_official_interfaces
      WHERE enabled = 1
      ORDER BY category
    `;
    const { rows } = await dbManager.query(query);
    return rows.map((row: any) => row.category);
  }

  // 创建接口
  async create(data: Omit<EKPOfficialInterface, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = crypto.randomUUID();
    const query = `
      INSERT INTO ekp_official_interfaces (id, code, name, description, category, endpoint, method, enabled, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await dbManager.query(query, [
      id,
      data.code,
      data.name,
      data.description || null,
      data.category,
      data.endpoint,
      data.method,
      data.enabled ? 1 : 0,
      JSON.stringify(data.metadata),
    ]);
    return id;
  }

  // 更新接口
  async update(id: string, data: Partial<Omit<EKPOfficialInterface, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.code !== undefined) {
      fields.push('code = ?');
      values.push(data.code);
    }
    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description);
    }
    if (data.category !== undefined) {
      fields.push('category = ?');
      values.push(data.category);
    }
    if (data.endpoint !== undefined) {
      fields.push('endpoint = ?');
      values.push(data.endpoint);
    }
    if (data.method !== undefined) {
      fields.push('method = ?');
      values.push(data.method);
    }
    if (data.enabled !== undefined) {
      fields.push('enabled = ?');
      values.push(data.enabled ? 1 : 0);
    }
    if (data.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(JSON.stringify(data.metadata));
    }

    if (fields.length === 0) return;

    values.push(id);
    const query = `
      UPDATE ekp_official_interfaces
      SET ${fields.join(', ')}
      WHERE id = ?
    `;
    await dbManager.query(query, values);
  }

  // 删除接口
  async delete(id: string): Promise<void> {
    const query = `DELETE FROM ekp_official_interfaces WHERE id = ?`;
    await dbManager.query(query, [id]);
  }

  // 切换启用状态
  async toggleEnabled(id: string, enabled: boolean): Promise<void> {
    const query = `
      UPDATE ekp_official_interfaces
      SET enabled = ?
      WHERE id = ?
    `;
    await dbManager.query(query, [enabled ? 1 : 0, id]);
  }

  // 获取统计信息
  async getStats(): Promise<{ total: number; enabled: number; byCategory: Record<string, { total: number; enabled: number }> }> {
    const query = `
      SELECT
        category,
        COUNT(*) as total,
        SUM(enabled) as enabled
      FROM ekp_official_interfaces
      GROUP BY category
      ORDER BY category
    `;
    const { rows } = await dbManager.query(query);

    const byCategory: Record<string, { total: number; enabled: number }> = {};
    let total = 0;
    let enabled = 0;

    for (const row of rows as any[]) {
      byCategory[row.category] = {
        total: row.total,
        enabled: row.enabled,
      };
      total += row.total;
      enabled += row.enabled;
    }

    return { total, enabled, byCategory };
  }

  // 解析行数据
  private parseRow(row: any): EKPOfficialInterface {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      category: row.category,
      endpoint: row.endpoint,
      method: row.method,
      enabled: row.enabled === 1,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    };
  }
}

// 导出单例
export const ekpOfficialInterfaceRepository = new EKPOfficialInterfaceRepository();
