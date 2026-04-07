/**
 * EKP 业务接口适配器
 * 用于业务接口调用 EKP REST 客户端
 * 集成了 EKPInterfaceRegistry 进行统一的接口管理
 */

import { EKPRestClient } from './ekp-rest-client';
import { dbManager } from './database/manager';
import { ekpInterfaceRegistry, EKPInterface } from './ekp-interface-registry';

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
      SELECT ekp_address, username, password, config
      FROM ekp_configs
      LIMIT 1
    `);

    if (configs.rows.length === 0) {
      console.warn('[EKPClient] 未找到 EKP 配置');
      return null;
    }

    const row = configs.rows[0] as any;
    console.log('[EKPClient] 原始数据:', JSON.stringify(row));
    
    const configJson = typeof row.config === 'string' ? JSON.parse(row.config) : (row.config || {});
    console.log('[EKPClient] 解析后的config:', JSON.stringify(configJson));

    const config: EKPClientConfig = {
      baseUrl: row.ekp_address,
      username: row.username,
      password: row.password,
      apiPath: configJson.apiPath || configJson.api_path || '/api/sys-notify/sysNotifyTodoRestService',
      serviceId: configJson.serviceId || 'default',
    };

    console.log('[EKPClient] 最终配置:', JSON.stringify(config));
    return new EKPRestClient(config);
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
 * 通用接口调用方法
 * 通过接口代码调用 EKP 接口，自动从 EKPInterfaceRegistry 获取配置
 */
export async function callEKPInterface<T = unknown>(
  code: string,
  params?: Record<string, unknown>
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    // 1. 获取接口配置
    const interfaceConfig = await ekpInterfaceRegistry.get(code);

    if (!interfaceConfig) {
      throw new Error(`接口 ${code} 不存在`);
    }

    // 2. 检查接口是否启用
    if (!interfaceConfig.enabled) {
      throw new Error(`接口 ${code} 未启用`);
    }

    // 3. 创建 EKP 客户端
    const client = await createEKPClient();
    if (!client) {
      throw new Error('EKP 客户端未配置');
    }

    // 4. 获取 EKP 配置（用于认证）
    const configs = await dbManager.query(`
      SELECT ekp_address, username, password
      FROM ekp_configs
      LIMIT 1
    `);

    if (configs.rows.length === 0) {
      throw new Error('EKP 配置未找到');
    }

    const ekpConfig = configs.rows[0] as { ekp_address: string; username: string; password: string };

    // 5. 生成 Basic Auth 头
    const credentials = typeof Buffer !== 'undefined'
      ? Buffer.from(`${ekpConfig.username}:${ekpConfig.password}`).toString('base64')
      : btoa(`${ekpConfig.username}:${ekpConfig.password}`);

    // 6. 构造请求
    const endpoint = `${ekpConfig.ekp_address}${interfaceConfig.path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${credentials}`,
    };

    // 7. 发送请求（EKP 主要使用 POST）
    const response = await fetch(endpoint, {
      method: 'POST', // EKP 接口主要使用 POST
      headers,
      body: params ? JSON.stringify(params) : undefined,
    });

    // 8. 处理响应
    const text = await response.text();
    let result: any;
    try {
      result = JSON.parse(text);
    } catch {
      result = { text };
    }

    // 9. 检查响应状态
    if (response.status === 302 || response.status === 401) {
      throw new Error('认证失败：用户名或密码错误');
    }

    if (response.status === 403) {
      throw new Error('权限不足');
    }

    if (response.status === 404) {
      throw new Error('服务不存在');
    }

    if (response.status === 500) {
      throw new Error(`服务端错误：${text.substring(0, 100)}`);
    }

    // 10. 检查业务状态
    if (result.returnState === 2) {
      // 成功
      return {
        success: true,
        data: result.data || result.message,
      };
    } else if (result.returnState === 1) {
      // 失败
      throw new Error(result.message || '业务处理失败');
    } else {
      // 其他情况
      return {
        success: response.status === 200,
        data: result,
        error: response.status === 200 ? undefined : `HTTP ${response.status}`,
      };
    }
  } catch (error) {
    console.error('[EKPClient] 调用接口失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 批量调用接口
 */
export async function callEKPInterfacesBatch(
  calls: Array<{ code: string; params?: Record<string, unknown> }>
): Promise<Array<{ code: string; success: boolean; data?: unknown; error?: string }>> {
  // 批量获取接口配置
  const codes = calls.map(c => c.code);
  const interfaceMap = await ekpInterfaceRegistry.getBatch(codes);

  // 并行调用接口
  const results = await Promise.all(
    calls.map(async ({ code, params }) => {
      const interfaceConfig = interfaceMap.get(code);

      if (!interfaceConfig) {
        return {
          code,
          success: false,
          error: `接口 ${code} 不存在`,
        };
      }

      if (!interfaceConfig.enabled) {
        return {
          code,
          success: false,
          error: `接口 ${code} 未启用`,
        };
      }

      try {
        const result = await callEKPInterface(code, params);
        return {
          code,
          ...result,
        };
      } catch (error) {
        return {
          code,
          success: false,
          error: error instanceof Error ? error.message : '未知错误',
        };
      }
    })
  );

  return results;
}

/**
 * 导出便捷使用的接口
 */
export const ekpClient = {
  getTodoCount,
  approveTodo,
  createClient: createEKPClient,
  callInterface: callEKPInterface,
  callInterfaceBatch: callEKPInterfacesBatch,
  getRegistry: () => ekpInterfaceRegistry,
};
