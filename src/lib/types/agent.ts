/**
 * Agent 类型定义
 * 新架构：RootAgent + 业务Agent + 规则引擎
 */

// 统一返回格式
export interface AgentResponse {
  code: string;                      // '200' | '403' | '500' | '404'
  msg: string;                       // 提示信息
  data: any;                         // 返回数据
  agentType?: string;                // Agent类型（用于测试日志）
  permissionChecked?: boolean;       // 是否进行了权限检查（用于测试日志）
  permissionGranted?: boolean;       // 权限检查结果（用于测试日志）
  skillCalled?: boolean;             // 是否调用了技能（用于测试日志）
}

// 意图识别结果
export interface IntentResult {
  agentId: string;
  action: string;
  context: {
    userId: string;
    deptId?: string;
    params: Record<string, any>;
  };
}

// Agent类型
export type AgentType = 'root' | 'business';

// Agent业务类型
export type AgentBusinessType = 'root' | 'approval' | 'meeting' | 'data' | 'assistant';

// Agent配置
export interface AgentConfig {
  id: string;
  type: AgentBusinessType;
  agentType: AgentType;
  name: string;
  description: string;
  avatar: string;
  systemPrompt: string;
  enabled: boolean;
  skillsConfig?: SkillsConfig;
  permissionRules?: PermissionRule[];
  businessRules?: BusinessRule[];
  version: number;
  skills?: string[];
  bots?: Array<{ id: string; name: string }>;
  createdAt: Date;
  updatedAt: Date;
}

// 技能绑定配置
export interface SkillsConfig {
  skills: SkillBinding[];
}

export interface SkillBinding {
  skillCode: string;
  skillName: string;
  apiPath: string;
  desc: string;
}

// 权限规则配置
export interface PermissionRule {
  ruleId: string;
  ruleName: string;
  condition: string;
  checkLogic: string;
  interceptAction: string;
}

// 业务规则配置
export interface BusinessRule {
  ruleId: string;
  ruleName: string;
  stepList: string[];
}

// 用户上下文
export interface UserContext {
  userId: string;
  userName?: string;
  deptId?: string;
  role?: string;
  isAdmin?: boolean;
}

// Agent执行上下文（业务Agent内部使用）
export interface AgentContext {
  userId: string;
  deptId?: string;
  role?: string;
  message?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  formUrl?: string;
}

// LLM配置
export interface LLMConfig {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  model?: string;
}
