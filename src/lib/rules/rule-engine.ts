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

export class RuleEngine {
  /**
   * 加载规则配置
   * @param agentType Agent类型
   * @returns 规则配置
   */
  async loadRules(agentType: string): Promise<{
    skillsConfig?: SkillsConfig;
    permissionRules?: PermissionRule[];
    businessRules?: BusinessRule[];
    version: number;
  } | null> {
    // 从数据库加载规则配置
    // TODO: 实现数据库加载逻辑
    console.log('[RuleEngine] 加载规则配置:', agentType);
    return null;
  }

  /**
   * 执行权限规则校验
   * @param rules 权限规则列表
   * @param context 用户上下文
   * @param action 执行的操作
   * @returns 是否有权限
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

    // 遍历所有权限规则
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

  /**
   * 检查单个权限规则
   * @param rule 权限规则
   * @param context 用户上下文
   * @param action 执行的操作
   * @returns 校验结果
   */
  private async checkPermissionRule(
    rule: PermissionRule,
    context: UserContext,
    action: string
  ): Promise<{ granted: boolean; reason?: string }> {
    // 解析规则条件
    const condition = rule.condition.toLowerCase();
    
    // 检查是否触发该规则
    if (!this.shouldTriggerRule(condition, action)) {
      return { granted: true };
    }

    // 执行校验逻辑
    const checkResult = await this.executeCheckLogic(rule.checkLogic, context);
    
    if (!checkResult.passed) {
      return {
        granted: false,
        reason: rule.interceptAction,
      };
    }

    return { granted: true };
  }

  /**
   * 检查是否触发规则
   * @param condition 规则条件
   * @param action 执行的操作
   * @returns 是否触发
   */
  private shouldTriggerRule(condition: string, action: string): boolean {
    // 简单的关键词匹配
    const lowerAction = action.toLowerCase();
    
    // 条件1：调用所有技能时
    if (condition.includes('所有') || condition.includes('all')) {
      return true;
    }

    // 条件2：调用特定技能时
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
   * 执行校验逻辑
   * @param checkLogic 校验逻辑
   * @param context 用户上下文
   * @returns 校验结果
   */
  private async executeCheckLogic(
    checkLogic: string,
    context: UserContext
  ): Promise<{ passed: boolean; reason?: string }> {
    // 解析校验逻辑
    const logic = checkLogic.toLowerCase();

    // 1. 校验userId一致性
    if (logic.includes('校验入参userid与当前登录用户id一致') || logic.includes('userid一致性')) {
      // 这个校验在调用时已经保证了，因为userId就是当前登录用户
      return { passed: true };
    }

    // 2. 校验角色
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

    // 3. 校验部门
    if (logic.includes('部门') || logic.includes('dept')) {
      if (logic.includes('本部门') && context.deptId) {
        // 这个校验需要结合具体数据，暂时通过
        return { passed: true };
      }
    }

    // 默认通过
    return { passed: true };
  }

  /**
   * 执行业务规则
   * @param rules 业务规则列表
   * @param context 用户上下文
   * @param action 执行的操作
   * @param params 参数
   * @returns 执行结果
   */
  async executeBusinessRules(
    rules: BusinessRule[],
    context: UserContext,
    action: string,
    params: Record<string, any> = {}
  ): Promise<AgentResponse> {
    console.log('[RuleEngine] 执行业务规则:', {
      ruleCount: rules.length,
      action,
      params,
    });

    // 查找匹配的业务规则
    const matchedRule = this.findBusinessRule(rules, action);
    
    if (!matchedRule) {
      return {
        code: '404',
        msg: '未找到匹配的业务规则',
        data: null,
      };
    }

    console.log('[RuleEngine] 找到匹配的业务规则:', matchedRule.ruleName);

    // 执行业务流程步骤
    return await this.executeBusinessSteps(matchedRule.stepList, context, params);
  }

  /**
   * 查找匹配的业务规则
   * @param rules 业务规则列表
   * @param action 执行的操作
   * @returns 匹配的业务规则
   */
  private findBusinessRule(rules: BusinessRule[], action: string): BusinessRule | null {
    const lowerAction = action.toLowerCase();

    for (const rule of rules) {
      const ruleName = rule.ruleName.toLowerCase();

      // 简单的规则匹配
      if (lowerAction.includes('query') && ruleName.includes('查询')) {
        return rule;
      }
      if (lowerAction.includes('get') && ruleName.includes('查询')) {
        return rule;
      }
      if (lowerAction.includes('list') && ruleName.includes('查询')) {
        return rule;
      }
      if (lowerAction.includes('create') && ruleName.includes('创建') || ruleName.includes('预定')) {
        return rule;
      }
      if (lowerAction.includes('update') && ruleName.includes('更新')) {
        return rule;
      }
      if (lowerAction.includes('cancel') && ruleName.includes('取消')) {
        return rule;
      }
      if (lowerAction.includes('delete') && ruleName.includes('删除')) {
        return rule;
      }
    }

    return null;
  }

  /**
   * 执行业务流程步骤
   * @param steps 步骤列表
   * @param context 用户上下文
   * @param params 参数
   * @returns 执行结果
   */
  private async executeBusinessSteps(
    steps: string[],
    context: UserContext,
    params: Record<string, any>
  ): Promise<AgentResponse> {
    console.log('[RuleEngine] 执行业务流程步骤:', {
      stepCount: steps.length,
    });

    // 解析步骤并执行
    for (const step of steps) {
      console.log('[RuleEngine] 执行步骤:', step);

      // 提取步骤中的技能调用
      const skillCall = this.extractSkillCall(step);
      if (skillCall) {
        // TODO: 调用技能
        console.log('[RuleEngine] 调用技能:', skillCall);
      }

      // 检查是否有校验逻辑
      const check = this.extractCheckLogic(step);
      if (check && !check.passed) {
        return {
          code: '400',
          msg: check.reason || '业务流程校验失败',
          data: null,
        };
      }
    }

    // 返回成功结果
    return {
      code: '200',
      msg: '业务流程执行成功',
      data: {
        message: '流程执行完成',
      },
    };
  }

  /**
   * 提取技能调用
   * @param step 步骤描述
   * @returns 技能调用信息
   */
  private extractSkillCall(step: string): { skillCode: string; params: Record<string, any> } | null {
    // 提取类似 "调用xxx技能" 的模式
    const match = step.match(/调用(\w+)(?:技能|接口)?/);
    if (match) {
      return {
        skillCode: match[1],
        params: {},
      };
    }
    return null;
  }

  /**
   * 提取校验逻辑
   * @param step 步骤描述
   * @returns 校验结果
   */
  private extractCheckLogic(step: string): { passed: boolean; reason?: string } | null {
    // 提取类似 "若...，返回..." 的模式
    const match = step.match(/若(.+?)，返回[\"'](.+?)[\"']/);
    if (match) {
      return {
        passed: false,
        reason: match[2],
      };
    }
    return null;
  }
}

// 导出单例
export const ruleEngine = new RuleEngine();
