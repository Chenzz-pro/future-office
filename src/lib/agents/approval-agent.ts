/**
 * 审批智能体 (ApprovalAgent)
 * 
 * 职责：只做调度，不写业务
 * 
 * 调度三件事：
 * 1. 待办服务 - 查询、审批、转交、催办
 * 2. 流程服务 - 查询模板、发起流程
 * 3. 表单服务 - 获取表单、AI填表
 * 
 * 架构：
 * RootAgent → ApprovalAgent → TodoService | FlowService | FormService → EKP Client
 */

import { BaseBusinessAgent } from './base-business-agent';
import type { AgentContext } from '@/types/agent';
import {
  todoService,
  ApproveParams,
  TransferParams,
  QueryParams,
  flowService,
  LaunchParams,
  QueryFlowParams,
  formService,
} from '@/lib/ekp/services';
import type { FlowMapping } from '@/lib/ekp/services';
import { TodoType } from '@/lib/ekp/services/todo-service';

// ============================================
// 类型定义
// ============================================

/** 审批意图类型 */
export type ApprovalIntent = 
  | 'query_todo'       // 查询待办
  | 'query_done'       // 查询已办
  | 'query_suspended'  // 查询暂挂
  | 'approve'          // 审批同意
  | 'reject'           // 审批拒绝
  | 'transfer'         // 转交待办
  | 'urge'             // 催办
  | 'launch_flow'      // 发起流程
  | 'query_flow'       // 查询流程
  | 'query_template'   // 查询模板
  | 'open_form'        // 打开表单（AI填表）
  | 'unknown';         // 未知意图

/** 解析后的意图 */
export interface ParsedIntent {
  intent: ApprovalIntent;
  confidence: number;           // 置信度 0-1
  entities: Record<string, unknown>; // 提取的实体
  reply?: string;                // AI 回复内容
  requiresForm?: boolean;        // 是否需要打开表单
  businessType?: string;        // 业务类型
  formUrl?: string;             // 表单URL
}

/** 待办摘要 */
export interface TodoSummary {
  total: number;
  approve: number;
  notify: number;
  suspended: number;
}

// ============================================
// 审批Agent类
// ============================================

export class ApprovalAgent extends BaseBusinessAgent {
  constructor() {
    super('approval-agent');
  }

  /**
   * 处理用户消息
   * 这是入口方法，由 RootAgent 调用
   */
  async process(message: string, context: AgentContext): Promise<any> {
    console.log('[ApprovalAgent] 处理消息:', { message, context });

    // 1. 解析意图
    const intent = await this.parseIntent(message, context);

    console.log('[ApprovalAgent] 解析意图:', intent);

    // 2. 根据意图执行调度
    switch (intent.intent) {
      case 'query_todo':
        return await this.handleQueryTodo(intent, context);

      case 'query_done':
        return await this.handleQueryDone(intent, context);

      case 'query_suspended':
        return await this.handleQuerySuspended(intent, context);

      case 'approve':
        return await this.handleApprove(intent, context);

      case 'reject':
        return await this.handleReject(intent, context);

      case 'transfer':
        return await this.handleTransfer(intent, context);

      case 'urge':
        return await this.handleUrge(intent, context);

      case 'launch_flow':
        return await this.handleLaunchFlow(intent, context);

      case 'query_flow':
        return await this.handleQueryFlow(intent, context);

      case 'query_template':
        return await this.handleQueryTemplate(intent, context);

      case 'open_form':
        return await this.handleOpenForm(intent, context);

      default:
        return this.formatResponse({
          success: false,
          message: '抱歉，我不太理解您的意思。请告诉我您想：\n' +
                   '- 查询待办：请说"查我的待办"\n' +
                   '- 审批操作：请说"同意/拒绝这个待办"\n' +
                   '- 发起流程：请说"我要请假"、"我要报销"等\n' +
                   '- 查询模板：请说"有哪些流程可以用"',
        });
    }
  }

  // ============================================
  // 意图解析
  // ============================================

