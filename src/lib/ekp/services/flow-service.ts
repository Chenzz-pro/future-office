/**
 * EKP 流程服务 (FlowService)
 * 职责：查询流程模板、发起流程、查询进度、撤回/取消
 * 
 * 使用方式：
 * import { flowService } from '@/lib/ekp/services/flow-service';
 * 
 * // 通过业务类型发起流程
 * const result = await flowService.launchByType(userId, 'leave', formData);
 * 
 * // 查询流程模板
 * const templates = await flowService.getTemplates({ category: 'hr' });
 */

import { callEKPInterface } from '@/lib/ekp-client';
import { flowMappingService } from './flow-mapping-service';

// ============================================
// 类型定义
// ============================================

/** 流程模板 */
export interface FlowTemplate {
  id: string;                      // 模板ID
  name: string;                     // 模板名称
  code?: string;                    // 模板编码
  category?: string;                // 分类
  description?: string;             // 描述
  formUrl?: string;                 // 表单URL
  formCode?: string;                // 表单编码
  icon?: string;                    // 图标
  enabled: boolean;                 // 是否启用
  createdAt?: string;               // 创建时间
  updatedAt?: string;               // 更新时间
}

/** 流程实例 */
export interface FlowInstance {
  id: string;                       // 实例ID
  subject: string;                  // 主题
  templateId: string;               // 模板ID
  templateName: string;              // 模板名称
  status: FlowStatus;                // 状态
  createTime: string;                // 创建时间
  completeTime?: string;            // 完成时间
  creatorId: string;                // 创建人ID
  creatorName: string;               // 创建人姓名
  currentNode?: string;             // 当前节点
  progress?: number;                // 进度百分比
}

/** 流程状态 */
export enum FlowStatus {
  Draft = 'draft',                  // 草稿
  Running = 'running',               // 运行中
  Completed = 'completed',           // 已完成
  Cancelled = 'cancelled',           // 已取消
  Terminated = 'terminated',         // 已终止
}

/** 流程节点 */
export interface FlowNode {
  id: string;                       // 节点ID
  name: string;                     // 节点名称
  type: string;                     // 节点类型（开始、审批、抄送、结束）
  assigneeId?: string;              // 处理人ID
  assigneeName?: string;             // 处理人姓名
  status: 'pending' | 'approved' | 'rejected' | 'current'; // 状态
  startTime?: string;               // 开始时间
  endTime?: string;                 // 结束时间
  opinion?: string;                 // 审批意见
}

/** 流程进度 */
export interface FlowProgress {
  instanceId: string;               // 实例ID
  subject: string;                   // 主题
  status: FlowStatus;                // 状态
  nodes: FlowNode[];                  // 流程节点列表
  progress: number;                  // 进度百分比
}

/** 发起流程参数 */
export interface LaunchParams {
  userId: string;
  templateId?: string;
  businessType?: string;
  formValues: Record<string, unknown>;
  draft?: boolean;
}

/** 操作结果 */
export interface FlowOperationResult {
  success: boolean;
  message: string;
  instanceId?: string;
  data?: Record<string, unknown>;
}

/** 查询参数 */
export interface QueryFlowParams {
  userId: string;
  status?: FlowStatus;
  templateId?: string;
  keyword?: string;
  startDate?: string;
  endDate?: string;
  pageIndex?: number;
  pageSize?: number;
}

// ============================================
// 流程服务类
// ============================================

export class FlowService {
  /**
   * 获取流程模板列表
   */
  async getTemplates(params?: {
    category?: string;
    keyword?: string;
    pageIndex?: number;
    pageSize?: number;
  }): Promise<FlowTemplate[]> {
    try {
      const { category, keyword, pageIndex = 1, pageSize = 20 } = params || {};

      const requestBody: Record<string, unknown> = {
        pageIndex,
        pageSize,
      };

      if (category) {
        requestBody.category = category;
      }

      if (keyword) {
        requestBody.keyword = keyword;
      }

      const result = await callEKPInterface('ekp.flow.getTemplates', requestBody);

      if (result.success && result.data) {
        const data = result.data as { returnState?: number; message?: FlowTemplate[] | string };

        if (data.returnState === 2) {
          if (Array.isArray(data.message)) {
            return this.mapTemplates(data.message);
          }
          // 尝试解析字符串
          if (typeof data.message === 'string') {
            try {
              const parsed = JSON.parse(data.message);
              if (Array.isArray(parsed)) {
                return this.mapTemplates(parsed);
              }
            } catch {
              // 解析失败
            }
          }
        }
      }

      return [];
    } catch (error) {
      console.error('[FlowService] 获取流程模板列表失败:', error);
      return [];
    }
  }

