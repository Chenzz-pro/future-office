/**
 * EKP 表单服务 (FormService)
 * 职责：获取表单模板、表单字段、自动填充数据
 * 
 * 使用方式：
 * import { formService } from '@/lib/ekp/services/form-service';
 * 
 * // 获取表单字段
 * const fields = await formService.getFormFields('leave_form');
 * 
 * // 格式化AI填表数据
 * const data = formService.formatNaturalLanguage('请假3天', 'leave');
 */

import { flowMappingService, FlowMapping } from './flow-mapping-service';

// ============================================
// 类型定义
// ============================================

/** 表单字段 */
export interface FormField {
  code: string;                    // 字段编码
  name: string;                    // 字段名称（中文）
  type: FieldType;                // 字段类型
  required: boolean;               // 是否必填
  options?: FieldOption[];         // 选项（select/radio/checkbox）
  defaultValue?: unknown;          // 默认值
  minValue?: number;               // 最小值（number/date）
  maxValue?: number;               // 最大值
  placeholder?: string;           // 占位提示
  description?: string;            // 字段描述
  group?: string;                  // 字段分组
  visible: boolean;                // 是否可见
  editable: boolean;               // 是否可编辑
}

/** 字段类型 */
export enum FieldType {
  Text = 'text',                   // 文本输入
  Textarea = 'textarea',           // 多行文本
  Number = 'number',                // 数字
  Date = 'date',                   // 日期
  DateTime = 'datetime',           // 日期时间
  Select = 'select',              // 下拉框
  Radio = 'radio',                // 单选框
  Checkbox = 'checkbox',          // 多选框
  Attachment = 'attachment',     // 附件
  DetailTable = 'detailTable',    // 明细表
  User = 'user',                  // 人员选择
  Org = 'org',                    // 组织选择
  Label = 'label',                // 标签（只读）
  Hidden = 'hidden',              // 隐藏字段
}

/** 字段选项 */
export interface FieldOption {
  value: string;                   // 选项值
  label: string;                   // 选项标签
  disabled?: boolean;              // 是否禁用
}

/** 表单模板 */
export interface FormTemplate {
  id: string;                      // 模板ID
  code: string;                    // 模板编码
  name: string;                   // 模板名称
  url: string;                     // 表单URL
  fields: FormField[];             // 字段列表
  groups?: FormGroup[];            // 字段分组
  actions?: FormAction[];          // 表单操作
  metadata?: Record<string, unknown>; // 元数据
}

/** 表单分组 */
export interface FormGroup {
  id: string;                      // 分组ID
  name: string;                    // 分组名称
  fields: string[];                // 字段编码列表
  order?: number;                  // 排序
}

/** 表单操作 */
export interface FormAction {
  id: string;                      // 操作ID
  name: string;                    // 操作名称
  type: 'submit' | 'save' | 'cancel' | 'custom';
  handler?: string;                // 处理函数名
}

/** 表单数据 */
export interface FormData {
  [fieldCode: string]: unknown;    // 字段编码 -> 值
}

/** 验证结果 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/** 验证错误 */
export interface ValidationError {
  field: string;
  message: string;
}

/** 格式化选项 */
export interface FormatOptions {
  strict?: boolean;                // 严格模式
  fillEmpty?: boolean;             // 填充空值
}

// ============================================
// 表单服务类
// ============================================

export class FormService {
  /**
   * 获取表单模板
   */
  async getTemplate(formCode: string): Promise<FormTemplate | null> {
    try {
      // 先从映射表获取表单信息（通过表单模板ID）
      const mapping = await flowMappingService.getByFormTemplateId(formCode);

      if (!mapping) {
        console.warn('[FormService] 未找到表单配置:', formCode);
        return null;
      }

      // 返回表单基本信息（字段需要通过iframe或API获取）
      return {
        id: mapping.flowTemplateId || formCode,
        code: formCode,
        name: mapping.businessName || formCode,
        url: mapping.formTemplateUrl || '',
        fields: [],
        groups: [],
        actions: [
          { id: 'submit', name: '提交', type: 'submit' },
          { id: 'save', name: '保存', type: 'save' },
          { id: 'cancel', name: '取消', type: 'cancel' },
        ],
      };
    } catch (error) {
      console.error('[FormService] 获取表单模板失败:', error);
      return null;
    }
  }

  /**
   * 根据业务类型获取表单信息
   */
  async getTemplateByBusinessType(businessType: string): Promise<FormTemplate | null> {
    try {
      const mapping = await flowMappingService.getByBusinessType(businessType);

      if (!mapping) {
        return null;
      }

      return {
        id: mapping.flowTemplateId || '',
        code: mapping.formTemplateId || '',
        name: mapping.businessName || businessType,
        url: mapping.formTemplateUrl || '',
        fields: [],
        groups: [],
        actions: [
          { id: 'submit', name: '提交', type: 'submit' },
          { id: 'save', name: '保存', type: 'save' },
        ],
      };
    } catch (error) {
      console.error('[FormService] 根据业务类型获取表单失败:', error);
      return null;
    }
  }

