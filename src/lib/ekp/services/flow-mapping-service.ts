/**
 * EKP 流程映射服务 (FlowMappingService)
 * 职责：管理业务类型到 EKP 流程模板的映射关系
 * 
 * 这是整个架构的"映射表"核心
 * 用于：业务类型 → 流程模板 → 表单URL → 字段映射
 */

import { dbManager } from '@/lib/database/manager';

// ============================================
// 类型定义
// ============================================

/** 流程映射 */
export interface FlowMapping {
  id: string;                      // 映射ID
  businessType: string;            // 业务类型（唯一，如：leave, expense, purchase）
  businessTypeName: string;         // 业务类型名称（中文，如：请假、报销、采购）
  businessKeywords: string[];       // 关键词列表（用于AI识别）

  // 流程模板
  flowTemplateId?: string;        // EKP流程模板ID
  flowTemplateName?: string;       // EKP流程模板名称
  launchEndpoint?: string;         // 发起流程接口路径

  // 表单信息
  formUrl?: string;               // EKP表单URL（iframe嵌入用）
  formCode?: string;               // 表单编码
  formVersion?: string;            // 表单版本

  // 字段映射（AI字段名 → EKP字段名）
  fieldMappings?: Record<string, string>; // { "leaveType": "fd_leave_type", "days": "fd_days" }

  // 分类
  category?: string;               // 分类（hr/finance/office等）

  // 状态
  enabled: boolean;                // 是否启用
  isSystem: boolean;               // 是否系统预置

  // 审计字段
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

/** 创建/更新映射参数 */
export interface FlowMappingParams {
  businessType: string;
  businessTypeName: string;
  businessKeywords?: string[];
  flowTemplateId?: string;
  flowTemplateName?: string;
  launchEndpoint?: string;
  formUrl?: string;
  formCode?: string;
  formVersion?: string;
  fieldMappings?: Record<string, string>;
  category?: string;
  enabled?: boolean;
}

/** 查询参数 */
export interface FlowMappingQuery {
  keyword?: string;
  category?: string;
  enabled?: boolean;
  isSystem?: boolean;
}

// ============================================
// 流程映射服务
// ============================================

export class FlowMappingService {
  // 内存缓存
  private cache: Map<string, FlowMapping> = new Map();
  private cacheTime: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟

  /**
   * 确保表存在
   */
  async ensureTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS ekp_flow_mappings (
        id VARCHAR(36) PRIMARY KEY COMMENT '映射ID',
        business_type VARCHAR(50) NOT NULL COMMENT '业务类型',
        business_type_name VARCHAR(100) NOT NULL COMMENT '业务类型名称',
        business_keywords JSON COMMENT '关键词列表',
        flow_template_id VARCHAR(100) COMMENT 'EKP流程模板ID',
        flow_template_name VARCHAR(200) COMMENT 'EKP流程模板名称',
        launch_endpoint VARCHAR(500) COMMENT '发起流程接口路径',
        form_url VARCHAR(500) COMMENT 'EKP表单URL',
        form_code VARCHAR(100) COMMENT '表单编码',
        form_version VARCHAR(20) COMMENT '表单版本',
        field_mappings JSON COMMENT '字段映射',
        category VARCHAR(50) COMMENT '分类',
        enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用',
        is_system TINYINT(1) DEFAULT 0 COMMENT '是否系统预置',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by VARCHAR(36) COMMENT '创建人',
        updated_by VARCHAR(36) COMMENT '更新人',
        UNIQUE KEY uk_business_type (business_type),
        INDEX idx_category (category),
        INDEX idx_enabled (enabled)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='EKP流程映射表'
    `;
    await dbManager.query(sql);
  }

  /**
   * 获取映射（按业务类型）
   */
  async getByBusinessType(businessType: string): Promise<FlowMapping | null> {
    // 先检查缓存
    const cached = this.cache.get(businessType);
    if (cached && Date.now() - this.cacheTime < this.CACHE_TTL) {
      return cached;
    }

    await this.ensureTable();

    const sql = `
      SELECT * FROM ekp_flow_mappings 
      WHERE business_type = ? AND enabled = 1
    `;
    const { rows } = await dbManager.query(sql, [businessType]);

    if (rows.length === 0) {
      // 尝试通过关键词匹配
      return this.findByKeyword(businessType);
    }

    const mapping = this.parseRow(rows[0] as Record<string, unknown>);
    this.cache.set(businessType, mapping);
    return mapping;
  }

  /**
   * 通过关键词查找
   */
  async findByKeyword(keyword: string): Promise<FlowMapping | null> {
    await this.ensureTable();

    const lowerKeyword = keyword.toLowerCase();

    const sql = `
      SELECT * FROM ekp_flow_mappings 
      WHERE enabled = 1
    `;
    const { rows } = await dbManager.query(sql);

    for (const row of rows as Record<string, unknown>[]) {
      const mapping = this.parseRow(row);
      
      // 检查关键词列表
      if (mapping.businessKeywords) {
        for (const kw of mapping.businessKeywords) {
          if (lowerKeyword.includes(kw.toLowerCase())) {
            this.cache.set(keyword, mapping);
            return mapping;
          }
        }
      }

      // 检查业务类型名称
      if (mapping.businessTypeName.includes(keyword)) {
        this.cache.set(keyword, mapping);
        return mapping;
      }
    }

    return null;
  }

  /**
   * 通过表单编码获取
   */
  async getByFormCode(formCode: string): Promise<FlowMapping | null> {
    await this.ensureTable();

    const sql = `
      SELECT * FROM ekp_flow_mappings 
      WHERE form_code = ? AND enabled = 1
    `;
    const { rows } = await dbManager.query(sql, [formCode]);

    if (rows.length === 0) {
      return null;
    }

    return this.parseRow(rows[0] as Record<string, unknown>);
  }

  /**
   * 获取所有映射
   */
  async getAll(params?: FlowMappingQuery): Promise<FlowMapping[]> {
    await this.ensureTable();

    let sql = 'SELECT * FROM ekp_flow_mappings WHERE 1=1';
    const queryParams: unknown[] = [];

    if (params?.keyword) {
      sql += ' AND (business_type LIKE ? OR business_type_name LIKE ? OR form_code LIKE ?)';
      const likePattern = `%${params.keyword}%`;
      queryParams.push(likePattern, likePattern, likePattern);
    }

    if (params?.category) {
      sql += ' AND category = ?';
      queryParams.push(params.category);
    }

    if (params?.enabled !== undefined) {
      sql += ' AND enabled = ?';
      queryParams.push(params.enabled ? 1 : 0);
    }

    if (params?.isSystem !== undefined) {
      sql += ' AND is_system = ?';
      queryParams.push(params.isSystem ? 1 : 0);
    }

    sql += ' ORDER BY category, business_type_name';

    const { rows } = await dbManager.query(sql, queryParams);
    return (rows as Record<string, unknown>[]).map(row => this.parseRow(row));
  }

  /**
   * 获取所有业务类型（用于下拉选择）
   */
  async getBusinessTypes(): Promise<Array<{ value: string; label: string; category: string }>> {
    const mappings = await this.getAll();
    return mappings.map(m => ({
      value: m.businessType,
      label: m.businessTypeName,
      category: m.category || 'other',
    }));
  }

  /**
   * 创建映射
   */
  async create(params: FlowMappingParams, userId?: string): Promise<string> {
    await this.ensureTable();

    const id = crypto.randomUUID();
    const sql = `
      INSERT INTO ekp_flow_mappings (
        id, business_type, business_type_name, business_keywords,
        flow_template_id, flow_template_name, launch_endpoint,
        form_url, form_code, form_version, field_mappings,
        category, enabled, is_system, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await dbManager.query(sql, [
      id,
      params.businessType,
      params.businessTypeName,
      JSON.stringify(params.businessKeywords || []),
      params.flowTemplateId || null,
      params.flowTemplateName || null,
      params.launchEndpoint || null,
      params.formUrl || null,
      params.formCode || null,
      params.formVersion || null,
      JSON.stringify(params.fieldMappings || {}),
      params.category || null,
      params.enabled !== false ? 1 : 0,
      0, // is_system
      userId || null,
      userId || null,
    ]);

    // 清除缓存
    this.clearCache();

    return id;
  }

  /**
   * 更新映射
   */
  async update(id: string, params: Partial<FlowMappingParams>, userId?: string): Promise<boolean> {
    await this.ensureTable();

    const updates: string[] = [];
    const values: unknown[] = [];

    if (params.businessType !== undefined) {
      updates.push('business_type = ?');
      values.push(params.businessType);
    }
    if (params.businessTypeName !== undefined) {
      updates.push('business_type_name = ?');
      values.push(params.businessTypeName);
    }
    if (params.businessKeywords !== undefined) {
      updates.push('business_keywords = ?');
      values.push(JSON.stringify(params.businessKeywords));
    }
    if (params.flowTemplateId !== undefined) {
      updates.push('flow_template_id = ?');
      values.push(params.flowTemplateId);
    }
    if (params.flowTemplateName !== undefined) {
      updates.push('flow_template_name = ?');
      values.push(params.flowTemplateName);
    }
    if (params.launchEndpoint !== undefined) {
      updates.push('launch_endpoint = ?');
      values.push(params.launchEndpoint);
    }
    if (params.formUrl !== undefined) {
      updates.push('form_url = ?');
      values.push(params.formUrl);
    }
    if (params.formCode !== undefined) {
      updates.push('form_code = ?');
      values.push(params.formCode);
    }
    if (params.formVersion !== undefined) {
      updates.push('form_version = ?');
      values.push(params.formVersion);
    }
    if (params.fieldMappings !== undefined) {
      updates.push('field_mappings = ?');
      values.push(JSON.stringify(params.fieldMappings));
    }
    if (params.category !== undefined) {
      updates.push('category = ?');
      values.push(params.category);
    }
    if (params.enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(params.enabled ? 1 : 0);
    }

    if (updates.length === 0) {
      return false;
    }

    updates.push('updated_by = ?');
    values.push(userId || null);
    values.push(id);

    const sql = `
      UPDATE ekp_flow_mappings 
      SET ${updates.join(', ')}
      WHERE id = ?
    `;

    const result = await dbManager.query(sql, values);
    
    // 清除缓存
    this.clearCache();

    return (result.affectedRows || 0) > 0;
  }

  /**
   * 删除映射
   */
  async delete(id: string): Promise<boolean> {
    await this.ensureTable();

    const sql = 'DELETE FROM ekp_flow_mappings WHERE id = ? AND is_system = 0';
    const result = await dbManager.query(sql, [id]);

    // 清除缓存
    this.clearCache();

    return (result.affectedRows || 0) > 0;
  }

  /**
   * 获取字段映射
   */
  getFieldMappings(businessType: string): Record<string, string> | null {
    // 尝试从缓存获取
    const mapping = this.cache.get(businessType);
    if (mapping?.fieldMappings) {
      return mapping.fieldMappings;
    }

    // 返回默认映射
    return this.getDefaultFieldMappings(businessType);
  }

  /**
   * 应用字段映射
   * 将 AI 字段名转换为 EKP 字段名
   */
  applyFieldMappings(
    businessType: string,
    data: Record<string, unknown>
  ): Record<string, unknown> {
    const mappings = this.getFieldMappings(businessType);
    
    if (!mappings) {
      return data;
    }

    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      const ekpKey = mappings[key] || key;
      result[ekpKey] = value;
    }

    return result;
  }