  /**
   * 根据业务类型获取流程模板
   * 通过流程映射表查找
   */
  async getTemplateByBusinessType(businessType: string): Promise<FlowTemplate | null> {
    try {
      // 先从映射表获取
      const mapping = await flowMappingService.getByBusinessType(businessType);

      if (mapping && mapping.flowTemplateId) {
        // 如果映射表有模板ID，查询模板详情
        const template = await this.getTemplateById(mapping.flowTemplateId);
        if (template) {
          // 合并映射表的表单信息
          return {
            ...template,
            formUrl: mapping.formTemplateUrl || template.formUrl,
            formCode: mapping.formTemplateId || template.formCode,
          };
        }
      }

      // 如果映射表没有，通过模板名称搜索
      const templates = await this.getTemplates({ keyword: businessType });
      return templates.length > 0 ? templates[0] : null;
    } catch (error) {
      console.error('[FlowService] 根据业务类型获取模板失败:', error);
      return null;
    }
  }

  /**
   * 根据ID获取流程模板
   */
  async getTemplateById(templateId: string): Promise<FlowTemplate | null> {
    try {
      const result = await callEKPInterface('ekp.flow.getTemplate', {
        templateId,
      });

      if (result.success && result.data) {
        const data = result.data as { returnState?: number; message?: FlowTemplate };
        if (data.returnState === 2 && data.message) {
          return this.mapTemplate(data.message);
        }
      }

      return null;
    } catch (error) {
      console.error('[FlowService] 获取流程模板详情失败:', error);
      return null;
    }
  }

  /**
   * 发起流程（通过模板ID）
   */
  async launch(userId: string, templateId: string, formValues: Record<string, unknown>): Promise<FlowOperationResult> {
    try {
      const result = await callEKPInterface('ekp.flow.launch', {
        authAreaId: userId,
        templateId,
        formValues,
      });

      if (result.success && result.data) {
        const data = result.data as { returnState?: number; message?: string; instanceId?: string };

        if (data.returnState === 2) {
          return {
            success: true,
            message: data.message || '流程发起成功',
            instanceId: data.instanceId,
          };
        } else {
          return {
            success: false,
            message: data.message || '流程发起失败',
          };
        }
      }

      return {
        success: false,
        message: '流程发起失败',
      };
    } catch (error) {
      console.error('[FlowService] 发起流程失败:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '流程发起失败',
      };
    }
  }

  /**
   * 根据业务类型发起流程
   * 自动从映射表获取模板ID
   */
  async launchByType(userId: string, businessType: string, formValues: Record<string, unknown>): Promise<FlowOperationResult> {
    try {
      // 获取映射
      const mapping = await flowMappingService.getByBusinessType(businessType);

      if (!mapping) {
        return {
          success: false,
          message: `未找到业务类型 "${businessType}" 的流程配置`,
        };
      }

      if (!mapping.flowTemplateId) {
        return {
          success: false,
          message: `业务类型 "${businessType}" 未配置流程模板`,
        };
      }

      // 应用字段映射
      const mappedFormValues = flowMappingService.applyFieldMappings(
        businessType,
        formValues
      );

      // 发起流程
      return await this.launch(userId, mapping.flowTemplateId, mappedFormValues);
    } catch (error) {
      console.error('[FlowService] 根据业务类型发起流程失败:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '流程发起失败',
      };
    }
  }

