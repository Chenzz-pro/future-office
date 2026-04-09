/**
 * oneAPI配置类型定义
 */

export interface OneAPIConfig {
  id: string;
  name: string;
  baseUrl: string; // oneAPI服务地址
  apiKey: string; // oneAPI令牌
  model: string; // 模型名称（如gpt-4, gpt-3.5-turbo等）
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OneAPIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OneAPIRequest {
  model: string;
  messages: OneAPIMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface OneAPIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