  /**
   * 解析用户意图
   * 使用规则匹配 + LLM（可选）
   */
  private async parseIntent(message: string, context: AgentContext): Promise<ParsedIntent> {
    const lowerMessage = message.toLowerCase();
    const entities: Record<string, unknown> = {};

    // 提取业务类型
    const businessTypes = ['请假', '休假', '报销', '采购', '出差', '用车', '接待', '借款'];
    for (const type of businessTypes) {
      if (lowerMessage.includes(type)) {
        entities.businessType = type;
        entities.businessTypeCode = this.getBusinessTypeCode(type);
        break;
      }
    }

    // 提取待办ID
    const todoIdMatch = message.match(/(?:待办|todo|id)[：:\s]*([a-z0-9-]{32,})/i);
    if (todoIdMatch) {
      entities.todoId = todoIdMatch[1];
    }

    // 提取流程实例ID
    const flowIdMatch = message.match(/(?:流程|instance|id)[：:\s]*([a-z0-9-]{32,})/i);
    if (flowIdMatch) {
      entities.flowId = flowIdMatch[1];
    }

    // 意图匹配
    let intent: ApprovalIntent = 'unknown';
    let confidence = 0;
    let reply: string | undefined;

    // 查询待办相关
    if (this.matchAny(lowerMessage, ['我的待办', '待办列表', '查待办', '待办查询', '有哪些待办', '待办数', '待办数量'])) {
      intent = 'query_todo';
      confidence = 0.95;
      reply = '好的，让我查询您的待办列表...';
    }
    // 查询已办相关
    else if (this.matchAny(lowerMessage, ['我的已办', '已办列表', '查已办', '已办查询', '已办事项'])) {
      intent = 'query_done';
      confidence = 0.95;
      reply = '好的，让我查询您的已办列表...';
    }
    // 查询暂挂相关
    else if (this.matchAny(lowerMessage, ['暂挂', '挂起的', '暂停的', '待确认'])) {
      intent = 'query_suspended';
      confidence = 0.9;
      reply = '好的，让我查询您的暂挂事项...';
    }
    // 审批同意
    else if (this.matchAny(lowerMessage, ['同意', '通过', '批准', 'ok', '好的', '可以', '行', '没问题'])) {
      intent = 'approve';
      confidence = 0.85;
      reply = '好的，正在处理审批同意...';
    }
    // 审批拒绝
    else if (this.matchAny(lowerMessage, ['拒绝', '驳回', '不同意', '不行', '不可以'])) {
      intent = 'reject';
      confidence = 0.85;
      reply = '好的，请提供拒绝原因，我会帮您处理。';
    }
    // 转交
    else if (this.matchAny(lowerMessage, ['转交', '转派', '转移', '让别人处理'])) {
      intent = 'transfer';
      confidence = 0.8;
      reply = '好的，请提供要转交给的人员信息。';
    }
    // 催办
    else if (this.matchAny(lowerMessage, ['催办', '催一下', '提醒', '催促', '快点处理'])) {
      intent = 'urge';
      confidence = 0.85;
      reply = '好的，正在发送催办提醒...';
    }
    // 发起流程
    else if (this.matchAny(lowerMessage, ['发起', '申请', '我要', '帮我', '创建', '新建'])) {
      if (entities.businessType) {
        intent = 'launch_flow';
        confidence = 0.9;
        reply = `好的，您要${entities.businessType}，我来帮您准备表单...`;
      }
    }
    // 查询流程
    else if (this.matchAny(lowerMessage, ['我的流程', '发起的流程', '流程列表', '流程查询', '流程进度'])) {
      intent = 'query_flow';
      confidence = 0.9;
      reply = '好的，让我查询您的流程列表...';
    }
    // 查询模板
    else if (this.matchAny(lowerMessage, ['模板', '流程模板', '有哪些流程', '流程类型', '能申请什么'])) {
      intent = 'query_template';
      confidence = 0.9;
      reply = '好的，让我查询可用的流程模板...';
    }
    // 打开表单（AI填表场景）
    else if (this.matchAny(lowerMessage, ['打开表单', '填表', '填单', '打开', '编辑'])) {
      if (entities.businessType) {
        intent = 'open_form';
        confidence = 0.85;
      }
    }
    // 待办摘要
    else if (this.matchAny(lowerMessage, ['待办摘要', '统计', '概览', '待办情况'])) {
      intent = 'query_todo';
      confidence = 0.8;
      reply = '好的，让我查询您的待办统计...';
    }

    // 获取表单URL（如果需要）
    let formUrl: string | undefined;
    if (entities.businessTypeCode) {
      try {
        const { flowMappingService } = await import('@/lib/ekp/services');
        const mapping = await flowMappingService.getByBusinessType(entities.businessTypeCode as string);
        if (mapping?.formUrl) {
          formUrl = mapping.formUrl;
        }
      } catch (error) {
        console.error('[ApprovalAgent] 获取表单URL失败:', error);
      }
    }

    return {
      intent,
      confidence,
      entities,
      reply,
      requiresForm: intent === 'open_form' || intent === 'launch_flow',
      businessType: entities.businessTypeCode as string,
      formUrl,
    };
  }