  /**
   * 查询我发起的流程
   */
  async getMyStarted(params: QueryFlowParams): Promise<FlowInstance[]> {
    try {
      const {
        userId,
        status,
        templateId,
        keyword,
        startDate,
        endDate,
        pageIndex = 1,
        pageSize = 20,
      } = params;

      const requestBody: Record<string, unknown> = {
        authAreaId: userId,
        pageIndex,
        pageSize,
      };

      if (status) {
        requestBody.status = status;
      }

      if (templateId) {
        requestBody.templateId = templateId;
      }

      if (keyword) {
        requestBody.keyword = keyword;
      }

      if (startDate) {
        requestBody.startDate = startDate;
      }

      if (endDate) {
        requestBody.endDate = endDate;
      }

      const result = await callEKPInterface('ekp.flow.getMyStarted', requestBody);

      if (result.success && result.data) {
        const data = result.data as { returnState?: number; message?: FlowInstance[] | string };

        if (data.returnState === 2) {
          if (Array.isArray(data.message)) {
            return this.mapInstances(data.message);
          }
          if (typeof data.message === 'string') {
            try {
              const parsed = JSON.parse(data.message);
              if (Array.isArray(parsed)) {
                return this.mapInstances(parsed);
              }
            } catch {
              // 解析失败
            }
          }
        }
      }

      return [];
    } catch (error) {
      console.error('[FlowService] 查询我发起的流程失败:', error);
      return [];
    }
  }

  /**
   * 查询流程进度
   */
  async getProgress(instanceId: string): Promise<FlowProgress | null> {
    try {
      const result = await callEKPInterface('ekp.flow.getProgress', {
        instanceId,
      });

      if (result.success && result.data) {
        const data = result.data as { returnState?: number; message?: FlowProgress };

        if (data.returnState === 2 && data.message) {
          return this.mapProgress(data.message);
        }
      }

      return null;
    } catch (error) {
      console.error('[FlowService] 查询流程进度失败:', error);
      return null;
    }
  }

  /**
   * 撤回流程
   */
  async retract(instanceId: string, userId: string): Promise<FlowOperationResult> {
    try {
      const result = await callEKPInterface('ekp.flow.retract', {
        authAreaId: userId,
        instanceId,
      });

      if (result.success && result.data) {
        const data = result.data as { returnState?: number; message?: string };

        if (data.returnState === 2) {
          return {
            success: true,
            message: data.message || '撤回成功',
          };
        } else {
          return {
            success: false,
            message: data.message || '撤回失败',
          };
        }
      }

      return {
        success: false,
        message: '撤回失败',
      };
    } catch (error) {
      console.error('[FlowService] 撤回流程失败:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '撤回失败',
      };
    }
  }

  /**
   * 取消流程
   */
  async cancel(instanceId: string, userId: string, reason: string): Promise<FlowOperationResult> {
    try {
      const result = await callEKPInterface('ekp.flow.cancel', {
        authAreaId: userId,
        instanceId,
        reason,
      });

      if (result.success && result.data) {
        const data = result.data as { returnState?: number; message?: string };

        if (data.returnState === 2) {
          return {
            success: true,
            message: data.message || '取消成功',
          };
        } else {
          return {
            success: false,
            message: data.message || '取消失败',
          };
        }
      }

      return {
        success: false,
        message: '取消失败',
      };
    } catch (error) {
      console.error('[FlowService] 取消流程失败:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '取消失败',
      };
    }
  }

  /**
   * 终止流程（管理员操作）
   */
  async terminate(instanceId: string, userId: string, reason: string): Promise<FlowOperationResult> {
    try {
      const result = await callEKPInterface('ekp.flow.terminate', {
        authAreaId: userId,
        instanceId,
        reason,
      });

      if (result.success && result.data) {
        const data = result.data as { returnState?: number; message?: string };

        if (data.returnState === 2) {
          return {
            success: true,
            message: data.message || '终止成功',
          };
        } else {
          return {
            success: false,
            message: data.message || '终止失败',
          };
        }
      }

      return {
        success: false,
        message: '终止失败',
      };
    } catch (error) {
      console.error('[FlowService] 终止流程失败:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '终止失败',
      };
    }
  }

