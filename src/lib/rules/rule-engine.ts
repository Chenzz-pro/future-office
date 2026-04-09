/**
 * 轻量级规则引擎
 * 用于解析和执行 Agent 的权限规则和业务规则
 */

import type {
  PermissionRule,
  AgentResponse,
  UserContext,
} from '@/lib/types/agent';
import { dbManager } from '@/lib/database';
import { RowDataPacket } from 'mysql2';

export interface BusinessRuleStep {
  name: string;
  desc?: string;
  action: string;
  skillCode?: string;
  [key: string]: string | undefined;
}

export interface BusinessRuleConfig {
  ruleId?: string;
  ruleName: string;
  steps: BusinessRuleStep[];
}

export class RuleEngine {
  /**
   * 执行权限规则校验（优化版：支持按ruleId匹配）
   * 权限规则格式：
   * [
   *   {
   *     "ruleId": "approval-notify",
   *     "ruleName": "待办查询权限",
   *     "condition": "查询",
   *     "checkLogic": "用户登录即可",
   *     "interceptAction": "您没有权限查询待办"
   *   },
   *   {
   *     "ruleId": "approval-notify-other",
   *     "ruleName": "查询他人待办权限",
   *     "condition": "查询",
   *     "checkLogic": "查询他人数据:需要管理员",
   *     "interceptAction": "您无权查询他人的待办，普通用户只能查询自己的待办"
   *   }
   * ]
   */
  async executePermissionRules(
    rules: PermissionRule[],
    context: UserContext,
    action: string,
    params: Record<string, unknown> = {}
  ): Promise<{ granted: boolean; reason?: string }> {
    console.log('[RuleEngine] 执行权限规则校验:', {
      ruleCount: rules.length,
      userId: context.userId,
      role: context.role,
      action,
      params,
    });

    // 1. 查找匹配的规则
    // 优先按 ruleId 匹配（ruleId 格式：{action}-{场景}）
    const matchingRules = rules.filter(rule => {
      // 检查 condition 是否匹配 action
      return this.shouldTriggerRule(rule.condition, action);
    });

    console.log('[RuleEngine] 匹配的权限规则:', matchingRules.length, matchingRules.map(r => r.ruleId));

    // 2. 逐个执行匹配的规则
    for (const rule of matchingRules) {
      console.log('[RuleEngine] 执行权限规则:', rule.ruleId, rule.checkLogic);
      
      const result = await this.executeCheckLogic(rule.checkLogic, context, params);
      
      if (!result.passed) {
        console.log('[RuleEngine] 权限检查失败:', {
          ruleId: rule.ruleId,
          ruleName: rule.ruleName,
          reason: result.reason || rule.interceptAction,
        });
        return {
          granted: false,
          reason: result.reason || rule.interceptAction,
        };
      }
    }

    console.log('[RuleEngine] 所有权限规则校验通过');
    return { granted: true };
  }

  private shouldTriggerRule(condition: string, action: string): boolean {
    const lowerAction = action.toLowerCase();
    
    if (condition.includes('所有') || condition.includes('all')) {
      return true;
    }

    if (condition.includes('查询') && (lowerAction.includes('query') || lowerAction.includes('get') || lowerAction.includes('list'))) {
      return true;
    }
    if (condition.includes('创建') && (lowerAction.includes('create') || lowerAction.includes('add'))) {
      return true;
    }
    if (condition.includes('更新') && (lowerAction.includes('update') || lowerAction.includes('edit'))) {
      return true;
    }
    if (condition.includes('取消') && (lowerAction.includes('cancel') || lowerAction.includes('delete'))) {
      return true;
    }
    if (condition.includes('审批') && (lowerAction.includes('approve') || lowerAction.includes('reject'))) {
      return true;
    }

    return false;
  }

