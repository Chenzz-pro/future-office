/**
 * EKP 流程映射服务 (FlowMappingService)
 * 职责：管理业务类型到 EKP 流程模板的映射关系
 * 
 * 表结构（与 DatabaseManager 保持一致）：
 * - business_type: 业务类型
 * - business_name: 业务名称
 * - keywords: 关键词（逗号分隔）
 * - flow_template_id: 流程模板ID
 * - flow_template_name: 流程模板名称
 * - form_template_id: 表单模板ID
 * - form_template_url: 表单URL
 * - field_mappings: 字段映射（JSON）
 */

import { getFlowMappingRepository } from '@/lib/database';
import type { FlowMappingRow, UpdateFlowMappingParams } from '@/lib/database/repositories/flow-mapping.repository';

// ============================================
// 类型定义
// ============================================

/** 流程映射（服务层） */
export interface FlowMapping {
  id: string;                      // 映射ID
  businessType: string;            // 业务类型（如：leave, expense, trip）
  businessName: string;             // 业务名称（如：请假申请、费用报销）
  keywords: string[];               // 关键词列表（用于AI识别）
  
  // 流程模板
  flowTemplateId?: string;         // EKP流程模板ID
  flowTemplateName?: string;        // EKP流程模板名称
  
  // 表单信息
  formTemplateId?: string;          // EKP表单模板ID
  formTemplateUrl?: string;         // EKP表单URL（iframe嵌入用）
  
  // 字段映射（AI字段名 → EKP字段名）
  fieldMappings?: FieldMapping[];   // 字段映射列表
  
  // 状态
  enabled: boolean;                 // 是否启用
  isSystem: boolean;                 // 是否系统预置
  
  // 审计字段
  createdAt?: Date;
  updatedAt?: Date;
}

/** 字段映射 */
export interface FieldMapping {
  ekpField: string;     // EKP字段名
  localField: string;   // 本地字段名
  label: string;        // 字段标签
  required?: boolean;   // 是否必填
  transform?: string;   // 转换规则
}

/** 创建/更新映射参数 */
export interface FlowMappingParams {
  businessType: string;
  businessName: string;
  keywords?: string[];
  flowTemplateId?: string;
  flowTemplateName?: string;
  formTemplateId?: string;
  formTemplateUrl?: string;
  fieldMappings?: FieldMapping[];
  enabled?: boolean;
}

/** 查询参数 */
export interface FlowMappingQuery {
  keyword?: string;
  enabled?: boolean;
  isSystem?: boolean;
}

// ============================================
// 工具函数
// ============================================

/**
 * 将数据库行转换为服务层 FlowMapping
 */
function parseRow(row: Record<string, unknown>): FlowMapping {
  // 解析 keywords（逗号分隔的字符串）
  let keywords: string[] = [];
  const rawKeywords = row.keywords as string | null;
  if (rawKeywords) {
    keywords = rawKeywords.split(/[,，]/).map(k => k.trim()).filter(k => k);
  }
  
  // 解析 field_mappings（JSON）
  let fieldMappings: FieldMapping[] | undefined;
  const rawFieldMappings = row.field_mappings as string | null;
  if (rawFieldMappings) {
    try {
      const parsed = JSON.parse(rawFieldMappings);
      fieldMappings = parsed.fields || parsed;
    } catch {
      fieldMappings = undefined;
    }
  }
  
  return {
    id: row.id as string,
    businessType: row.business_type as string,
    businessName: row.business_name as string,
    keywords,
    flowTemplateId: (row.flow_template_id as string) || undefined,
    flowTemplateName: (row.flow_template_name as string) || undefined,
    formTemplateId: (row.form_template_id as string) || undefined,
    formTemplateUrl: (row.form_template_url as string) || undefined,
    fieldMappings,
    enabled: (row.enabled as number) === 1,
    isSystem: (row.is_system as number) === 1,
    createdAt: row.created_at ? new Date(row.created_at as string) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at as string) : undefined,
  };
}

// ============================================
// 服务类
// ============================================

export class FlowMappingService {
  private cache: Map<string, FlowMapping> = new Map();
  private cacheTime: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheTime = Date.now();
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

    const repository = getFlowMappingRepository();
    if (!repository) {
      console.error('[FlowMappingService] Repository 未初始化');
      return null;
    }

