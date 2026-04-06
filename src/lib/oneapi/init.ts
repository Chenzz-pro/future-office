/**
 * 应用启动时加载oneAPI配置
 * 在数据库连接成功后自动加载oneAPI配置
 */

import { dbManager } from '@/lib/database/manager';
import { oneAPIManager } from '@/lib/oneapi';

/**
 * 加载oneAPI配置
 * 从数据库中加载oneAPI配置并初始化oneAPI管理器
 */
export async function loadOneAPIConfig(): Promise<void> {
  try {
    // 检查数据库是否已连接
    const isConnected = await dbManager.isConnected();

    if (!isConnected) {
      console.log('[OneAPI:Init] 数据库未连接，跳过加载oneAPI配置');
      return;
    }

    // 查询oneAPI配置
    const result = await dbManager.query(
      `SELECT
        id,
        name,
        base_url as baseUrl,
        api_key as apiKey,
        model,
        enabled,
        created_at as createdAt,
        updated_at as updatedAt
       FROM database_configs
       WHERE name = 'oneapi'
       AND enabled = TRUE
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      console.log('[OneAPI:Init] 未找到oneAPI配置，将使用规则引擎');
      return;
    }

    const config = result.rows[0] as {
      id: string;
      name: string;
      baseUrl: string;
      apiKey: string;
      model: string;
      enabled: boolean;
      createdAt: Date;
      updatedAt: Date;
    };

    // 初始化oneAPI管理器
    oneAPIManager.initialize(config);

    console.log('[OneAPI:Init] oneAPI配置加载成功:', {
      name: config.name,
      baseUrl: config.baseUrl,
      model: config.model,
    });
  } catch (error) {
    console.error('[OneAPI:Init] 加载oneAPI配置失败:', error);
  }
}