  // ============================================
  // 待办处理
  // ============================================

  /**
   * 处理查询待办
   */
  private async handleQueryTodo(intent: ParsedIntent, context: AgentContext): Promise<any> {
    const userId = context.userId;

    if (!userId) {
      return this.formatResponse({
        success: false,
        message: '无法获取用户信息',
      });
    }

    try {
      // 获取待办摘要
      if (intent.entities.businessType === undefined) {
        const summary = await todoService.getSummary(userId);
        const summaryText = [
          '📊 您的待办统计：',
          `- 全部待办：${summary.total} 条`,
          `- 审批类：${summary.approve} 条`,
          `- 通知类：${summary.notify} 条`,
          `- 暂挂类：${summary.suspended} 条`,
          '',
          '您可以对我说：',
          '- "查我的待办" - 查看待办列表',
          '- "查我的已办" - 查看已办列表',
        ].join('\n');

        return this.formatResponse({
          success: true,
          message: summaryText,
          data: summary,
        });
      }

      // 查询具体待办列表
      const params: QueryParams = {
        userId,
        type: TodoType.Approve,
        pageSize: 20,
      };

      const todos = await todoService.getMyTodos(params);

      if (todos.length === 0) {
        return this.formatResponse({
          success: true,
          message: '您目前没有待审批的事项',
          data: [],
        });
      }

      const todoList = todos.map((todo, index) =>
        `${index + 1}. ${todo.title || '无标题'}\n   ID: ${todo.id}\n   时间: ${todo.createTime}`
      ).join('\n\n');

      return this.formatResponse({
        success: true,
        message: `📋 您的待办列表（共 ${todos.length} 条）：\n\n${todoList}\n\n回复"同意+ID"或"拒绝+ID"进行审批`,
        data: todos,
      });
    } catch (error) {
      console.error('[ApprovalAgent] 查询待办失败:', error);
      return this.formatResponse({
        success: false,
        message: '查询待办失败：' + (error instanceof Error ? error.message : '未知错误'),
      });
    }
  }

  /**
   * 处理查询已办
   */
  private async handleQueryDone(intent: ParsedIntent, context: AgentContext): Promise<any> {
    const userId = context.userId;

    if (!userId) {
      return this.formatResponse({
        success: false,
        message: '无法获取用户信息',
      });
    }

    try {
      const params: QueryParams = {
        userId,
        pageSize: 20,
      };

      const doneList = await todoService.getMyDone(params);

      if (doneList.length === 0) {
        return this.formatResponse({
          success: true,
          message: '您目前没有已办事项',
          data: [],
        });
      }

      const list = doneList.map((item, index) =>
        `${index + 1}. ${item.title || '无标题'}\n   完成时间: ${item.createTime}`
      ).join('\n\n');

      return this.formatResponse({
        success: true,
        message: `✅ 您的已办列表（共 ${doneList.length} 条）：\n\n${list}`,
        data: doneList,
      });
    } catch (error) {
      console.error('[ApprovalAgent] 查询已办失败:', error);
      return this.formatResponse({
        success: false,
        message: '查询已办失败：' + (error instanceof Error ? error.message : '未知错误'),
      });
    }
  }

