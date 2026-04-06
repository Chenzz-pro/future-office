/**
 * oneAPI客户端类
 * 用于调用oneAPI服务进行大模型对话
 */

import type {
  OneAPIConfig,
  OneAPIRequest,
  OneAPIResponse,
  OneAPIMessage,
} from './types';

export class OneAPIClient {
  private config: OneAPIConfig;

  constructor(config: OneAPIConfig) {
    this.config = config;
  }

  /**
   * 聊天对话
   * @param messages 消息列表
   * @param options 额外选项
   * @returns 响应内容
   */
  async chat(
    messages: OneAPIMessage[],
    options: {
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    } = {}
  ): Promise<string> {
    if (!this.config.enabled) {
      throw new Error('oneAPI服务未启用');
    }

    const { temperature = 0.7, maxTokens = 2000, stream = false } = options;

    const requestBody: OneAPIRequest = {
      model: this.config.model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream,
    };

    console.log('[OneAPIClient] 发送请求:', {
      baseUrl: this.config.baseUrl,
      model: this.config.model,
      messageCount: messages.length,
    });

    try {
      // 添加超时控制（10秒 - 缩短超时时间以快速失败）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error('[OneAPIClient] 请求超时（10秒），中断请求');
      }, 10000);

      try {
        // 处理 baseUrl，确保不会重复 /v1 路径
        let apiUrl = this.config.baseUrl;
        // 如果 baseUrl 以 /V1 或 /v1 结尾，去掉它
        if (apiUrl.endsWith('/V1') || apiUrl.endsWith('/v1')) {
          apiUrl = apiUrl.slice(0, -3);
        }
        // 确保 baseUrl 不以 / 结尾
        if (apiUrl.endsWith('/')) {
          apiUrl = apiUrl.slice(0, -1);
        }

        const fullUrl = `${apiUrl}/v1/chat/completions`;
        console.log('[OneAPIClient] 完整 URL:', fullUrl);
        console.log('[OneAPIClient] 开始发送请求...');

        const requestStartTime = Date.now();

        const response = await fetch(fullUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        const requestDuration = Date.now() - requestStartTime;
        console.log('[OneAPIClient] 收到响应:', {
          status: response.status,
          duration: `${requestDuration}ms`,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[OneAPIClient] 请求失败:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
          });
          throw new Error(`oneAPI请求失败: ${response.status} ${response.statusText}`);
        }

        console.log('[OneAPIClient] 开始解析响应 JSON...');
        const data: OneAPIResponse = await response.json();

        if (!data.choices || data.choices.length === 0) {
          throw new Error('oneAPI返回的响应为空');
        }

        const content = data.choices[0].message.content;
        console.log('[OneAPIClient] 请求成功:', {
          tokens: data.usage?.total_tokens,
          contentLength: content.length,
          duration: `${Date.now() - requestStartTime}ms`,
        });

        return content;
      } catch (error) {
        clearTimeout(timeoutId);
        const isAbort = error instanceof Error && error.name === 'AbortError';
        if (isAbort) {
          console.error('[OneAPIClient] 请求被中断（超时）');
        } else {
          console.error('[OneAPIClient] 请求异常:', {
            message: error instanceof Error ? error.message : '未知错误',
            name: error instanceof Error ? error.name : 'Unknown',
          });
        }
        throw error;
      }
    } catch (error) {
      console.error('[OneAPIClient] 调用失败:', error);
      throw error;
    }
  }

  /**
   * 流式聊天（用于打字机效果）
   * @param messages 消息列表
   * @param onChunk 接收数据块的回调
   * @param options 额外选项
   */
  async chatStream(
    messages: OneAPIMessage[],
    onChunk: (chunk: string) => void,
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('oneAPI服务未启用');
    }

    const { temperature = 0.7, maxTokens = 2000 } = options;

    const requestBody: OneAPIRequest = {
      model: this.config.model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    };

    console.log('[OneAPIClient] 发送流式请求');

    try {
      const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`oneAPI请求失败: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.slice(6);
            if (data === '[DONE]') {
              return;
            }

            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                onChunk(content);
              }
            } catch (error) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      console.error('[OneAPIClient] 流式调用失败:', error);
      throw error;
    }
  }

  /**
   * 测试连接
   * @returns 是否连接成功
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/v1/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('[OneAPIClient] 连接测试失败:', error);
      return false;
    }
  }

  /**
   * 更新配置
   * @param config 新配置
   */
  updateConfig(config: Partial<OneAPIConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取配置
   * @returns 当前配置
   */
  getConfig(): OneAPIConfig {
    return { ...this.config };
  }

  /**
   * 是否已启用
   * @returns 是否启用
   */
  isEnabled(): boolean {
    return this.config.enabled && !!this.config.apiKey && !!this.config.baseUrl;
  }
}
