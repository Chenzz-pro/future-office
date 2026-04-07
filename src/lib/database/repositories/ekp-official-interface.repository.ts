/**
 * EKP官方接口Repository
 * 管理蓝凌EKP官方接口的数据访问
 */

import { dbManager } from '../manager';

export interface EKPOfficialInterface {
  id: string;
  interfaceCode: string;
  interfaceName: string;
  interfaceCategory: string;
  apiPath: string;
  serviceId: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE';
  requestTemplate: Record<string, unknown>;
  responseParser: Record<string, unknown>;
  description?: string;
  version: string;
  enabled: boolean;
  isSystem: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
}

export class EKPOfficialInterfaceRepository {
  // 根据代码获取接口
  async findByCode(code: string): Promise<EKPOfficialInterface | null> {
    const query = `
      SELECT * FROM ekp_official_interfaces
      WHERE interface_code = ? AND enabled = TRUE
    `;
    const { rows } = await dbManager.query(query, [code]);
    return rows.length > 0 ? this.parseRow(rows[0]) : null;
  }

  // 获取所有启用的接口
  async findAll(enabled: boolean = true): Promise<EKPOfficialInterface[]> {
    const query = `
      SELECT * FROM ekp_official_interfaces
      WHERE enabled = ?
      ORDER BY interface_category, interface_name
    `;
    const { rows } = await dbManager.query(query, [enabled]);
    return rows.map(row => this.parseRow(row));
  }

  // 获取所有接口（包括禁用的）
  async findAllIncludeDisabled(): Promise<EKPOfficialInterface[]> {
    const query = `
      SELECT * FROM ekp_official_interfaces
      ORDER BY interface_category, interface_name
    `;
    const { rows } = await dbManager.query(query);
    return rows.map(row => this.parseRow(row));
  }

  // 按分类获取接口
  async findByCategory(category: string): Promise<EKPOfficialInterface[]> {
    const query = `
      SELECT * FROM ekp_official_interfaces
      WHERE interface_category = ? AND enabled = TRUE
      ORDER BY interface_name
    `;
    const { rows } = await dbManager.query(query, [category]);
    return rows.map(row => this.parseRow(row));
  }

  // 搜索接口
  async search(keyword: string): Promise<EKPOfficialInterface[]> {
    const query = `
      SELECT * FROM ekp_official_interfaces
      WHERE (interface_code LIKE ? OR interface_name LIKE ? OR description LIKE ?)
        AND enabled = TRUE
      ORDER BY interface_category, interface_name
    `;
    const { rows } = await dbManager.query(query, [
      `%${keyword}%`, `%${keyword}%`, `%${keyword}%`
    ]);
    return rows.map(row => this.parseRow(row));
  }