  /**
   * 验证表单数据
   */
  validateForm(formCode: string, data: FormData): ValidationResult {
    const errors: ValidationError[] = [];

    // TODO: 从表单配置或API获取验证规则
    // 目前使用简单的必填检查

    // 获取字段配置
    const fieldMappings = flowMappingService.getFieldMappings(formCode);

    if (fieldMappings) {
      for (const [aiFieldName, ekpFieldName] of Object.entries(fieldMappings)) {
        // 检查必填字段
        if (data[aiFieldName] === undefined || data[aiFieldName] === '') {
          errors.push({
            field: aiFieldName,
            message: `字段 "${aiFieldName}" 不能为空`,
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 将自然语言格式化为表单数据
   * 这是 AI 填表的核心方法
   * 
   * @param naturalLanguage 自然语言描述
   * @param businessType 业务类型
   * @param options 格式化选项
   * @returns 表单数据
   */
  formatNaturalLanguage(
    naturalLanguage: string,
    businessType: string,
    options: FormatOptions = {}
  ): FormData {
    const { strict = false, fillEmpty = true } = options;
    const data: FormData = {};

    // 获取字段映射
    const mapping = flowMappingService.getFieldMappings(businessType);

    if (!mapping) {
      console.warn('[FormService] 未找到字段映射:', businessType);
      return data;
    }

    // 使用 NLP 解析自然语言
    const parsed = this.parseNaturalLanguage(naturalLanguage, businessType);

    // 应用字段映射
    for (const [aiFieldName, value] of Object.entries(parsed)) {
      const ekpFieldName = mapping[aiFieldName];

      if (ekpFieldName) {
        data[ekpFieldName] = this.convertFieldValue(value, aiFieldName, businessType);
      } else if (!strict) {
        // 非严格模式下，保留原始字段名
        data[aiFieldName] = value;
      }
    }

    return data;
  }

  /**
   * 解析自然语言
   * 这是简化版的 NLP，实际使用时可以调用 LLM
   */
  parseNaturalLanguage(text: string, businessType: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    // 转换为小写便于匹配
    const lowerText = text.toLowerCase();

    // 通用字段解析
    if (lowerText.includes('请假') || lowerText.includes('休假')) {
      result['leaveType'] = this.extractLeaveType(text);
      result['days'] = this.extractNumber(text, ['天', '日', 'days', 'days']);
      result['startTime'] = this.extractDate(text, ['开始', '起始', 'from', 'start']);
      result['endTime'] = this.extractDate(text, ['结束', '截至', 'to', 'end']);
      result['reason'] = this.extractReason(text);
    }

    // 报销相关
    if (lowerText.includes('报销')) {
      result['expenseType'] = this.extractExpenseType(text);
      result['amount'] = this.extractNumber(text, ['元', '块', '¥', '元']);
      result['expenseDate'] = this.extractDate(text, ['日期', '时间', 'date']);
      result['description'] = this.extractDescription(text);
    }

    // 采购相关
    if (lowerText.includes('采购')) {
      result['purchaseType'] = this.extractPurchaseType(text);
      result['items'] = this.extractItems(text);
      result['totalAmount'] = this.extractNumber(text, ['元', '块', '¥', '元', '总']);
    }

    return result;
  }

  /**
   * 提取请假类型
   */
  private extractLeaveType(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('事假')) return '01';  // 事假
    if (lowerText.includes('病假')) return '02';  // 病假
    if (lowerText.includes('年假')) return '03';  // 年假
    if (lowerText.includes('婚假')) return '04';  // 婚假
    if (lowerText.includes('产假')) return '05';  // 产假
    if (lowerText.includes('丧假')) return '06';  // 丧假
    if (lowerText.includes('调休')) return '07';  // 调休
    
    return '01'; // 默认事假
  }

  /**
   * 提取数字
   */
  private extractNumber(text: string, keywords: string[]): number | undefined {
    const patterns = [
      /(\d+(?:\.\d+)?)\s*(?:天|日|元|块)/g,  // 中文单位
      /(\d+(?:\.\d+)?)\s*(?:days|days|$)/gi, // 英文
      /(?:共|合计|总|sum|totol)\s*[:：]?\s*(\d+(?:\.\d+)?)/gi,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const num = parseFloat(match[0].match(/\d+(?:\.\d+)?/)?.[0] || '0');
        if (!isNaN(num)) return num;
      }
    }

    return undefined;
  }

  /**
   * 提取日期
   */
  private extractDate(text: string, keywords: string[]): string | undefined {
    // 明天、后天等相对日期
    const lowerText = text.toLowerCase();
    const today = new Date();
    
    if (lowerText.includes('明天') || lowerText.includes('明日')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    
    if (lowerText.includes('后天')) {
      const dayAfter = new Date(today);
      dayAfter.setDate(dayAfter.getDate() + 2);
      return dayAfter.toISOString().split('T')[0];
    }

    if (lowerText.includes('下周')) {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek.toISOString().split('T')[0];
    }

    // 日期格式匹配
    const datePatterns = [
      /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/,  // 2024-01-01 或 2024/01/01
      /(\d{4}年\d{1,2}月\d{1,2}日)/,   // 2024年01月01日
      /(\d{1,2}[-/]\d{1,2}[-/]\d{4})/, // 01-01-2024
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].replace(/\//g, '-');
      }
    }

    // 时间匹配
    const timePatterns = [
      /(\d{1,2}:\d{2})/,  // 09:00
    ];

    for (const pattern of timePatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  /**
   * 提取原因/备注
   */
  private extractReason(text: string): string | undefined {
    // 匹配"原因：xxx"或"因为xxx"等模式
    const patterns = [
      /(?:原因|事由|reason|desc)[:：]\s*(.+?)(?:\s+|$)/i,
      /(?:因为|由于|since)\s*(.+?)(?:\s+|$)/i,
      /原因\s*(.+?)(?:\s+开始|\s+结束|\s+天|$)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * 提取费用类型
   */
  private extractExpenseType(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('差旅')) return '01';  // 差旅费
    if (lowerText.includes('交通')) return '02';  // 交通费
    if (lowerText.includes('餐饮')) return '03';  // 餐饮费
    if (lowerText.includes('办公')) return '04';  // 办公用品
    if (lowerText.includes('招待')) return '05';  // 招待费
    if (lowerText.includes('培训')) return '06';  // 培训费
    
    return '01'; // 默认差旅费
  }

  /**
   * 提取描述
   */
  private extractDescription(text: string): string | undefined {
    const patterns = [
      /(?:说明|描述|详情|description)[:：]\s*(.+?)(?:\s+金额|\s+日期|\s+类型|$)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // 如果没有明确标识，取最后一个数量词后的内容
    const lastMatch = text.match(/(?:[^\d]+){1,5}$/);
    if (lastMatch) {
      return lastMatch[0].trim();
    }

    return undefined;
  }

  /**
   * 提取采购类型
   */
  private extractPurchaseType(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('办公')) return '01';  // 办公用品采购
    if (lowerText.includes('设备')) return '02';  // 设备采购
    if (lowerText.includes('软件')) return '03';  // 软件采购
    if (lowerText.includes('服务')) return '04';  // 服务采购
    
    return '01'; // 默认办公用品
  }

  /**
   * 提取物品列表
   */
  private extractItems(text: string): Array<Record<string, unknown>> {
    // 简化实现，实际需要更复杂的解析
    const items: Array<Record<string, unknown>> = [];
    
    // 匹配"xxx 数量 价格"模式
    const itemPattern = /([^\s\d]+)\s*(\d+)\s*(?:个|件|台|套)?\s*(?:共|¥)?(\d+(?:\.\d+)?)?/g;
    let match;

    while ((match = itemPattern.exec(text)) !== null) {
      items.push({
        name: match[1],
        quantity: parseInt(match[2]),
        price: match[3] ? parseFloat(match[3]) : 0,
      });
    }

    return items;
  }

  /**
   * 转换字段值
   * 根据字段类型进行适当的类型转换
   */
  private convertFieldValue(value: unknown, fieldName: string, businessType: string): unknown {
    if (value === undefined || value === null) {
      return value;
    }

    // 日期类型转换
    if (fieldName.toLowerCase().includes('time') || 
        fieldName.toLowerCase().includes('date')) {
      if (typeof value === 'string' && !value.includes('T')) {
        // 确保日期格式一致
        return value.split(' ')[0]; // 只取日期部分
      }
    }

    // 数字类型转换
    if (fieldName.toLowerCase().includes('amount') || 
        fieldName.toLowerCase().includes('days') ||
        fieldName.toLowerCase().includes('num')) {
      return typeof value === 'string' ? parseFloat(value) : value;
    }

    return value;
  }

  /**
   * 获取表单操作历史
   */
  async getFormHistory(formCode: string, userId: string): Promise<FormData[]> {
    // TODO: 从数据库或EKP获取历史填表数据
    return [];
  }

  /**
   * 保存表单草稿
   */
  async saveDraft(
    formCode: string,
    userId: string,
    data: FormData
  ): Promise<{ success: boolean; draftId?: string }> {
    // TODO: 保存到数据库
    console.log('[FormService] 保存草稿:', { formCode, userId, data });
    return { success: true, draftId: crypto.randomUUID() };
  }

  /**
   * 获取表单草稿
   */
  async getDraft(
    formCode: string,
    userId: string
  ): Promise<FormData | null> {
    // TODO: 从数据库获取
    return null;
  }

  /**
   * 删除表单草稿
   */
  async deleteDraft(formCode: string, userId: string): Promise<boolean> {
    // TODO: 从数据库删除
    return true;
  }
}

// ============================================
// 导出单例
// ============================================

export const formService = new FormService();

// 重新导出类型
export type { FlowMapping } from './flow-mapping-service';
