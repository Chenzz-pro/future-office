/**
 * 流程映射 Repository
 * 提供 ekp_flow_mappings 表的数据访问
 * 
 * 表结构：
 * - id: VARCHAR(36)
 * - business_type: VARCHAR(100) - 业务类型
 * - business_name: VARCHAR(200) - 业务名称
 * - keywords: TEXT - 关键词（逗号分隔）
 * - flow_template_id: VARCHAR(100) - 流程模板ID
 * - flow_template_name: VARCHAR(200) - 流程模板名称
 * - form_template_id: VARCHAR(100) - 表单模板ID
 * - form_template_url: VARCHAR(500) - 表单URL
 * - field_mappings: JSON - 字段映射
 * - enabled: TINYINT(1) - 是否启用
 * - is_system: TINYINT(1) - 是否系统预置
 * - created_at: TIMESTAMP
 * - updated_at: TIMESTAMP
 */

import { RowDataPacket, Pool } from 'mysql2/promise';

/** 数据库行类型 */
export interface FlowMappingRow extends RowDataPacket {
  id: string;
  business_type: string;
  business_name: string;
  keywords: string | null;
  flow_template_id: string | null;
  flow_template_name: string | null;
  form_template_id: string | null;
  form_template_url: string | null;
  field_mappings: string | null;
  enabled: number;
  is_system: number;
  created_at: Date;
  updated_at: Date;
}

/** 创建参数 */
export interface CreateFlowMappingParams {
  id: string;
  business_type: string;
  business_name: string;
  keywords: string | null;
  flow_template_id: string | null;
  flow_template_name: string | null;
  form_template_id: string | null;
  form_template_url: string | null;
  field_mappings: string | null;
  enabled: number;
  is_system: number;
}

/** 更新参数 */
export interface UpdateFlowMappingParams {
  business_type?: string;
  business_name?: string;
  keywords?: string;
  flow_template_id?: string | null;
  flow_template_name?: string | null;
  form_template_id?: string | null;
  form_template_url?: string | null;
  field_mappings?: string | null;
  enabled?: number;
}

export class FlowMappingRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * 获取所有流程映射
   */
  async findAll(): Promise<FlowMappingRow[]> {
    const [rows] = await this.pool.execute<FlowMappingRow[]>(
      'SELECT * FROM ekp_flow_mappings ORDER BY is_system DESC, created_at DESC'
    );
    return rows;
  }

  /**
   * 获取启用的流程映射
   */
  async findEnabled(): Promise<FlowMappingRow[]> {
    const [rows] = await this.pool.execute<FlowMappingRow[]>(
      'SELECT * FROM ekp_flow_mappings WHERE enabled = 1 ORDER BY is_system DESC, created_at DESC'
    );
    return rows;
  }

  /**
   * 根据业务类型获取流程映射
   */
  async findByBusinessType(businessType: string): Promise<FlowMappingRow | null> {
    const [rows] = await this.pool.execute<FlowMappingRow[]>(
      'SELECT * FROM ekp_flow_mappings WHERE business_type = ? AND enabled = 1',
      [businessType]
    );
    return rows[0] || null;
  }

  /**
   * 根据ID获取流程映射
   */
  async findById(id: string): Promise<FlowMappingRow | null> {
    const [rows] = await this.pool.execute<FlowMappingRow[]>(
      'SELECT * FROM ekp_flow_mappings WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  /**
   * 根据关键词匹配业务类型
   */
  async findByKeyword(keyword: string): Promise<FlowMappingRow | null> {
    const mappings = await this.findEnabled();
    
    const lowerKeyword = keyword.toLowerCase();
    
    // 遍历所有映射，检查关键词是否匹配
    for (const mapping of mappings) {
      if (mapping.keywords) {
        const keywords = mapping.keywords.split(/[,，]/).map(k => k.trim().toLowerCase());
        if (keywords.some(k => lowerKeyword.includes(k) || k.includes(lowerKeyword))) {
          return mapping;
        }
      }
      // 也检查业务名称
      if (mapping.business_name.toLowerCase().includes(lowerKeyword)) {
        return mapping;
      }
    }
    
    return null;
  }

  /**
   * 创建流程映射
   */
  async create(params: CreateFlowMappingParams): Promise<void> {
    await this.pool.execute(
      `INSERT INTO ekp_flow_mappings (
        id, business_type, business_name, keywords, flow_template_id,
        flow_template_name, form_template_id, form_template_url,
        field_mappings, enabled, is_system
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        params.id,
        params.business_type,
        params.business_name,
        params.keywords,
        params.flow_template_id,
        params.flow_template_name,
        params.form_template_id,
        params.form_template_url,
        params.field_mappings,
        params.enabled,
        params.is_system,
      ]
    );
  }

  /**
   * 更新流程映射
   */
  async update(id: string, params: UpdateFlowMappingParams): Promise<void> {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (params.business_type !== undefined) {
      fields.push('business_type = ?');
      values.push(params.business_type);
    }
    if (params.business_name !== undefined) {
      fields.push('business_name = ?');
      values.push(params.business_name);
    }
    if (params.keywords !== undefined) {
      fields.push('keywords = ?');
      values.push(params.keywords);
    }
    if (params.flow_template_id !== undefined) {
      fields.push('flow_template_id = ?');
      values.push(params.flow_template_id);
    }
    if (params.flow_template_name !== undefined) {
      fields.push('flow_template_name = ?');
      values.push(params.flow_template_name);
    }
    if (params.form_template_id !== undefined) {
      fields.push('form_template_id = ?');
      values.push(params.form_template_id);
    }
    if (params.form_template_url !== undefined) {
      fields.push('form_template_url = ?');
      values.push(params.form_template_url);
    }
    if (params.field_mappings !== undefined) {
      fields.push('field_mappings = ?');
      values.push(params.field_mappings);
    }
    if (params.enabled !== undefined) {
      fields.push('enabled = ?');
      values.push(params.enabled);
    }

    if (fields.length === 0) {
      return;
    }

    values.push(id);
    await this.pool.execute(
      `UPDATE ekp_flow_mappings SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * 删除流程映射（系统预置不可删除）
   */
  async delete(id: string): Promise<boolean> {
    const [result] = await this.pool.execute(
      'DELETE FROM ekp_flow_mappings WHERE id = ? AND is_system = 0',
      [id]
    );
    return (result as { affectedRows: number }).affectedRows > 0;
  }

  /**
   * 检查表是否存在
   */
  async tableExists(): Promise<boolean> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
      ['ekp_flow_mappings']
    );
    return (rows[0]?.count || 0) > 0;
  }
}
