/**
 * EKP 待办服务 (TodoService)
 * 职责：查询待办、审批操作、转交、催办
 * 
 * 使用方式：
 * import { todoService } from '@/lib/ekp/services/todo-service';
 * const todos = await todoService.getMyTodos(userId, { type: 0 });
 */

import { createEKPClient, callEKPInterface } from '@/lib/ekp-client';
import { dbManager } from '@/lib/database/manager';

// ============================================
// 类型定义
// ============================================

/** 待办项状态 */
export enum TodoStatus {
  Pending = 'pending',      // 待处理
  Done = 'done',           // 已处理
  Suspended = 'suspended', // 暂挂
}

/** 待办项类型 */
export enum TodoType {
  All = 0,           // 所有待办
  Approve = 1,       // 审批类
  Notify = 2,        // 通知类
  Suspended = 3,     // 暂挂类
  ApproveSuspended = 13, // 审批+暂挂
}

/** 待办项 */
export interface TodoItem {
  id: string;                    // 待办ID
  title: string;                 // 待办标题
  content: string;               // 待办内容
  createTime: string;             // 创建时间
  overdueTime?: string;           // 逾期时间
  importantLevel?: string;        // 重要程度
  category?: string;              // 分类
  status: TodoStatus;             // 状态
  type: number;                   // 类型
  processorId?: string;           // 处理人ID
  processorName?: string;         // 处理人姓名
  senderId?: string;              // 发送人ID
  senderName?: string;            // 发送人姓名
  appName?: string;               // 应用名称
  modelId?: string;               // 模块ID
  fdTemplateId?: string;          // 流程模板ID
  docSubject?: string;            // 文档主题
  fdNumber?: string;              // 文档编号
}

/** 待办详情 */
export interface TodoDetail {
  id: string;
  title: string;
  content: string;
  createTime: string;
  importantLevel?: string;
  senderId: string;
  senderName: string;
  processorId: string;
  processorName: string;
  opinionText?: string;
  attachments?: Attachment[];
  formUrl?: string;
  templateId?: string;
}

/** 附件 */
export interface Attachment {
  id: string;
  name: string;
  size: number;
  url: string;
}

/** 审批操作参数 */
export interface ApproveParams {
  todoId: string;
  userId: string;
  opinion?: string;
  action?: 'approve' | 'reject' | 'addSign' | 'redirect';
}

/** 转交参数 */
export interface TransferParams {
  todoId: string;
  userId: string;
  targetUserId: string;
  opinion?: string;
}

/** 查询参数 */
export interface QueryParams {
  userId?: string;
  type?: TodoType;
  pageIndex?: number;
  pageSize?: number;
  keyword?: string;
  startDate?: string;
  endDate?: string;
}

/** 操作结果 */
export interface OperationResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

// ============================================
// 待办服务类
// ============================================

export class TodoService {
  /**
   * 获取待办数量
   */
  async getCount(userId: string, type: TodoType = TodoType.All): Promise<number> {
    try {
      const result = await callEKPInterface('ekp.todo.getCount', {
        authAreaId: userId,
        type,
      });

      if (result.success && result.data) {
        const data = result.data as { returnState?: number; message?: string; count?: number };
        if (data.returnState === 2) {
          return parseInt(data.message || '0', 10);
        }
      }
      return 0;
    } catch (error) {
      console.error('[TodoService] 获取待办数量失败:', error);
      return 0;
    }
  }

  /**
   * 查询我的待办列表
   */
  async getMyTodos(params: QueryParams): Promise<TodoItem[]> {
    try {
      const {
        userId,
        type = TodoType.All,
        pageIndex = 1,
        pageSize = 20,
        keyword,
      } = params;

      const requestBody: Record<string, unknown> = {
        authAreaId: userId,
        type,
        pageIndex,
        pageSize,
      };

      if (keyword) {
        requestBody.keyword = keyword;
      }

      const result = await callEKPInterface('ekp.todo.getList', requestBody);

      if (result.success && result.data) {
        const data = result.data as {
          returnState?: number;
          message?: string | TodoItem[];
        };

        if (data.returnState === 2) {
          // message可能是数组或字符串
          if (Array.isArray(data.message)) {
            return this.mapTodoItems(data.message);
          }
          // 如果是字符串且是JSON，尝试解析
          if (typeof data.message === 'string') {
            try {
              const parsed = JSON.parse(data.message);
              if (Array.isArray(parsed)) {
                return this.mapTodoItems(parsed);
              }
            } catch {
              // 解析失败，返回空
            }
          }
        }
      }

      return [];
    } catch (error) {
      console.error('[TodoService] 查询待办列表失败:', error);
      return [];
    }
  }

