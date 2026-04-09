/**
 * 审批智能体
 * 负责：待办查询、审批操作、流程发起
 */

import { BaseBusinessAgent } from './base-business-agent';
import { createEKPClient, getTodoCount } from '@/lib/ekp-client';
import { agentRepository } from '@/lib/database/repositories/agent.repository';

export class ApprovalAgent extends BaseBusinessAgent {
  constructor() {
    super('approval-agent');
  }

  /**
   * 执行业务逻辑
   * 重写父类方法，直接处理待办相关操作
   */
  protected async executeBusinessLogic(
    action: string,
    userContext: { userId: string; deptId?: string; role?: string },
    params: Record<string, any>
  ): Promise<{
    code: string;
    msg: string;
    data: any;
  }> {
    console.log('[ApprovalAgent] 执行业务逻辑:', { action, params });

    try {
      // 根据 action 调用对应的处理方法
      switch (action) {
        case 'get_todo_count':
        case 'getTodoCount':
          return await this.handleGetTodoCount(params, userContext);

        case 'get_my_todo':
        case 'getTodo':
          return await this.handleGetTodo(params, userContext);

        case 'approve':
        case 'setTodoDone':
          return await this.handleApprove(params, userContext);

        default:
          // 默认返回待办数量
          return await this.handleGetTodoCount(params, userContext);
      }
    } catch (error) {
      console.error('[ApprovalAgent] 业务逻辑执行失败:', error);
      return {
        code: '500',
        msg: error instanceof Error ? error.message : '执行失败',
        data: null,
      };
    }
  }

  /**
   * 查询待办数量
   */
  private async handleGetTodoCount(
    params: Record<string, any>,
    userContext: { userId: string; deptId?: string; role?: string }
  ): Promise<{ code: string; msg: string; data: any }> {
    try {
      const type = params.type ?? 0; // 0=所有待办，1=审批类，2=通知类
      const client = await createEKPClient();

      if (!client) {
        return {
          code: '500',
          msg: 'EKP客户端未配置',
          data: null,
        };
      }

      // 调用EKP获取待办数量
      const result = await client.getTodoCount(userContext.userId, type);

      if (result.success) {
        // getTodoCount 返回的 data 是 string 类型的待办数量
        const count = parseInt(String(result.data || '0'), 10);
        return {
          code: '200',
          msg: '查询成功',
          data: {
            count: isNaN(count) ? 0 : count,
            type: type,
          },
        };
      }

      return {
        code: '500',
        msg: result.msg || '查询失败',
        data: null,
      };
    } catch (error) {
      console.error('[ApprovalAgent] 查询待办数量失败:', error);
      return {
        code: '500',
        msg: error instanceof Error ? error.message : '查询失败',
        data: null,
      };
    }
  }

  /**
   * 查询待办列表
   */
  private async handleGetTodo(
    params: Record<string, any>,
    userContext: { userId: string; deptId?: string; role?: string }
  ): Promise<{ code: string; msg: string; data: any }> {
    try {
      const type = params.type ?? 0;
      const page = params.page ?? 1;
      const pageSize = params.pageSize ?? 20;
      const client = await createEKPClient();

      if (!client) {
        return {
          code: '500',
          msg: 'EKP客户端未配置',
          data: null,
        };
      }

      // 调用EKP获取待办列表
      const result = await client.getTodoList(userContext.userId, type, page, pageSize);

      if (result.success) {
        return {
          code: '200',
          msg: '查询成功',
          data: {
            items: result.data?.items || [],
            total: result.data?.total || 0,
            page,
            pageSize,
          },
        };
      }

      return {
        code: '500',
        msg: result.msg || '查询失败',
        data: null,
      };
    } catch (error) {
      console.error('[ApprovalAgent] 查询待办列表失败:', error);
      return {
        code: '500',
        msg: error instanceof Error ? error.message : '查询失败',
        data: null,
      };
    }
  }

  /**
   * 审批同意
   */
  private async handleApprove(
    params: Record<string, any>,
    userContext: { userId: string; deptId?: string; role?: string }
  ): Promise<{ code: string; msg: string; data: any }> {
    try {
      const todoId = params.id || params.todoId;
      const opinion = params.opinion || '同意';

      if (!todoId) {
        return {
          code: '400',
          msg: '缺少待办ID',
          data: null,
        };
      }

      const client = await createEKPClient();

      if (!client) {
        return {
          code: '500',
          msg: 'EKP客户端未配置',
          data: null,
        };
      }

      // 调用EKP审批
      const result = await client.approveTodo(todoId, userContext.userId, opinion);

      if (result.success) {
        return {
          code: '200',
          msg: '审批成功',
          data: { todoId, opinion },
        };
      }

      return {
        code: '500',
        msg: result.msg || '审批失败',
        data: null,
      };
    } catch (error) {
      console.error('[ApprovalAgent] 审批失败:', error);
      return {
        code: '500',
        msg: error instanceof Error ? error.message : '审批失败',
        data: null,
      };
    }
  }

  /**
   * 调用技能（保持接口兼容，但实际不使用）
   */
  protected async callSkill(skillCode: string, params: Record<string, any>): Promise<any> {
    console.log('[ApprovalAgent] callSkill 不再使用，直接使用 executeBusinessLogic');
    return { success: true };
  }
}

export const approvalAgent = new ApprovalAgent();