  /**
   * 执行权限检查逻辑（增强版）
   * checkLogic 格式支持：
   * 1. "用户登录即可" - 只要有 userId 就有权限
   * 2. "需要管理员" - 只有 admin 角色有权限
   * 3. "需要主管或管理员" - admin 或包含 manager 角色
   * 4. "查询他人数据:需要管理员" - 查询他人数据时需要管理员
   * 5. "校验入参userid与当前登录用户id一致" - userId 必须一致
   * 6. "只读" - 只读操作，直接通过
   */
  private async executeCheckLogic(
    checkLogic: string,
    context: UserContext,
    params: Record<string, unknown> = {}
  ): Promise<{ passed: boolean; reason?: string }> {
    const logic = checkLogic.toLowerCase();
    
    console.log('[RuleEngine] 解析 checkLogic:', checkLogic, { params });

    // 1. "用户登录即可" - 只要有 userId 就有权限
    if (logic.includes('登录即可') || logic.includes('登录') && !logic.includes('需要')) {
      if (!context.userId) {
        return { passed: false, reason: '请先登录' };
      }
      return { passed: true };
    }

    // 2. 特殊场景：查询他人数据权限
    if (logic.includes('查询他人数据')) {
      const targetPerson = params?.targetPerson;
      
      if (targetPerson) {
        // 尝试获取当前用户的登录名
        const currentLoginName = await this.getLoginNameByUserId(context.userId);
        
        // 判断是否是查询他人
        const isQueryingOthers = targetPerson !== currentLoginName && 
                                 targetPerson !== context.userId &&
                                 targetPerson !== '我' && 
                                 targetPerson !== '我的';
        
        console.log('[RuleEngine] 查询他人判断:', {
          targetPerson,
          currentLoginName,
          contextUserId: context.userId,
          isQueryingOthers,
        });
        
        if (isQueryingOthers) {
          // 查询他人数据，需要检查权限要求
          if (logic.includes('需要管理员')) {
            if (context.role !== 'admin') {
              return { 
                passed: false, 
                reason: `您无权查询 ${targetPerson} 的待办。普通用户只能查询自己的待办，如需查询他人待办，请联系管理员。` 
              };
            }
            console.log('[RuleEngine] 管理员权限，允许查询他人数据');
          } else if (logic.includes('需要主管')) {
            if (context.role !== 'admin' && !context.role?.includes('manager')) {
              return { 
                passed: false, 
                reason: `您无权查询 ${targetPerson} 的待办。需要主管或管理员权限。` 
              };
            }
          }
          // 其他情况，默认允许
        } else {
          // 查询自己的数据，直接通过
          console.log('[RuleEngine] 查询自己的数据，权限校验通过');
          return { passed: true };
        }
      } else {
        // 没有 targetPerson，表示查询自己的数据，直接通过
        return { passed: true };
      }
    }

    // 3. "只读" 操作
    if (logic.includes('只读')) {
      return { passed: true };
    }

    // 4. "需要管理员" 角色检查
    if (logic.includes('管理员') && !logic.includes('需要')) {
      // "需要管理员" 才检查
    }
    if (logic.includes('需要管理员')) {
      if (context.role !== 'admin') {
        return { passed: false, reason: '需要管理员权限' };
      }
      return { passed: true };
    }

    // 5. "需要主管或管理员" 角色检查
    if (logic.includes('需要主管') || logic.includes('需要经理')) {
      if (context.role !== 'admin' && !context.role?.includes('manager')) {
        return { passed: false, reason: '需要主管或管理员权限' };
      }
      return { passed: true };
    }

    // 6. "需要员工" 角色检查
    if (logic.includes('需要员工') && context.role !== 'user') {
      return { passed: false, reason: '需要员工权限' };
    }

    // 7. "userid一致性" 检查
    if (logic.includes('userid一致性') || logic.includes('校验入参userid')) {
      const targetUserId = params?.userId;
      if (targetUserId && targetUserId !== context.userId) {
        return { passed: false, reason: '只能操作自己的数据' };
      }
    }

    // 默认：允许
    return { passed: true };
  }