    try {
      const row = await repository.findByBusinessType(businessType);
      if (!row) {
        // 尝试通过关键词匹配
        return this.findByKeyword(businessType);
      }

      const mapping = parseRow(row as unknown as Record<string, unknown>);
      this.cache.set(businessType, mapping);
      return mapping;
    } catch (error) {
      console.error('[FlowMappingService] getByBusinessType 失败:', error);
      return null;
    }
  }

  /**
   * 通过关键词查找
   */
  async findByKeyword(keyword: string): Promise<FlowMapping | null> {
    const repository = getFlowMappingRepository();
    if (!repository) {
      console.error('[FlowMappingService] Repository 未初始化');
      return null;
    }

    try {
      const mapping = await repository.findByKeyword(keyword);
      if (mapping) {
        const parsed = parseRow(mapping as unknown as Record<string, unknown>);
        this.cache.set(keyword, parsed);
        return parsed;
      }
      return null;
    } catch (error) {
      console.error('[FlowMappingService] findByKeyword 失败:', error);
      return null;
    }
  }

  /**
   * 通过表单模板ID获取
   */
  async getByFormTemplateId(formTemplateId: string): Promise<FlowMapping | null> {
    const repository = getFlowMappingRepository();
    if (!repository) {
      return null;
    }

    try {
      const rows = await repository.findAll();
      const row = rows.find(r => r.form_template_id === formTemplateId);
      if (row) {
        return parseRow(row as unknown as Record<string, unknown>);
      }
      return null;
    } catch (error) {
      console.error('[FlowMappingService] getByFormTemplateId 失败:', error);
      return null;
    }
  }

  /**
   * 获取所有映射
   */
  async getAll(params?: FlowMappingQuery): Promise<FlowMapping[]> {
    const repository = getFlowMappingRepository();
    if (!repository) {
      console.error('[FlowMappingService] Repository 未初始化');
      return [];
    }

    try {
      let rows: FlowMappingRow[];
      
      if (params?.enabled !== undefined) {
        const allRows = await repository.findEnabled();
        rows = params.enabled ? allRows : (await repository.findAll()).filter(r => r.enabled === 0);
      } else {
        rows = await repository.findAll();
      }

      // 过滤系统预置
      if (params?.isSystem !== undefined) {
        rows = rows.filter(r => 
          params.isSystem ? r.is_system === 1 : r.is_system === 0
        );
      }

      // 关键词过滤
      if (params?.keyword) {
        const kw = params.keyword.toLowerCase();
        rows = rows.filter(r =>
          r.business_type.toLowerCase().includes(kw) ||
          r.business_name.toLowerCase().includes(kw) ||
          (r.keywords && r.keywords.toLowerCase().includes(kw))
        );
      }

      return rows.map(row => parseRow(row as unknown as Record<string, unknown>));
    } catch (error) {
      console.error('[FlowMappingService] getAll 失败:', error);
      return [];
    }
  }

  /**
   * 获取所有业务类型（用于下拉选择）
   */
  async getBusinessTypes(): Promise<Array<{ value: string; label: string }>> {
    const mappings = await this.getAll();
    return mappings.map(m => ({
      value: m.businessType,
      label: m.businessName,
    }));
  }

  /**
   * 创建映射
   */
  async create(params: FlowMappingParams, userId?: string): Promise<string> {
    const repository = getFlowMappingRepository();
    if (!repository) {
      throw new Error('Repository 未初始化');
    }

    const id = crypto.randomUUID();
    const keywords = params.keywords?.join(',') || '';
    
    // 序列化 fieldMappings
    let fieldMappingsJson: string | null = null;
    if (params.fieldMappings) {
      fieldMappingsJson = JSON.stringify({ fields: params.fieldMappings });
    }

    await repository.create({
      id,
      business_type: params.businessType,
      business_name: params.businessName,
      keywords,
      flow_template_id: params.flowTemplateId || null,
      flow_template_name: params.flowTemplateName || null,
      form_template_id: params.formTemplateId || null,
      form_template_url: params.formTemplateUrl || null,
      field_mappings: fieldMappingsJson,
      enabled: params.enabled !== false ? 1 : 0,
      is_system: 0,
    });

    // 清除缓存
    this.clearCache();

    return id;
  }

  /**
   * 更新映射
   */
  async update(id: string, params: Partial<FlowMappingParams>): Promise<boolean> {
    const repository = getFlowMappingRepository();
    if (!repository) {
      throw new Error('Repository 未初始化');
    }

    const updates: UpdateFlowMappingParams = {};

    if (params.businessType !== undefined) {
      updates.business_type = params.businessType;
    }
    if (params.businessName !== undefined) {
      updates.business_name = params.businessName;
    }
    if (params.keywords !== undefined) {
      updates.keywords = params.keywords.join(',');
    }
    if (params.flowTemplateId !== undefined) {
      updates.flow_template_id = params.flowTemplateId;
    }
    if (params.flowTemplateName !== undefined) {
      updates.flow_template_name = params.flowTemplateName;
    }
    if (params.formTemplateId !== undefined) {
      updates.form_template_id = params.formTemplateId;
    }
    if (params.formTemplateUrl !== undefined) {
      updates.form_template_url = params.formTemplateUrl;
    }
    if (params.fieldMappings !== undefined) {
      updates.field_mappings = JSON.stringify({ fields: params.fieldMappings });
    }
    if (params.enabled !== undefined) {
      updates.enabled = params.enabled ? 1 : 0;
    }

    await repository.update(id, updates);
    this.clearCache();

    return true;
  }

  /**
   * 删除映射
   */
  async delete(id: string): Promise<boolean> {
    const repository = getFlowMappingRepository();
    if (!repository) {
      throw new Error('Repository 未初始化');
    }

    const result = await repository.delete(id);
    this.clearCache();

    return result;
  }

  /**
   * 获取字段映射
   */
  getFieldMappings(businessType: string): Record<string, string> | null {
    // 尝试从缓存获取
    const mapping = this.cache.get(businessType);
    if (mapping?.fieldMappings) {
      const result: Record<string, string> = {};
      for (const fm of mapping.fieldMappings) {
        result[fm.localField] = fm.ekpField;
      }
      return result;
    }

    // 返回默认映射
    return this.getDefaultFieldMappings(businessType);
  }

  /**
   * 获取默认字段映射
   */
  private getDefaultFieldMappings(businessType: string): Record<string, string> | null {
    const defaults: Record<string, Record<string, string>> = {
      leave: {
        leaveType: 'fd_leave_type',
        startTime: 'fd_start_time',
        endTime: 'fd_end_time',
        reason: 'fd_reason',
      },
      expense: {
        expenseType: 'fd_expense_type',
        amount: 'fd_amount',
        description: 'fd_description',
      },
      trip: {
        destination: 'fd_destination',
        startTime: 'fd_start_time',
        endTime: 'fd_end_time',
        purpose: 'fd_purpose',
      },
    };

    return defaults[businessType] || null;
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
   * 初始化默认映射
   */
  async initDefaultMappings(): Promise<void> {
    const repository = getFlowMappingRepository();
    if (!repository) {
      throw new Error('Repository 未初始化');
    }

    const existing = await repository.findEnabled();
    if (existing.length > 0) {
      console.log('[FlowMappingService] 已有映射数据，跳过初始化');
      return;
    }

    // 创建默认映射
    const defaults = [
      {
        businessType: 'leave',
        businessName: '请假申请',
        keywords: ['请假', '休息', '度假', '年假', '病假', '事假'],
        fieldMappings: [
          { ekpField: 'fd_leave_type', localField: 'leaveType', label: '请假类型' },
          { ekpField: 'fd_start_time', localField: 'startTime', label: '开始时间' },
          { ekpField: 'fd_end_time', localField: 'endTime', label: '结束时间' },
          { ekpField: 'fd_reason', localField: 'reason', label: '请假事由' },
        ],
      },
      {
        businessType: 'expense',
        businessName: '费用报销',
        keywords: ['报销', '费用', '差旅费', '交通费', '餐费'],
        fieldMappings: [
          { ekpField: 'fd_expense_type', localField: 'expenseType', label: '费用类型' },
          { ekpField: 'fd_amount', localField: 'amount', label: '报销金额' },
          { ekpField: 'fd_description', localField: 'description', label: '费用说明' },
        ],
      },
      {
        businessType: 'trip',
        businessName: '出差申请',
        keywords: ['出差', '外出', '公干', '差旅'],
        fieldMappings: [
          { ekpField: 'fd_destination', localField: 'destination', label: '出差地点' },
          { ekpField: 'fd_start_time', localField: 'startTime', label: '开始时间' },
          { ekpField: 'fd_end_time', localField: 'endTime', label: '结束时间' },
          { ekpField: 'fd_purpose', localField: 'purpose', label: '出差目的' },
        ],
      },
    ];

    for (const d of defaults) {
      await this.create(d);
    }

    console.log('[FlowMappingService] 默认映射初始化完成');
  }
}

// ============================================
// 导出单例
// ============================================

export const flowMappingService = new FlowMappingService();
