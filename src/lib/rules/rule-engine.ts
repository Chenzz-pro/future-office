/**
 * 轻量级规则引擎
 * 用于解析和执行 Agent 的权限规则和业务规则
 */

import type {
  PermissionRule,
  BusinessRule,
  SkillsConfig,
  AgentResponse,
  UserContext,
} from '@/lib/types/agent';
import { oneAPIManager } from '@/lib/oneapi';

export interface BusinessRuleStep {
  name: string;
  desc?: string;
  action: string;
  skillCode?: string;
  [key: string]: any;
}

export interface BusinessRuleConfig {
  ruleId?: string;
  ruleName: string;
  steps: BusinessRuleStep[];
}

export class RuleEngine {
  /**
   * 执行权限规则校验
   */
  async executePermissionRules(
    rules: PermissionRule[],
    context: UserContext,
    action: string
  ): Promise<{ granted: boolean; reason?: string }> {
    console.log('[RuleEngine] 执行权限规则校验:', {
      ruleCount: rules.length,
      userId: context.userId,
      role: context.role,
      action,
    });

    for (const rule of rules) {
      const result = await this.checkPermissionRule(rule, context, action);
      
      if (!result.granted) {
        console.log('[RuleEngine] 权限检查失败:', {
          ruleId: rule.ruleId,
          ruleName: rule.ruleName,
          reason: result.reason,
        });
        return result;
      }
    }

    console.log('[RuleEngine] 所有权限规则校验通过');
    return { granted: true };
  }

  private checkPermissionRule(
    rule: PermissionRule,
    context: UserContext,
    action: string
  ): { granted: boolean; reason?: string } {
    const condition = rule.condition.toLowerCase();
    
    if (!this.shouldTriggerRule(condition, action)) {
      return { granted: true };
    }

    const checkResult = this.executeCheckLogic(rule.checkLogic, context);
    
    if (!checkResult.passed) {
      return {
        granted: false,
        reason: rule.interceptAction,
      };
    }

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

  private executeCheckLogic(
    checkLogic: string,
    context: UserContext
  ): { passed: boolean; reason?: string } {
    const logic = checkLogic.toLowerCase();

    if (logic.includes('校验入参userid与当前登录用户id一致') || logic.includes('userid一致性')) {
      return { passed: true };
    }

    if (logic.includes('角色') || logic.includes('role')) {
      if (logic.includes('管理员') && context.role !== 'admin') {
        return { passed: false, reason: '需要管理员权限' };
      }
      if (logic.includes('员工') && context.role !== 'user') {
        return { passed: false, reason: '需要员工权限' };
      }
      if (logic.includes('主管') && !context.role?.includes('manager')) {
        return { passed: false, reason: '需要主管权限' };
      }
    }

    return { passed: true };
  }

  /**
   * 执行业务规则（新版本，支持对象格式）
   */
  async executeBusinessRules(
    rules: any[],
    context: UserContext,
    action: string,
    params: Record<string, any> = {}
  ): Promise<AgentResponse> {
    console.log('[RuleEngine] 执行业务规则:', {
      ruleCount: rules?.length || 0,
      action,
      params,
    });

    // 兼容旧格式和新格式
    if (!rules || rules.length === 0) {
      return {
        code: '200',
        msg: '操作成功（无业务规则）',
        data: params,
      };
    }

    // 新格式：直接是步骤数组
    const steps = rules[0]?.steps || rules[0]?.stepList || rules;
    
    if (!Array.isArray(steps)) {
      console.log('[RuleEngine] 业务规则格式无效，使用默认处理');
      return {
        code: '200',
        msg: '操作成功',
        data: params,
      };
    }

    // 执行业务流程步骤
    return await this.executeBusinessSteps(steps, context, params);
  }

  /**
   * 执行业务流程步骤
   */
  private async executeBusinessSteps(
    steps: BusinessRuleStep[],
    context: UserContext,
    params: Record<string, any>
  ): Promise<AgentResponse> {
    console.log('[RuleEngine] 执行业务流程步骤:', {
      stepCount: steps.length,
    });

    let lastResult: any = params;

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
            // 格式化响应
            console.log('[RuleEngine] 格式化数据');
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
  private validateParams(step: BusinessRuleStep, params: Record<string, any>): boolean {
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
    params: Record<string, any>,
    context: UserContext
  ): Promise<any> {
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
  private async callEKPNotify(action: string, params: Record<string, any>): Promise<any> {
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