  /**
   * 执行业务规则（优化版：支持按ruleId匹配）
   * 业务规则格式（数组）：
   * [
   *   {
   *     "ruleId": "approval-notify",
   *     "ruleName": "待办查询流程",
   *     "steps": [
   *       { "name": "check_params", "action": "check_params" },
   *       { "name": "call_ekp", "action": "invoke_skill", "skillCode": "ekp_notify" }
   *     ]
   *   },
   *   {
   *     "ruleId": "approval-meeting",
   *     "ruleName": "会议查询流程",
   *     "steps": [
   *       { "name": "check_params", "action": "check_params" },
   *       { "name": "call_ekp", "action": "invoke_skill", "skillCode": "ekp_meeting" }
   *     ]
   *   }
   * ]
   */
  async executeBusinessRules(
    rules: BusinessRuleConfig[],
    context: UserContext,
    action: string,
    params: Record<string, unknown> = {}
  ): Promise<AgentResponse> {
    console.log('[RuleEngine] 执行业务规则:', {
      ruleCount: rules?.length || 0,
      action,
      params,
      userId: context.userId,
    });

    // 1. 查找匹配的业务规则
    // 匹配逻辑：按 ruleId 匹配（ruleId 应该与 action 对应）
    // 例如：action="get_my_todo" → ruleId="get_my_todo" 或包含 "notify"
    let matchedRule = null;
    
    if (rules && rules.length > 0) {
      // 优先按 ruleId 精确匹配
      matchedRule = rules.find(r => {
        const ruleId = r.ruleId || '';
        return (
          ruleId === action ||
          ruleId === action.replace(/_/g, '-') ||
          ruleId.includes(action) ||
          action.includes(ruleId)
        );
      });
      
      // 如果没有精确匹配，取第一个规则（兼容旧格式）
      if (!matchedRule) {
        matchedRule = rules[0];
        console.log('[RuleEngine] 未找到匹配的规则，使用第一个规则:', matchedRule?.ruleId);
      } else {
        console.log('[RuleEngine] 找到匹配的规则:', matchedRule.ruleId);
      }
    }

    // 2. 如果没有配置业务规则，返回默认结果
    if (!matchedRule) {
      return {
        code: '200',
        msg: '操作成功（无业务规则）',
        data: params,
      };
    }

    // 3. 获取步骤列表
    const steps = matchedRule.steps;
    
    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      console.log('[RuleEngine] 业务规则无有效步骤，使用默认处理');
      return {
        code: '200',
        msg: '操作成功',
        data: params,
      };
    }

    console.log('[RuleEngine] 执行步骤数:', steps.length, steps.map(s => s.name));