  /**
   * 获取流程分类列表
   */
  async getCategories(): Promise<string[]> {
    try {
      const result = await callEKPInterface('ekp.flow.getCategories', {});

      if (result.success && result.data) {
        const data = result.data as { returnState?: number; message?: string[] };

        if (data.returnState === 2 && Array.isArray(data.message)) {
          return data.message;
        }
      }

      return [];
    } catch (error) {
      console.error('[FlowService] 获取流程分类列表失败:', error);
      return [];
    }
  }

  // ============================================
  // 私有方法
  // ============================================

  /**
   * 映射模板列表
   */
  private mapTemplates(items: unknown[]): FlowTemplate[] {
    return items.map(item => this.mapTemplate(item));
  }

  /**
   * 映射单个模板
   */
  private mapTemplate(item: unknown): FlowTemplate {
    const record = item as Record<string, unknown>;
    return {
      id: (record.id || record.templateId || record.fdId || record.fdTemplateId || '') as string,
      name: (record.name || record.templateName || record.fdName || record.fdTemplateName || '') as string,
      code: record.code as string | undefined,
      category: record.category as string | undefined,
      description: record.description as string | undefined,
      formUrl: record.formUrl as string | undefined,
      formCode: record.formCode as string | undefined,
      icon: record.icon as string | undefined,
      enabled: (record.enabled !== false) as boolean,
      createdAt: record.createdAt as string | undefined,
      updatedAt: record.updatedAt as string | undefined,
    };
  }

  /**
   * 映射实例列表
   */
  private mapInstances(items: unknown[]): FlowInstance[] {
    return items.map(item => this.mapInstance(item));
  }

  /**
   * 映射单个实例
   */
  private mapInstance(item: unknown): FlowInstance {
    const record = item as Record<string, unknown>;
    return {
      id: (record.id || record.instanceId || record.fdId || '') as string,
      subject: (record.subject || record.title || record.fdSubject || '') as string,
      templateId: (record.templateId || record.fdTemplateId || '') as string,
      templateName: (record.templateName || record.fdTemplateName || '') as string,
      status: (record.status as FlowStatus) || FlowStatus.Running,
      createTime: (record.createTime || record.fdCreateTime || '') as string,
      completeTime: record.completeTime as string | undefined,
      creatorId: (record.creatorId || record.fdCreatorId || '') as string,
      creatorName: (record.creatorName || record.fdCreatorName || '') as string,
      currentNode: record.currentNode as string | undefined,
      progress: record.progress as number | undefined,
    };
  }

  /**
   * 映射进度
   */
  private mapProgress(item: unknown): FlowProgress {
    const record = item as Record<string, unknown>;
    return {
      instanceId: (record.instanceId || record.id || '') as string,
      subject: (record.subject || record.title || '') as string,
      status: (record.status as FlowStatus) || FlowStatus.Running,
      nodes: Array.isArray(record.nodes) 
        ? (record.nodes as unknown[]).map(n => this.mapNode(n))
        : [],
      progress: (record.progress || 0) as number,
    };
  }

  /**
   * 映射节点
   */
  private mapNode(item: unknown): FlowNode {
    const record = item as Record<string, unknown>;
    return {
      id: (record.id || record.nodeId || '') as string,
      name: (record.name || record.nodeName || '') as string,
      type: (record.type || 'approval') as string,
      assigneeId: record.assigneeId as string | undefined,
      assigneeName: record.assigneeName as string | undefined,
      status: (record.status || 'pending') as FlowNode['status'],
      startTime: record.startTime as string | undefined,
      endTime: record.endTime as string | undefined,
      opinion: record.opinion as string | undefined,
    };
  }
}

// ============================================
// 导出单例
// ============================================

export const flowService = new FlowService();

// ============================================
// 预置 EKP 流程接口配置
// ============================================

