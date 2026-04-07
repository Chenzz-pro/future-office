/**
 * EKP 业务接口适配器
 * 用于业务接口调用 EKP REST 客户端
 */

import { EKPRestClient } from './ekp-rest-client';
import { dbManager } from './database/manager';

// EKP 配置接口
interface EKPClientConfig {
  baseUrl: string;
  username: string;
  password: string;
  apiPath: string;
  serviceId?: string;
}

/**
 * 创建 EKP 客户端实例
 */
export async function createEKPClient(): Promise<EKPRestClient | null> {
  try {
    // 从数据库加载 EKP 配置
    const configs = await dbManager.query(`
      SELECT base_url, username, password, api_path
      FROM ekp_configs
      WHERE enabled = TRUE
      LIMIT 1
    `);

    if (configs.rows.length === 0) {
      console.warn('[EKPClient] 未找到 EKP 配置');
      return null;
    }

    const config = configs.rows[0] as EKPClientConfig;
    return new EKPRestClient({
      ...config,
      serviceId: config.serviceId || 'default',
    });
  } catch (error) {
    console.error('[EKPClient] 创建 EKP 客户端失败:', error);
    return null;
  }
}

/**
 * 获取待办数量（适配业务接口）
 */
export async function getTodoCount(params: {
  userId: string;
  todoType: number;
  page?: number;
  pageSize?: number;
}): Promise<{ count: number; items?: any[] }> {
  const client = await createEKPClient();
  if (!client) {
    throw new Error('EKP 客户端未配置');
  }

  const result = await client.getTodoCount(params.userId, params.todoType as any);

  if (!result.success) {
    throw new Error(result.msg);
  }

  // 解析返回数据
  try {
    const count = parseInt(result.data || '0');
    return { count };
  } catch {
    return { count: 0 };
  }
}

/**
 * 审批待办（适配业务接口）
 * 注意：这是一个模拟接口，实际的EKP审批逻辑需要根据具体业务实现
 */
export async function approveTodo(params: {
  todoId: string;
  userId: string;
  comment: string;
  remark?: string;
}): Promise<{ success: boolean }> {
  // TODO: 实现实际的EKP审批逻辑
  console.log('[EKPClient] 审批待办:', params);
  return { success: true };
}

/**
 * 导出便捷使用的接口
 */
export const ekpClient = {
  getTodoCount,
  approveTodo,
  createClient: createEKPClient,
};