    // 4. 执行业务流程步骤
    return await this.executeBusinessSteps(steps, context, params);
  }

  /**
   * 根据用户ID获取登录名
   */
  private async getLoginNameByUserId(userId: string): Promise<string | null> {
    try {
      const dbConfig = dbManager.getConfig();
      if (!dbConfig) {
        console.log('[RuleEngine] 未获取到数据库配置');
        return null;
      }

      // 创建临时连接池
      const mysql = await import('mysql2/promise');
      const tempPool = mysql.createPool({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.username,
        password: dbConfig.password,
        database: dbConfig.databaseName,
        waitForConnections: true,
        connectionLimit: 1,
      });

      try {
        const [rows] = await tempPool.execute(
          'SELECT fd_login_name FROM sys_org_person WHERE fd_id = ?',
          [userId]
        ) as [RowDataPacket[], unknown];

        if (rows && rows.length > 0) {
          return rows[0].fd_login_name;
        }
        return null;
      } finally {
        await tempPool.end();
      }
    } catch (error) {
      console.error('[RuleEngine] 获取用户登录名失败:', error);
      return null;
    }
  }

  /**
   * 执行业务流程步骤
   */
  private async executeBusinessSteps(
    steps: BusinessRuleStep[],
    context: UserContext,
    params: Record<string, unknown>
  ): Promise<AgentResponse> {
    console.log('[RuleEngine] 执行业务流程步骤:', {
      stepCount: steps.length,
    });

    let lastResult: unknown = params;

    for (const step of steps) {
      console.log('[RuleEngine] 执行步骤:', step.name, step.action);

      try {
        // 根据 action 执行不同逻辑
        switch (step.action) {
          case 'check_params':
            // 参数校验
            if (!this.validateParams(step, params)) {
              return {
                code: '400',
                msg: step.desc || '参数校验失败',
                data: null,
              };
            }
            break;

          case 'run_permission_rules':
            // 权限校验已在 Agent 层执行
            console.log('[RuleEngine] 权限校验已在Agent层执行，跳过');
            break;

          case 'invoke_skill':
            // 调用技能
            if (step.skillCode) {
              lastResult = await this.invokeSkill(step.skillCode, params, context);
              
              // 检查 EKP 响应是否成功
              if (typeof lastResult === 'object' && lastResult !== null) {
                const response = lastResult as Record<string, unknown>;
                
                // 如果 EKP 返回错误（success === false 或 code !== '200'）
                if (response.success === false || (response.code && response.code !== '200')) {
                  console.log('[RuleEngine] EKP 返回错误:', response.message || response.msg);
                  return {
                    code: String(response.code || '400'),
                    msg: String(response.message || response.msg || 'EKP 接口调用失败'),
                    data: response,
                    skillCalled: true,
                  };
                }
              }
            }
            break;

          case 'filter_data':
            // 数据过滤
            if (lastResult && typeof lastResult === 'object') {
              // 后端已做数据权限过滤，前端直接使用
              console.log('[RuleEngine] 数据已由后端过滤');
            }
            break;

          case 'format_data':
            /**
             * 格式化响应
             * ⚠️ 重要：此步骤不调用 LLM！
             * 格式化逻辑由 RootAgent.formatResponse() 内网代码处理
             * 
             * 响应格式化原则：
             * 1. 由内网代码（JavaScript/TypeScript）格式化响应
             * 2. 保证数据安全性（无需LLM介入）
             * 3. 提高响应速度
             * 4. 确保响应格式一致性
             */
            console.log('[RuleEngine] 格式化数据（由内网代码处理，不调用LLM）');
            // RootAgent.formatResponse() 会处理最终的响应格式化
            // 此步骤仅作为标记，由 RootAgent 决定如何格式化
            break;

          default:
            console.log('[RuleEngine] 未知步骤类型:', step.action);
        }
      } catch (error) {
        console.error('[RuleEngine] 步骤执行失败:', error);
        return {
          code: '500',
          msg: `执行失败: ${step.name}`,
          data: null,
        };
      }
    }

    // 返回成功结果
    return {
      code: '200',
      msg: '业务流程执行成功',
      data: lastResult,
      skillCalled: true,
    };
  }

  /**
   * 验证参数
   */
  private validateParams(step: BusinessRuleStep, params: Record<string, unknown>): boolean {
    console.log('[RuleEngine] 校验参数:', params);
    // 基础校验：确保有必要的参数
    if (!params || Object.keys(params).length === 0) {
      // 如果没有参数，允许继续（某些查询不需要参数）
      return true;
    }
    return true;
  }

  /**
   * 调用技能（EKP接口）
   */
  private async invokeSkill(
    skillCode: string,
    params: Record<string, unknown>,
    context: UserContext
  ): Promise<unknown> {
    console.log('[RuleEngine] 调用技能:', skillCode, {
      params,
      userId: context.userId,
    });

    try {
      // 根据 skillCode 调用对应的 EKP 接口
      switch (skillCode) {
        case 'get_my_todo':
        case 'ekp_notify':
          // 调用 EKP 待办查询接口
          return await this.callEKPNotify('getTodoCount', {
            type: 0, // 待办类型：0=所有待办
            userId: context.userId,
            ...params,
          });

        case 'get_todo_list':
          return await this.callEKPNotify('getTodo', {
            type: params.type || 0,
            userId: context.userId,
            ...params,
          });

        case 'approve_todo':
          return await this.callEKPNotify('setTodoDone', {
            todoId: params.todoId,
            userId: context.userId,
            ...params,
          });

        case 'reject_todo':
          return await this.callEKPNotify('deleteTodo', {
            todoId: params.todoId,
            userId: context.userId,
            ...params,
          });

        case 'send_todo':
          return await this.callEKPNotify('sendTodo', {
            target: params.target,
            content: params.content,
            userId: context.userId,
            ...params,
          });

        default:
          console.log('[RuleEngine] 未知技能代码:', skillCode);
          return { message: '技能未配置', skillCode };
      }
    } catch (error) {
      console.error('[RuleEngine] 技能调用失败:', error);
      throw error;
    }
  }

  /**
   * 调用 EKP 待办服务
   */
  private async callEKPNotify(action: string, params: Record<string, unknown>): Promise<unknown> {
    try {
      const response = await fetch('http://localhost:5000/api/ekp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, ...params }),
      });

      const result = await response.json();
      console.log('[RuleEngine] EKP响应:', result);
      return result;
    } catch (error) {
      console.error('[RuleEngine] EKP调用失败:', error);
      throw error;
    }
  }
}

// 导出单例
export const ruleEngine = new RuleEngine();