  /**
   * 查询已办列表
   */
  async getMyDone(params: QueryParams): Promise<TodoItem[]> {
    try {
      const {
        userId,
        pageIndex = 1,
        pageSize = 20,
        keyword,
      } = params;

      const requestBody: Record<string, unknown> = {
        authAreaId: userId,
        type: TodoType.All, // 已办使用 -1
        pageIndex,
        pageSize,
      };

      if (keyword) {
        requestBody.keyword = keyword;
      }

      const result = await callEKPInterface('ekp.todo.getDone', requestBody);

      if (result.success && result.data) {
        const data = result.data as {
          returnState?: number;
          message?: string | TodoItem[];
        };

        if (data.returnState === 2) {
          if (Array.isArray(data.message)) {
            return this.mapTodoItems(data.message);
          }
        }
      }

      return [];
    } catch (error) {
      console.error('[TodoService] 查询已办列表失败:', error);
      return [];
    }
  }

  /**
   * 查询暂挂列表
   */
  async getMySuspended(params: QueryParams): Promise<TodoItem[]> {
    try {
      const {
        userId,
        pageIndex = 1,
        pageSize = 20,
      } = params;

      const result = await callEKPInterface('ekp.todo.getSuspended', {
        authAreaId: userId,
        type: TodoType.Suspended,
        pageIndex,
        pageSize,
      });

      if (result.success && result.data) {
        const data = result.data as { returnState?: number; message?: string | TodoItem[] };

        if (data.returnState === 2) {
          if (Array.isArray(data.message)) {
            return this.mapTodoItems(data.message);
          }
        }
      }

      return [];
    } catch (error) {
      console.error('[TodoService] 查询暂挂列表失败:', error);
      return [];
    }
  }

  /**
   * 获取待办详情
   */
  async getDetail(todoId: string, userId: string): Promise<TodoDetail | null> {
    try {
      const result = await callEKPInterface('ekp.todo.getDetail', {
        authAreaId: userId,
        todoId,
      });

      if (result.success && result.data) {
        const data = result.data as { returnState?: number; message?: TodoDetail };
        if (data.returnState === 2 && data.message) {
          return data.message;
        }
      }

      return null;
    } catch (error) {
      console.error('[TodoService] 获取待办详情失败:', error);
      return null;
    }
  }

  /**
   * 审批同意
   */
  async approve(params: ApproveParams): Promise<OperationResult> {
    return this.handleApproval({
      ...params,
      action: 'approve',
    });
  }

  /**
   * 审批拒绝
   */
  async reject(params: ApproveParams): Promise<OperationResult> {
    return this.handleApproval({
      ...params,
      action: 'reject',
    });
  }

  /**
   * 处理审批操作（同意/拒绝/加签/转签）
   */
  private async handleApproval(params: ApproveParams & { action: string }): Promise<OperationResult> {
    try {
      const { todoId, userId, opinion, action } = params;

      const result = await callEKPInterface('ekp.todo.handle', {
        authAreaId: userId,
        todoId,
        opinion: opinion || '',
        action,
      });

      if (result.success && result.data) {
        const data = result.data as { returnState?: number; message?: string };
        if (data.returnState === 2) {
          return {
            success: true,
            message: data.message || '操作成功',
          };
        } else {
          return {
            success: false,
            message: data.message || '操作失败',
          };
        }
      }

      return {
        success: false,
        message: '操作失败',
      };
    } catch (error) {
      console.error('[TodoService] 审批操作失败:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '操作失败',
      };
    }
  }

  /**
   * 转交待办
   */
  async transfer(params: TransferParams): Promise<OperationResult> {
    try {
      const { todoId, userId, targetUserId, opinion } = params;

      const result = await callEKPInterface('ekp.todo.transfer', {
        authAreaId: userId,
        todoId,
        targetUserId,
        opinion: opinion || '',
      });

      if (result.success && result.data) {
        const data = result.data as { returnState?: number; message?: string };
        if (data.returnState === 2) {
          return {
            success: true,
            message: data.message || '转交成功',
          };
        }
      }

      return {
        success: false,
        message: '转交失败',
      };
    } catch (error) {
      console.error('[TodoService] 转交待办失败:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '转交失败',
      };
    }
  }

  /**
   * 催办
   */
  async urge(todoId: string, userId: string): Promise<OperationResult> {
    try {
      const result = await callEKPInterface('ekp.todo.urge', {
        authAreaId: userId,
        todoId,
      });

      if (result.success && result.data) {
        const data = result.data as { returnState?: number; message?: string };
        if (data.returnState === 2) {
          return {
            success: true,
            message: data.message || '催办成功',
          };
        }
      }

      return {
        success: false,
        message: '催办失败',
      };
    } catch (error) {
      console.error('[TodoService] 催办失败:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '催办失败',
      };
    }
  }

  /**
   * 获取摘要统计
   */
  async getSummary(userId: string): Promise<{
    total: number;
    approve: number;
    notify: number;
    suspended: number;
  }> {
    try {
      const [total, approve, notify, suspended] = await Promise.all([
        this.getCount(userId, TodoType.All),
        this.getCount(userId, TodoType.Approve),
        this.getCount(userId, TodoType.Notify),
        this.getCount(userId, TodoType.Suspended),
      ]);

      return {
        total,
        approve,
        notify,
        suspended,
      };
    } catch (error) {
      console.error('[TodoService] 获取摘要统计失败:', error);
      return {
        total: 0,
        approve: 0,
        notify: 0,
        suspended: 0,
      };
    }
  }

