/**
 * 业务 Agent 基类
 * 新架构：纯代码逻辑，不使用LLM，依赖规则引擎和技能调用
 */

import { agentRepository } from '@/lib/database/repositories/agent.repository';
import { ruleEngine, BusinessRuleConfig } from '@/lib/rules/rule-engine';
import type {
  AgentResponse,
  UserContext,
  IntentResult,
  AgentConfig,
  PermissionRule,
} from '@/lib/types/agent';

export abstract class BaseBusinessAgent {
  protected agentType: string;
  protected config: AgentConfig | null = null;
  protected permissionRules: PermissionRule[] = [];
  protected businessRules: BusinessRuleConfig[] = [];

  constructor(agentType: string) {
    this.agentType = agentType;
  }

  /**
   * 初始化（加载配置和规则）
   */
  async initialize(): Promise<void> {
    console.log(`[${this.agentType}] 开始初始化...`);

    try {
      // 加载 Agent 配置
      this.config = await agentRepository.findByType(this.agentType);

      if (!this.config) {
        throw new Error(`未找到 Agent 配置: ${this.agentType}`);
      }

      console.log(`[${this.agentType}] 配置加载成功:`, this.config.name);

      // 加载权限规则（确保是数组）
      if (this.config.permissionRules && Array.isArray(this.config.permissionRules)) {
        this.permissionRules = this.config.permissionRules;
        console.log(`[${this.agentType}] 权限规则加载成功:`, this.permissionRules.length);
      } else {
        this.permissionRules = [];
        console.log(`[${this.agentType}] 权限规则为空或无效，使用空数组`);
      }

      // 加载业务规则（兼容数组和对象格式）
      if (this.config.businessRules) {
        if (Array.isArray(this.config.businessRules)) {
          this.businessRules = this.config.businessRules as unknown as BusinessRuleConfig[];
        } else if (typeof this.config.businessRules === 'object') {
          // 兼容对象格式：将对象包装为数组
          this.businessRules = [this.config.businessRules as unknown as BusinessRuleConfig];
        } else {
          this.businessRules = [];
        }
        console.log(`[${this.agentType}] 业务规则加载成功:`, this.businessRules.length);
      } else {
        this.businessRules = [];
        console.log(`[${this.agentType}] 业务规则为空或无效，使用空数组`);
      }

      console.log(`[${this.agentType}] 初始化完成`);
    } catch (error) {
      console.error(`[${this.agentType}] 初始化失败:`, error);
      throw error;
    }
  }

  /**
   * 执行任务（主入口）
   * @param intent 意图识别结果
   * @param userContext 用户上下文
   * @returns 执行结果
   */
  async execute(intent: IntentResult, userContext: UserContext): Promise<AgentResponse> {
    console.log(`[${this.agentType}] 开始执行任务:`, {
      action: intent.action,
      userId: userContext.userId,
    });

    try {
      // 1. 确保已初始化
      if (!this.config) {
        await this.initialize();
      }

      // 2. 权限校验（业务数据权限）
      const permissionResult = await this.checkPermission(intent.action, userContext);
      if (!permissionResult.granted) {
        return {
          code: '403',
          msg: permissionResult.reason || '无权限执行此操作',
          data: null,
          agentType: this.agentType,
          permissionChecked: true,
          permissionGranted: false,
          skillCalled: false,
        };
      }

      console.log(`[${this.agentType}] 权限校验通过`);

      // 3. 执行业务规则
      const businessResult = await this.executeBusinessLogic(
        intent.action,
        userContext,
        intent.context.params || {}
      );

      console.log(`[${this.agentType}] 业务规则执行完成:`, businessResult);

      // ⚠️ 重要：如果是 403 权限拒绝，permissionGranted 应该为 false
      const isForbidden = businessResult.code === '403';

      // 添加执行日志
      return {
        ...businessResult,
        agentType: this.agentType,
        permissionChecked: true,
        permissionGranted: !isForbidden,
        skillCalled: businessResult.skillCalled || false,
      };
    } catch (error) {
      console.error(`[${this.agentType}] 执行失败:`, error);
      return {
        code: '500',
        msg: error instanceof Error ? error.message : '执行失败',
        data: null,
        agentType: this.agentType,
        permissionChecked: false,
        permissionGranted: false,
        skillCalled: false,
      };
    }
  }

  /**
   * 权限校验（业务数据权限）
   * @param action 执行的操作
   * @param userContext 用户上下文
   * @returns 校验结果
   */
  protected async checkPermission(
    action: string,
    userContext: UserContext
  ): Promise<{ granted: boolean; reason?: string }> {
    console.log(`[${this.agentType}] 开始业务权限校验:`, {
      action,
      userId: userContext.userId,
      role: userContext.role,
    });

    // 如果没有配置权限规则，默认允许
    if (this.permissionRules.length === 0) {
      console.log(`[${this.agentType}] 无权限规则配置，默认允许`);
      return { granted: true };
    }

    // 使用规则引擎执行权限规则校验
    return await ruleEngine.executePermissionRules(
      this.permissionRules,
      userContext,
      action
    );
  }

  /**
   * 执行业务逻辑
   * @param action 执行的操作
   * @param userContext 用户上下文
   * @param params 参数
   * @returns 执行结果
   */
  protected async executeBusinessLogic(
    action: string,
    userContext: UserContext,
    params: Record<string, any>
  ): Promise<AgentResponse> {
    if (this.businessRules.length === 0) {
      // 没有配置业务规则，直接返回
      return {
        code: '200',
        msg: '操作成功',
        data: params,
      };
    }

    return await ruleEngine.executeBusinessRules(
      this.businessRules,
      userContext,
      action,
      params
    );
  }

  /**
   * 调用技能（由子类实现具体逻辑）
   * @param skillCode 技能代码
   * @param params 参数
   * @returns 执行结果
   */
  protected abstract callSkill(skillCode: string, params: Record<string, any>): Promise<any>;

  /**
   * 获取 Agent 配置
   */
  getConfig(): AgentConfig | null {
    return this.config;
  }

  /**
   * 获取权限规则
   */
  getPermissionRules(): PermissionRule[] {
    return this.permissionRules;
  }

  /**
   * 获取业务规则
   */
  getBusinessRules(): BusinessRuleConfig[] {
    return this.businessRules;
  }
}