  /**
   * 处理查询暂挂
   */
  private async handleQuerySuspended(intent: ParsedIntent, context: AgentContext): Promise<any> {
    const userId = context.userId;

    if (!userId) {
      return this.formatResponse({
        success: false,
        message: '无法获取用户信息',
      });
    }

    try {
      const params: QueryParams = {
        userId,
        pageSize: 20,
      };

      const suspended = await todoService.getMySuspended(params);

      if (suspended.length === 0) {
        return this.formatResponse({
          success: true,
          message: '您目前没有暂挂的事项',
          data: [],
        });
      }

      const list = suspended.map((item, index) =>
        `${index + 1}. ${item.title || '无标题'}\n   状态: 暂挂\n   创建时间: ${item.createTime}`
      ).join('\n\n');

      return this.formatResponse({
        success: true,
        message: `⏸️ 您的暂挂列表（共 ${suspended.length} 条）：\n\n${list}`,
        data: suspended,
      });
    } catch (error) {
      console.error('[ApprovalAgent] 查询暂挂失败:', error);
      return this.formatResponse({
        success: false,
        message: '查询暂挂失败：' + (error instanceof Error ? error.message : '未知错误'),
      });
    }
  }

  // ============================================
  // 审批处理
  // ============================================

  /**
   * 处理审批同意
   */
  private async handleApprove(intent: ParsedIntent, context: AgentContext): Promise<any> {
    const userId = context.userId;
    const todoId = intent.entities.todoId as string;

    if (!userId) {
      return this.formatResponse({
        success: false,
        message: '无法获取用户信息',
      });
    }

    if (!todoId) {
      return this.formatResponse({
        success: false,
        message: '请提供要审批的待办ID',
      });
    }

    try {
      const params: ApproveParams = {
        todoId,
        userId,
        opinion: intent.entities.opinion as string || '',
      };

      const result = await todoService.approve(params);

      if (result.success) {
        return this.formatResponse({
          success: true,
          message: `✅ 审批已通过！\n待办ID: ${todoId}\n${result.message}`,
        });
      } else {
        return this.formatResponse({
          success: false,
          message: `审批失败：${result.message}`,
        });
      }
    } catch (error) {
      console.error('[ApprovalAgent] 审批同意失败:', error);
      return this.formatResponse({
        success: false,
        message: '审批操作失败：' + (error instanceof Error ? error.message : '未知错误'),
      });
    }
  }

  /**
   * 处理审批拒绝
   */
  private async handleReject(intent: ParsedIntent, context: AgentContext): Promise<any> {
    const userId = context.userId;
    const todoId = intent.entities.todoId as string;
    const opinion = intent.entities.opinion as string || '不同意';

    if (!userId) {
      return this.formatResponse({
        success: false,
        message: '无法获取用户信息',
      });
    }

    if (!todoId) {
      return this.formatResponse({
        success: false,
        message: '请提供要拒绝的待办ID',
      });
    }

    try {
      const params: ApproveParams = {
        todoId,
        userId,
        opinion,
      };

      const result = await todoService.reject(params);

      if (result.success) {
        return this.formatResponse({
          success: true,
          message: `❌ 已拒绝该审批\n待办ID: ${todoId}\n原因: ${opinion}`,
        });
      } else {
        return this.formatResponse({
          success: false,
          message: `拒绝失败：${result.message}`,
        });
      }
    } catch (error) {
      console.error('[ApprovalAgent] 审批拒绝失败:', error);
      return this.formatResponse({
        success: false,
        message: '审批操作失败：' + (error instanceof Error ? error.message : '未知错误'),
      });
    }
  }

