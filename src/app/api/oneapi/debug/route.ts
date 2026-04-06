/**
 * oneAPI配置检查 API
 * GET /api/oneapi/debug
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOneAPIConfigRepository, dbManager } from '@/lib/database/manager';
import * as fs from 'fs';
import * as path from 'path';

// 配置文件路径
const CONFIG_FILE_PATH = '/workspace/projects/.db-config.json';

/**
 * 从配置文件加载配置
 */
function loadConfigFromFile(): any | null {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      const config = JSON.parse(data);
      if (config.createdAt) config.createdAt = new Date(config.createdAt);
      if (config.updatedAt) config.updatedAt = new Date(config.updatedAt);
      return config;
    }
  } catch (err) {
    console.error('[API:OneAPI:Debug] 读取配置文件失败:', err);
  }
  return null;
}

/**
 * 从环境变量加载配置
 */
function loadConfigFromEnv(): any | null {
  const envDbConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '3306'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    databaseName: process.env.DB_NAME,
  };

  if (envDbConfig.host && envDbConfig.databaseName && envDbConfig.username) {
    return {
      id: 'env-config',
      name: '环境变量配置',
      type: 'mysql',
      host: envDbConfig.host,
      port: envDbConfig.port,
      username: envDbConfig.username,
      password: envDbConfig.password,
      databaseName: envDbConfig.databaseName,
      isActive: true,
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  return null;
}

/**
 * 确保数据库已连接
 */
async function ensureDatabaseConnected(): Promise<boolean> {
  // 检查是否已连接
  const isConnected = await dbManager.isConnected();
  if (isConnected) {
    return true;
  }

  console.log('[API:OneAPI:Debug] 数据库未连接，尝试自动重连...');

  // 尝试从配置文件连接
  const fileConfig = loadConfigFromFile();
  if (fileConfig) {
    try {
      await dbManager.connect(fileConfig);
      console.log('[API:OneAPI:Debug] ✅ 通过配置文件连接成功');
      return true;
    } catch (error) {
      console.error('[API:OneAPI:Debug] 配置文件连接失败:', error);
    }
  }

  // 尝试从环境变量连接
  const envConfig = loadConfigFromEnv();
  if (envConfig) {
    try {
      await dbManager.connect(envConfig);
      console.log('[API:OneAPI:Debug] ✅ 通过环境变量连接成功');
      return true;
    } catch (error) {
      console.error('[API:OneAPI:Debug] 环境变量连接失败:', error);
    }
  }

  console.error('[API:OneAPI:Debug] ❌ 无法连接数据库');
  return false;
}

export async function GET(request: NextRequest) {
  try {
    // 确保数据库已连接
    const connected = await ensureDatabaseConnected();
    if (!connected) {
      return NextResponse.json({
        success: false,
        error: '数据库未连接，无法访问 oneAPI 配置',
        data: null,
      });
    }

    const repository = getOneAPIConfigRepository();

    if (!repository) {
      console.error('[API:OneAPI:Debug] getOneAPIConfigRepository 返回 null');
      return NextResponse.json({
        success: false,
        error: '无法获取 oneAPI 配置存储库',
        data: null,
      });
    }

    // 检查表是否存在
    const tableExists = await repository.tableExists();

    if (!tableExists) {
      return NextResponse.json({
        success: false,
        error: 'oneapi_configs 表不存在',
        data: null,
      });
    }

    // 获取所有配置
    const allConfigs = await repository.findAll();

    // 获取启用的配置
    const enabledConfigs = await repository.findEnabled();

    return NextResponse.json({
      success: true,
      data: {
        tableExists: true,
        totalCount: allConfigs.length,
        enabledCount: enabledConfigs.length,
        allConfigs: allConfigs.map(config => ({
          id: config.id,
          name: config.name,
          description: config.description,
          baseUrl: config.base_url,
          apiKey: config.api_key ? '已设置（隐藏）' : '未设置',
          model: config.model,
          enabled: config.enabled,
          createdAt: config.created_at,
          updatedAt: config.updated_at,
        })),
        enabledConfigs: enabledConfigs.map(config => ({
          id: config.id,
          name: config.name,
          baseUrl: config.base_url,
          model: config.model,
          enabled: config.enabled,
        })),
      },
    });
  } catch (error) {
    console.error('[API:OneAPI:Debug] 检查失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '服务器错误',
      data: null,
    });
  }
}