  // 创建接口
  async create(data: Omit<EKPOfficialInterface, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = crypto.randomUUID();
    const now = new Date();

    const query = `
      INSERT INTO ekp_official_interfaces (
        id, interface_code, interface_name, interface_category,
        api_path, service_id, http_method, request_template,
        response_parser, description, version, enabled, is_system,
        created_at, updated_at, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await dbManager.query(query, [
      id,
      data.interfaceCode,
      data.interfaceName,
      data.interfaceCategory,
      data.apiPath,
      data.serviceId,
      data.httpMethod,
      JSON.stringify(data.requestTemplate),
      JSON.stringify(data.responseParser),
      data.description || null,
      data.version,
      data.enabled,
      data.isSystem,
      now,
      now,
      data.createdBy || null,
      data.updatedBy || null,
    ]);

    return id;
  }

  // 更新接口
  async update(id: string, data: Partial<EKPOfficialInterface>): Promise<boolean> {
    const updates: string[] = [];
    const values: unknown[] = [];

    const fields = [
      'interfaceCode', 'interfaceName', 'interfaceCategory', 'apiPath',
      'serviceId', 'httpMethod', 'description', 'version', 'enabled'
    ];

    fields.forEach(field => {
      if (data[field as keyof EKPOfficialInterface] !== undefined) {
        const dbField = field
          .replace(/([A-Z])/g, '_$1')
          .toLowerCase();
        updates.push(`${dbField} = ?`);
        values.push(data[field as keyof EKPOfficialInterface]);
      }
    });

    if (data.requestTemplate !== undefined) {
      updates.push('request_template = ?');
      values.push(JSON.stringify(data.requestTemplate));
    }

    if (data.responseParser !== undefined) {
      updates.push('response_parser = ?');
      values.push(JSON.stringify(data.responseParser));
    }

    updates.push('updated_at = ?');
    values.push(new Date());

    if (data.updatedBy !== undefined) {
      updates.push('updated_by = ?');
      values.push(data.updatedBy);
    }

    values.push(id);

    const query = `UPDATE ekp_official_interfaces SET ${updates.join(', ')} WHERE id = ?`;
    const result = await dbManager.query(query, values);
    return (result.affectedRows || 0) > 0;
  }

  // 删除接口
  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM ekp_official_interfaces WHERE id = ?';
    const result = await dbManager.query(query, [id]);
    return (result.affectedRows || 0) > 0;
  }

  // 批量获取接口
  async findByCodes(codes: string[]): Promise<Map<string, EKPOfficialInterface>> {
    if (codes.length === 0) return new Map();

    const placeholders = codes.map(() => '?').join(',');
    const query = `
      SELECT * FROM ekp_official_interfaces
      WHERE interface_code IN (${placeholders}) AND enabled = TRUE
    `;
    const { rows } = await dbManager.query(query, codes);
    const map = new Map();
    rows.forEach(row => {
      const config = this.parseRow(row);
      map.set(config.interfaceCode, config);
    });
    return map;
  }

  // 获取分类列表
  async getCategories(): Promise<string[]> {
    const query = `
      SELECT DISTINCT interface_category
      FROM ekp_official_interfaces
      WHERE enabled = TRUE
      ORDER BY interface_category
    `;
    const { rows } = await dbManager.query(query);
    return rows.map((row: any) => row.interface_category);
  }

  // 获取统计信息
  async getStats(): Promise<{
    total: number;
    enabled: number;
    disabled: number;
    byCategory: Record<string, number>;
  }> {
    const query = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN enabled = TRUE THEN 1 ELSE 0 END) as enabled,
        SUM(CASE WHEN enabled = FALSE THEN 1 ELSE 0 END) as disabled
      FROM ekp_official_interfaces
    `;
    const { rows } = await dbManager.query(query);
    const stats = rows[0] as any;

    const categoryQuery = `
      SELECT interface_category, COUNT(*) as count
      FROM ekp_official_interfaces
      WHERE enabled = TRUE
      GROUP BY interface_category
      ORDER BY interface_category
    `;
    const { rows: categoryRows } = await dbManager.query(categoryQuery);
    const byCategory: Record<string, number> = {};
    categoryRows.forEach((row: any) => {
      byCategory[row.interface_category] = row.count;
    });

    return {
      total: stats.total,
      enabled: stats.enabled,
      disabled: stats.disabled,
      byCategory,
    };
  }

  private parseRow(row: any): EKPOfficialInterface {
    return {
      id: row.id,
      interfaceCode: row.interface_code,
      interfaceName: row.interface_name,
      interfaceCategory: row.interface_category,
      apiPath: row.api_path,
      serviceId: row.service_id,
      httpMethod: row.http_method,
      requestTemplate: typeof row.request_template === 'string'
        ? JSON.parse(row.request_template)
        : row.request_template,
      responseParser: typeof row.response_parser === 'string'
        ? JSON.parse(row.response_parser)
        : row.response_parser,
      description: row.description,
      version: row.version,
      enabled: row.enabled,
      isSystem: row.is_system,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    };
  }
}