  /**
   * 处理转交待办
   */
  private async handleTransfer(intent: ParsedIntent, context: AgentContext): Promise<any> {
    const userId = context.userId;
    const todoId = intent.entities.todoId as string;
    const targetUserId = intent.entities.targetUserId as string;

    if (!userId) {
      return this.formatResponse({
        success: false,
        message: '无法获取用户信息',
      });
    }

    if (!todoId) {
      return this.formatResponse({
        success: false,
        message: '请提供要转交的待办ID',
      });
    }

    if (!targetUserId) {
      return this.formatResponse({
        success: false,
        message: '请提供要转交给的人员ID',
      });
    }

    try {
      const params: TransferParams = {
        todoId,
        userId,
        targetUserId,
        opinion: intent.entities.opinion as string || '',
      };

      const result = await todoService.transfer(params);

      if (result.success) {
        return this.formatResponse({
          success: true,
          message: `🔄 已转交待办\n待办ID: ${todoId}\n转交给: ${targetUserId}`,
        });
      } else {
        return this.formatResponse({
          success: false,
          message: `转交失败：${result.message}`,
        });
      }
    } catch (error) {
      console.error('[ApprovalAgent] 转交待办失败:', error);
      return this.formatResponse({
        success: false,
        message: '转交操作失败：' + (error instanceof Error ? error.message : '未知错误'),
      });
    }
  }

  /**
   * 处理催办
   */
  private async handleUrge(intent: ParsedIntent, context: AgentContext): Promise<any> {
    const userId = context.userId;
    const todoId = intent.entities.todoId as string;

    if (!userId) {
      return this.formatResponse({
        success: false,
        message: '无法获取用户信息',
      });
    }

    if (!todoId) {
      return this.formatResponse({
        success: false,
        message: '请提供要催办的待办ID',
      });
    }

    try {
      const result = await todoService.urge(todoId, userId);

      if (result.success) {
        return this.formatResponse({
          success: true,
          message: `🔔 已发送催办提醒\n待办ID: ${todoId}`,
        });
      } else {
        return this.formatResponse({
          success: false,
          message: `催办失败：${result.message}`,
        });
      }
    } catch (error) {
      console.error('[ApprovalAgent] 催办失败:', error);
      return this.formatResponse({
        success: false,
        message: '催办操作失败：' + (error instanceof Error ? error.message : '未知错误'),
      });
    }
  }

  // ============================================
  // 流程处理
  // ============================================

  /**
   * 处理发起流程
   */
  private async handleLaunchFlow(intent: ParsedIntent, context: AgentContext): Promise<any> {
    const userId = context.userId;
    const businessType = intent.businessType;

    if (!userId) {
      return this.formatResponse({
        success: false,
        message: '无法获取用户信息',
      });
    }

    if (!businessType) {
      return this.formatResponse({
        success: false,
        message: '请告诉我您要申请什么类型的流程',
      });
    }

    // 返回需要打开表单的指令
    return {
      success: true,
      requiresForm: true,
      businessType,
      formUrl: intent.formUrl,
      message: `好的，您要申请「${intent.entities.businessType}」，我将为您打开表单。\n\n请填写表单内容，完成后说"提交"发起流程。`,
    };
  }

  /**
   * 处理查询流程
   */
  private async handleQueryFlow(intent: ParsedIntent, context: AgentContext): Promise<any> {
    const userId = context.userId;

    if (!userId) {
      return this.formatResponse({
        success: false,
        message: '无法获取用户信息',
      });
    }

    try {
      const params: QueryFlowParams = {
        userId,
        pageSize: 20,
      };

      const flows = await flowService.getMyStarted(params);

      if (flows.length === 0) {
        return this.formatResponse({
          success: true,
          message: '您目前没有发起的流程',
          data: [],
        });
      }

      const flowList = flows.map((flow, index) => {
        const statusMap: Record<string, string> = {
          draft: '📝 草稿',
          running: '🔄 进行中',
          completed: '✅ 已完成',
          cancelled: '❌ 已取消',
        };
        return `${index + 1}. ${flow.subject}\n   状态: ${statusMap[flow.status] || flow.status}\n   时间: ${flow.createTime}`;
      }).join('\n\n');

      return this.formatResponse({
        success: true,
        message: `📋 您发起的流程（共 ${flows.length} 条）：\n\n${flowList}`,
        data: flows,
      });
    } catch (error) {
      console.error('[ApprovalAgent] 查询流程失败:', error);
      return this.formatResponse({
        success: false,
        message: '查询流程失败：' + (error instanceof Error ? error.message : '未知错误'),
      });
    }
  }