  /**
   * 获取分类列表
   */
  async getCategories(): Promise<string[]> {
    await this.ensureTable();

    const sql = `
      SELECT DISTINCT category FROM ekp_flow_mappings 
      WHERE category IS NOT NULL AND category != ''
      ORDER BY category
    `;
    const { rows } = await dbManager.query(sql);

    return (rows as Record<string, unknown>[]).map(row => row.category as string);
  }

  /**
   * 初始化默认映射（系统预置）
   */
  async initDefaultMappings(): Promise<void> {
    await this.ensureTable();

    // 检查是否已有预置数据
    const existing = await this.getAll({ isSystem: true });
    if (existing.length > 0) {
      return;
    }

    const defaultMappings: FlowMappingParams[] = [
      {
        businessType: 'leave',
        businessTypeName: '请假申请',
        businessKeywords: ['请假', '休假', '事假', '病假', '年假'],
        flowTemplateId: '17cba859d4a22f589b8cc4b482bb6898',
        flowTemplateName: '请假申请流程',
        launchEndpoint: '/km/review/restservice/kmReviewRestService/launch',
        formUrl: 'https://oa.fjhxrl.com/km/review/km_review_main/kmReviewMain.do?method=add&fdTemplateId=17cba859d4a22f589b8cc4b482bb6898',
        formCode: 'leave_form',
        fieldMappings: {
          leaveType: 'fd_leave_type',
          startTime: 'fd_start_time',
          endTime: 'fd_end_time',
          days: 'fd_days',
          reason: 'fd_reason',
        },
        category: 'hr',
        enabled: true,
      },
      {
        businessType: 'expense',
        businessTypeName: '费用报销',
        businessKeywords: ['报销', '报销单', '差旅报销'],
        flowTemplateId: '',
        flowTemplateName: '费用报销流程',
        launchEndpoint: '/km/review/restservice/kmReviewRestService/launch',
        formUrl: '',
        formCode: 'expense_form',
        fieldMappings: {
          expenseType: 'fd_expense_type',
          amount: 'fd_amount',
          expenseDate: 'fd_expense_date',
          description: 'fd_description',
        },
        category: 'finance',
        enabled: true,
      },
      {
        businessType: 'purchase',
        businessTypeName: '采购申请',
        businessKeywords: ['采购', '采购单', '物资采购'],
        flowTemplateId: '',
        flowTemplateName: '采购申请流程',
        launchEndpoint: '/km/review/restservice/kmReviewRestService/launch',
        formUrl: '',
        formCode: 'purchase_form',
        fieldMappings: {
          purchaseType: 'fd_purchase_type',
          items: 'fd_items',
          totalAmount: 'fd_total_amount',
          reason: 'fd_reason',
        },
        category: 'finance',
        enabled: true,
      },
    ];

    for (const mapping of defaultMappings) {
      try {
        await this.create({ ...mapping, isSystem: true } as FlowMappingParams);
      } catch (error) {
        console.error('[FlowMappingService] 初始化默认映射失败:', error);
      }
    }
  }