export const PRESET_FLOW_INTERFACES = [
  {
    code: 'ekp.flow.getTemplates',
    name: '获取流程模板列表',
    description: '获取可用的流程模板列表',
    category: 'workflow',
    endpoint: '/km/review/restservice/kmReviewTemplateRestService/getList',
    method: 'POST' as const,
    enabled: true,
    request: {},
    response: {},
    metadata: {
      params: ['pageIndex', 'pageSize', 'category', 'keyword'],
      description: '分页获取流程模板',
    },
    source: 'official' as const,
    isSystem: true,
  },
  {
    code: 'ekp.flow.getTemplate',
    name: '获取流程模板详情',
    description: '获取指定流程模板的详细信息',
    category: 'workflow',
    endpoint: '/km/review/restservice/kmReviewTemplateRestService/getDetail',
    method: 'POST' as const,
    enabled: true,
    request: {},
    response: {},
    metadata: {
      params: ['templateId'],
      description: '获取单个模板详情',
    },
    source: 'official' as const,
    isSystem: true,
  },
  {
    code: 'ekp.flow.launch',
    name: '发起流程',
    description: '发起一个新的流程实例',
    category: 'workflow',
    endpoint: '/km/review/restservice/kmReviewRestService/launch',
    method: 'POST' as const,
    enabled: true,
    request: {},
    response: {},
    metadata: {
      params: ['authAreaId', 'templateId', 'formValues', 'draft'],
      description: '发起流程，支持草稿模式',
    },
    source: 'official' as const,
    isSystem: true,
  },
  {
    code: 'ekp.flow.getMyStarted',
    name: '查询我发起的流程',
    description: '查询当前用户发起的流程列表',
    category: 'workflow',
    endpoint: '/km/review/restservice/kmReviewInstanceRestService/getMyStarted',
    method: 'POST' as const,
    enabled: true,
    request: {},
    response: {},
    metadata: {
      params: ['authAreaId', 'status', 'templateId', 'keyword', 'pageIndex', 'pageSize'],
      description: '查询发起的流程',
    },
    source: 'official' as const,
    isSystem: true,
  },
  {
    code: 'ekp.flow.getProgress',
    name: '查询流程进度',
    description: '查询流程实例的审批进度',
    category: 'workflow',
    endpoint: '/km/review/restservice/kmReviewInstanceRestService/getProgress',
    method: 'POST' as const,
    enabled: true,
    request: {},
    response: {},
    metadata: {
      params: ['instanceId'],
      description: '获取流程各节点状态',
    },
    source: 'official' as const,
    isSystem: true,
  },
  {
    code: 'ekp.flow.retract',
    name: '撤回流程',
    description: '撤回自己发起的流程',
    category: 'workflow',
    endpoint: '/km/review/restservice/kmReviewInstanceRestService/retract',
    method: 'POST' as const,
    enabled: true,
    request: {},
    response: {},
    metadata: {
      params: ['authAreaId', 'instanceId'],
      description: '撤回流程（仅在未审批时可撤回）',
    },
    source: 'official' as const,
    isSystem: true,
  },
  {
    code: 'ekp.flow.cancel',
    name: '取消流程',
    description: '取消自己发起的流程',
    category: 'workflow',
    endpoint: '/km/review/restservice/kmReviewInstanceRestService/cancel',
    method: 'POST' as const,
    enabled: true,
    request: {},
    response: {},
    metadata: {
      params: ['authAreaId', 'instanceId', 'reason'],
      description: '取消流程（需填写原因）',
    },
    source: 'official' as const,
    isSystem: true,
  },
  {
    code: 'ekp.flow.terminate',
    name: '终止流程',
    description: '管理员终止流程',
    category: 'workflow',
    endpoint: '/km/review/restservice/kmReviewInstanceRestService/terminate',
    method: 'POST' as const,
    enabled: true,
    request: {},
    response: {},
    metadata: {
      params: ['authAreaId', 'instanceId', 'reason'],
      description: '管理员强制终止流程',
    },
    source: 'official' as const,
    isSystem: true,
  },
  {
    code: 'ekp.flow.getCategories',
    name: '获取流程分类',
    description: '获取流程模板分类列表',
    category: 'workflow',
    endpoint: '/km/review/restservice/kmReviewTemplateRestService/getCategories',
    method: 'POST' as const,
    enabled: true,
    request: {},
    response: {},
    metadata: {
      params: [],
      description: '获取所有流程分类',
    },
    source: 'official' as const,
    isSystem: true,
  },
];