  /**
   * 处理查询模板
   */
  private async handleQueryTemplate(intent: ParsedIntent, context: AgentContext): Promise<any> {
    try {
      const templates = await flowService.getTemplates();

      if (templates.length === 0) {
        return this.formatResponse({
          success: true,
          message: '目前没有可用的流程模板',
          data: [],
        });
      }

      const templateList = templates.map((t, index) =>
        `${index + 1}. ${t.name || t.id}`
      ).join('\n');

      return this.formatResponse({
        success: true,
        message: `📋 可用的流程模板（共 ${templates.length} 条）：\n\n${templateList}\n\n请告诉我您要申请哪个流程`,
        data: templates,
      });
    } catch (error) {
      console.error('[ApprovalAgent] 查询模板失败:', error);
      return this.formatResponse({
        success: false,
        message: '查询模板失败：' + (error instanceof Error ? error.message : '未知错误'),
      });
    }
  }

  /**
   * 处理打开表单（AI填表）
   */
  private async handleOpenForm(intent: ParsedIntent, context: AgentContext): Promise<any> {
    const businessType = intent.businessType;

    if (!businessType) {
      return this.formatResponse({
        success: false,
        message: '请告诉我您要填写什么表单',
      });
    }

    return {
      success: true,
      requiresForm: true,
      businessType,
      formUrl: intent.formUrl,
      message: `我已为您打开「${intent.entities.businessType}」表单。\n\n请用自然语言告诉我您要填写的内容，例如：\n- "请事假3天，明天开始"\n- "原因：家中有事"\n\n我会自动帮您填写表单。`,
    };
  }

  // ============================================
  // 辅助方法
  // ============================================

  /**
   * 匹配任意关键词
   */
  private matchAny(text: string, keywords: string[]): boolean {
    return keywords.some(kw => text.includes(kw.toLowerCase()));
  }

  /**
   * 获取业务类型编码
   */
  private getBusinessTypeCode(type: string): string {
    const mapping: Record<string, string> = {
      '请假': 'leave',
      '休假': 'leave',
      '报销': 'expense',
      '采购': 'purchase',
      '出差': 'travel',
      '用车': 'vehicle',
      '接待': 'reception',
      '借款': 'loan',
    };
    return mapping[type] || type;
  }

  /**
   * 调用技能（实现抽象方法）
   * ApprovalAgent 不使用技能，直接调用服务层
   */
  protected async callSkill(skillCode: string, params: Record<string, unknown>): Promise<unknown> {
    console.log(`[ApprovalAgent:callSkill] 不使用技能调用，技能代码: ${skillCode}`);
    // ApprovalAgent 架构：直接调用服务层，不通过技能
    return null;
  }

  /**
   * 格式化响应
   */
  private formatResponse(data: {
    success: boolean;
    message: string;
    data?: unknown;
    requiresForm?: boolean;
    businessType?: string;
    formUrl?: string;
  }): any {
    return {
      success: data.success,
      content: data.message,
      defaultMessage: data.message,
      data: data.data,
      agentId: this.agentType,
      timestamp: new Date().toISOString(),
      ...(data.requiresForm && {
        action: {
          type: 'open_form',
          businessType: data.businessType,
          formUrl: data.formUrl,
        },
      }),
    };
  }
}

// ============================================
// 导出单例
// ============================================

export const approvalAgent = new ApprovalAgent();
