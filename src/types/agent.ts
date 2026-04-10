/**
 * Agent类型定义
 * 定义多Agent协作系统的核心类型
 */

// Agent类型枚举
export type AgentType = 'root' | 'approval' | 'meeting' | 'data' | 'assistant';

// Agent配置接口
export interface AgentConfig {
  type: AgentType;
  name: string;
  description: string;
  skills: string[]; // 可调用的技能标识
  systemPrompt: string; // 系统提示词
}

// 意图识别结果
export interface Intent {
  agentType: AgentType;
  skill?: string; // 具体调用的技能
  confidence: number; // 置信度 (0-1)
  reasoning: string; // 推理过程
}

// Agent执行上下文
export interface AgentContext {
  userId: string; // 用户ID
  deptId: string; // 部门ID
  role: string; // 用户角色
  message: string; // 用户消息
  conversationHistory: Array<{ role: string; content: string }>; // 对话历史
  formUrl?: string; // 表单URL（用于发起流程）
}

// Agent执行结果
export interface AgentResult {
  success: boolean;
  data?: unknown;
  error?: string;
  agentType: AgentType;
}

// LLM响应接口
export interface LLMResponse {
  success: boolean;
  content?: string;
  error?: string;
}

// 意图识别请求接口
export interface IntentRequest {
  message: string;
  userId: string;
  deptId: string;
  role: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

// 意图识别响应接口
export interface IntentResponse {
  agentType: string;
  skill?: string;
  confidence: number;
  reasoning: string;
}