  // ============================================
  // 私有方法
  // ============================================

  /**
   * 解析数据库行
   */
  private parseRow(row: Record<string, unknown>): FlowMapping {
    let businessKeywords: string[] = [];
    if (row.business_keywords) {
      if (typeof row.business_keywords === 'string') {
        try {
          businessKeywords = JSON.parse(row.business_keywords as string);
        } catch {
          businessKeywords = [];
        }
      } else if (Array.isArray(row.business_keywords)) {
        businessKeywords = row.business_keywords;
      }
    }

    let fieldMappings: Record<string, string> = {};
    if (row.field_mappings) {
      if (typeof row.field_mappings === 'string') {
        try {
          fieldMappings = JSON.parse(row.field_mappings as string);
        } catch {
          fieldMappings = {};
        }
      } else if (typeof row.field_mappings === 'object') {
        fieldMappings = row.field_mappings as Record<string, string>;
      }
    }

    return {
      id: row.id as string,
      businessType: row.business_type as string,
      businessTypeName: row.business_type_name as string,
      businessKeywords,
      flowTemplateId: row.flow_template_id as string | undefined,
      flowTemplateName: row.flow_template_name as string | undefined,
      launchEndpoint: row.launch_endpoint as string | undefined,
      formUrl: row.form_url as string | undefined,
      formCode: row.form_code as string | undefined,
      formVersion: row.form_version as string | undefined,
      fieldMappings,
      category: row.category as string | undefined,
      enabled: (row.enabled as number) === 1,
      isSystem: (row.is_system as number) === 1,
      createdAt: row.created_at as string | undefined,
      updatedAt: row.updated_at as string | undefined,
      createdBy: row.created_by as string | undefined,
      updatedBy: row.updated_by as string | undefined,
    };
  }

  /**
   * 清除缓存
   */
  private clearCache(): void {
    this.cache.clear();
    this.cacheTime = Date.now();
  }

  /**
   * 获取默认字段映射
   */
  private getDefaultFieldMappings(businessType: string): Record<string, string> {
    const defaults: Record<string, Record<string, string>> = {
      leave: {
        leaveType: 'fd_leave_type',
        startTime: 'fd_start_time',
        endTime: 'fd_end_time',
        days: 'fd_days',
        reason: 'fd_reason',
      },
      expense: {
        expenseType: 'fd_expense_type',
        amount: 'fd_amount',
        expenseDate: 'fd_expense_date',
        description: 'fd_description',
      },
      purchase: {
        purchaseType: 'fd_purchase_type',
        items: 'fd_items',
        totalAmount: 'fd_total_amount',
        reason: 'fd_reason',
      },
    };

    return defaults[businessType] || {};
  }
}

// ============================================
// 导出单例
// ============================================

export const flowMappingService = new FlowMappingService();