  /**
   * 映射待办项（兼容不同格式）
   */
  private mapTodoItems(items: unknown[]): TodoItem[] {
    return items.map((item: unknown) => {
      const record = item as Record<string, unknown>;
      return {
        id: (record.id || record.todoId || record.fdId || '') as string,
        title: (record.title || record.subject || record.docSubject || record.fdSubject || '') as string,
        content: (record.content || record.description || record.fdContent || '') as string,
        createTime: (record.createTime || record.createTimeStr || record.fdCreateTime || '') as string,
        overdueTime: record.overdueTime as string | undefined,
        importantLevel: record.importantLevel as string | undefined,
        category: record.category as string | undefined,
        status: record.status as TodoStatus || TodoStatus.Pending,
        type: (record.type || record.todoType || 0) as number,
        processorId: record.processorId as string | undefined,
        processorName: record.processorName as string | undefined,
        senderId: record.senderId as string | undefined,
        senderName: record.senderName as string | undefined,
        appName: record.appName as string | undefined,
        modelId: record.modelId as string | undefined,
        fdTemplateId: record.fdTemplateId as string | undefined,
        docSubject: record.docSubject as string | undefined,
        fdNumber: record.fdNumber as string | undefined,
      };
    });
  }
}

// ============================================
// 导出单例
// ============================================

export const todoService = new TodoService();

// ============================================
// 预置 EKP 接口配置（自动注册）
// ============================================

/**
 * 预置的待办相关接口配置
 * 这些配置会被 EKPInterfaceRegistry 自动加载
 */
export const PRESET_TODO_INTERFACES = [
  {
    code: 'ekp.todo.getCount',
    name: '获取待办数量',
    description: '获取当前用户的待办数量',
    category: 'workflow',
    endpoint: '/km/review/restservice/kmReviewTodoRestService/getCount',
    method: 'POST' as const,
    enabled: true,
    request: {},
    response: {},
    metadata: {
      params: ['authAreaId', 'type'],
      description: '获取待办数量，支持按类型筛选',
    },
    source: 'official' as const,
    isSystem: true,
  },
  {
    code: 'ekp.todo.getList',
    name: '获取待办列表',
    description: '获取当前用户的待办列表',
    category: 'workflow',
    endpoint: '/km/review/restservice/kmReviewTodoRestService/getList',
    method: 'POST' as const,
    enabled: true,
    request: {},
    response: {},
    metadata: {
      params: ['authAreaId', 'type', 'pageIndex', 'pageSize', 'keyword'],
      description: '分页获取待办列表',
    },
    source: 'official' as const,
    isSystem: true,
  },
  {
    code: 'ekp.todo.getDetail',
    name: '获取待办详情',
    description: '获取待办项的详细信息',
    category: 'workflow',
    endpoint: '/km/review/restservice/kmReviewTodoRestService/getDetail',
    method: 'POST' as const,
    enabled: true,
    request: {},
    response: {},
    metadata: {
      params: ['authAreaId', 'todoId'],
      description: '获取待办的详细信息，包括附件、表单URL等',
    },
    source: 'official' as const,
    isSystem: true,
  },
  {
    code: 'ekp.todo.handle',
    name: '处理待办',
    description: '审批同意/拒绝/加签/转签',
    category: 'workflow',
    endpoint: '/km/review/restservice/kmReviewTodoRestService/handle',
    method: 'POST' as const,
    enabled: true,
    request: {},
    response: {},
    metadata: {
      params: ['authAreaId', 'todoId', 'opinion', 'action'],
      description: '处理待办，支持 approve/reject/addSign/redirect',
    },
    source: 'official' as const,
    isSystem: true,
  },
  {
    code: 'ekp.todo.transfer',
    name: '转交待办',
    description: '将待办转交给其他人处理',
    category: 'workflow',
    endpoint: '/km/review/restservice/kmReviewTodoRestService/transfer',
    method: 'POST' as const,
    enabled: true,
    request: {},
    response: {},
    metadata: {
      params: ['authAreaId', 'todoId', 'targetUserId', 'opinion'],
      description: '转交待办给指定用户',
    },
    source: 'official' as const,
    isSystem: true,
  },
  {
    code: 'ekp.todo.urge',
    name: '催办',
    description: '催促待办处理人尽快处理',
    category: 'workflow',
    endpoint: '/km/review/restservice/kmReviewTodoRestService/urge',
    method: 'POST' as const,
    enabled: true,
    request: {},
    response: {},
    metadata: {
      params: ['authAreaId', 'todoId'],
      description: '发送催办提醒',
    },
    source: 'official' as const,
    isSystem: true,
  },
];
