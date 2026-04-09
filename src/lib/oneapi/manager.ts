/**
 * oneAPI管理器
 * 负责管理oneAPI配置和客户端实例
 */

import { OneAPIClient } from './client';
import type { OneAPIConfig, OneAPIMessage } from './types';

class OneAPIManager {
  private static instance: OneAPIManager;
  private config: OneAPIConfig | null = null;
  private client: OneAPIClient | null = null;

  private constructor() {}

  public static getInstance(): OneAPIManager {
    if (!OneAPIManager.instance) {
      OneAPIManager.instance = new OneAPIManager();
    }
    return OneAPIManager.instance;
  }

  /**
   * 初始化配置
   * @param config oneAPI配置
   */
  initialize(config: OneAPIConfig): void {
    console.log('[OneAPIManager] 初始化配置:', {
      name: config.name,
      baseUrl: config.baseUrl,
      model: config.model,
      enabled: config.enabled,
    });

    this.config = config;
    if (config.enabled) {
      this.client = new OneAPIClient(config);
    } else {
      this.client = null;
    }
  }

  /**
   * 获取客户端
   * @returns oneAPI客户端实例
   */
  getClient(): OneAPIClient | null {
    if (!this.client || !this.isEnabled()) {
      console.warn('[OneAPIManager] oneAPI客户端未初始化或未启用');
      return null;
    }
    return this.client;
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
    } = {}
  ): Promise<string> {
    const client = this.getClient();
    if (!client) {
      throw new Error('oneAPI客户端未初始化');
    }

    return client.chat(messages, options);
  }

  /**
   * 流式聊天
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
    const client = this.getClient();
    if (!client) {
      throw new Error('oneAPI客户端未初始化');
    }

    return client.chatStream(messages, onChunk, options);
  }

  /**
   * 测试连接
   * @returns 是否连接成功
   */
  async testConnection(): Promise<boolean> {
    const client = this.getClient();
    if (!client) {
      return false;
    }

    return client.testConnection();
  }

  /**
   * 是否已启用
   * @returns 是否启用
   */
  isEnabled(): boolean {
    return !!this.config?.enabled;
  }

  /**
   * 获取配置
   * @returns 当前配置
   */
  getConfig(): OneAPIConfig | null {
    return this.config ? { ...this.config } : null;
  }

  /**
   * 重置配置
   */
  reset(): void {
    this.config = null;
    this.client = null;
    console.log('[OneAPIManager] 配置已重置');
  }
}

// 导出单例
export const oneAPIManager = OneAPIManager.getInstance();
