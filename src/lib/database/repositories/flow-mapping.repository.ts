/**
 * 流程映射 Repository
 * 提供 ekp_flow_mappings 表的数据访问
 */

import { RowDataPacket, Pool } from 'mysql2/promise';

export interface FlowMapping {
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

export interface FlowMappingRow extends FlowMapping, RowDataPacket {}

export class FlowMappingRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * 获取所有流程映射
   */
  async findAll(): Promise<FlowMapping[]> {
    const [rows] = await this.pool.execute<FlowMappingRow[]>(
      'SELECT * FROM ekp_flow_mappings ORDER BY is_system DESC, created_at DESC'
    );
    return rows;
  }

  /**
   * 获取启用的流程映射
   */
  async findEnabled(): Promise<FlowMapping[]> {
    const [rows] = await this.pool.execute<FlowMappingRow[]>(
      'SELECT * FROM ekp_flow_mappings WHERE enabled = 1 ORDER BY is_system DESC, created_at DESC'
    );
    return rows;
  }

  /**
   * 根据业务类型获取流程映射
   */
  async findByBusinessType(businessType: string): Promise<FlowMapping | null> {
    const [rows] = await this.pool.execute<FlowMappingRow[]>(
      'SELECT * FROM ekp_flow_mappings WHERE business_type = ? AND enabled = 1',
      [businessType]
    );
    return rows[0] || null;
  }

  /**
   * 根据ID获取流程映射
   */
  async findById(id: string): Promise<FlowMapping | null> {
    const [rows] = await this.pool.execute<FlowMappingRow[]>(
      'SELECT * FROM ekp_flow_mappings WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  /**
   * 根据关键词匹配业务类型
   */
  async findByKeyword(keyword: string): Promise<FlowMapping | null> {
    const mappings = await this.findEnabled();
    
    // 遍历所有映射，检查关键词是否匹配
    for (const mapping of mappings) {
      if (mapping.keywords) {
        const keywords = mapping.keywords.split(/[,，]/).map(k => k.trim().toLowerCase());
        if (keywords.some(k => keyword.toLowerCase().includes(k) || k.includes(keyword.toLowerCase()))) {
          return mapping;
        }
      }
    }
    
    return null;
  }

  /**
   * 创建流程映射
   */
  async create(mapping: Omit<FlowMapping, 'created_at' | 'updated_at'>): Promise<void> {
    await this.pool.execute(
      `INSERT INTO ekp_flow_mappings (
        id, business_type, business_name, keywords, flow_template_id,
        flow_template_name, form_template_id, form_template_url,
        field_mappings, enabled, is_system
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        mapping.id,
        mapping.business_type,
        mapping.business_name,
        mapping.keywords,
        mapping.flow_template_id,
        mapping.flow_template_name,
        mapping.form_template_id,
        mapping.form_template_url,
        mapping.field_mappings,
        mapping.enabled,
        mapping.is_system
      ]
    );
  }

  /**
   * 更新流程映射
   */
  async update(id: string, mapping: Partial<Omit<FlowMapping, 'id' | 'created_at' | 'updated_at' | 'is_system'>>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (mapping.business_type !== undefined) {
      fields.push('business_type = ?');
      values.push(mapping.business_type);
    }
    if (mapping.business_name !== undefined) {
      fields.push('business_name = ?');
      values.push(mapping.business_name);
    }
    if (mapping.keywords !== undefined) {
      fields.push('keywords = ?');
      values.push(mapping.keywords);
    }
    if (mapping.flow_template_id !== undefined) {
      fields.push('flow_template_id = ?');
      values.push(mapping.flow_template_id);
    }
    if (mapping.flow_template_name !== undefined) {
      fields.push('flow_template_name = ?');
      values.push(mapping.flow_template_name);
    }
    if (mapping.form_template_id !== undefined) {
      fields.push('form_template_id = ?');
      values.push(mapping.form_template_id);
    }
    if (mapping.form_template_url !== undefined) {
      fields.push('form_template_url = ?');
      values.push(mapping.form_template_url);
    }
    if (mapping.field_mappings !== undefined) {
      fields.push('field_mappings = ?');
      values.push(mapping.field_mappings);
    }
    if (mapping.enabled !== undefined) {
      fields.push('enabled = ?');
      values.push(mapping.enabled);
    }

    if (fields.length === 0) {
      return;
    }

    values.push(id);
    await this.pool.execute(
      `UPDATE ekp_flow_mappings SET ${fields.join(', ')} WHERE id = ?`,
      values as (string | number | boolean | null)[]
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

// ============================================
// 类型转换
// ============================================

import type { FlowMapping as ServiceFlowMapping } from '@/lib/ekp/services/flow-mapping-service';

/**
 * 将数据库 FlowMapping 转换为服务层 FlowMapping
 */
export function toServiceFlowMapping(dbMapping: FlowMapping): ServiceFlowMapping {
  return {
    id: dbMapping.id,
    businessType: dbMapping.business_type,
    businessTypeName: dbMapping.business_name,
    businessKeywords: dbMapping.keywords ? dbMapping.keywords.split(/[,，]/).map(k => k.trim()) : [],
    flowTemplateId: dbMapping.flow_template_id || undefined,
    flowTemplateName: dbMapping.flow_template_name || undefined,
    formUrl: dbMapping.form_template_url || undefined,
    formCode: dbMapping.form_template_id || undefined,
    fieldMappings: dbMapping.field_mappings ? JSON.parse(dbMapping.field_mappings) : undefined,
    enabled: dbMapping.enabled === 1,
    isSystem: dbMapping.is_system === 1,
    createdAt: dbMapping.created_at?.toISOString(),
    updatedAt: dbMapping.updated_at?.toISOString(),
  };
}

/**
 * 将服务层 FlowMapping 转换为数据库格式
 */
export function toDbFlowMapping(serviceMapping: Partial<ServiceFlowMapping>): Partial<FlowMapping> {
  const dbMapping: Partial<FlowMapping> = {};

  if (serviceMapping.businessType !== undefined) {
    dbMapping.business_type = serviceMapping.businessType;
  }
  if (serviceMapping.businessTypeName !== undefined) {
    dbMapping.business_name = serviceMapping.businessTypeName;
  }
  if (serviceMapping.businessKeywords !== undefined) {
    dbMapping.keywords = serviceMapping.businessKeywords.join(',');
  }
  if (serviceMapping.flowTemplateId !== undefined) {
    dbMapping.flow_template_id = serviceMapping.flowTemplateId;
  }
  if (serviceMapping.flowTemplateName !== undefined) {
    dbMapping.flow_template_name = serviceMapping.flowTemplateName;
  }
  if (serviceMapping.formUrl !== undefined) {
    dbMapping.form_template_url = serviceMapping.formUrl;
  }
  if (serviceMapping.formCode !== undefined) {
    dbMapping.form_template_id = serviceMapping.formCode;
  }
  if (serviceMapping.fieldMappings !== undefined) {
    dbMapping.field_mappings = JSON.stringify(serviceMapping.fieldMappings);
  }
  if (serviceMapping.enabled !== undefined) {
    dbMapping.enabled = serviceMapping.enabled ? 1 : 0;
  }

  return dbMapping;
}
