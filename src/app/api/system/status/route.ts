/**
 * 系统状态检查 API
 * 用于检查数据库连接、系统初始化状态等
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';
import * as fs from 'fs';
import * as path from 'path';
import mysql from 'mysql2/promise';

// 配置文件路径
const CONFIG_FILE_PATH = path.join(process.cwd(), '.db-config.json');

/**
 * 从配置文件加载配置
 */
function loadConfigFromFile(): any | null {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      const config = JSON.parse(data);
      // 确保日期字段是 Date 对象
      if (config.createdAt) config.createdAt = new Date(config.createdAt);
      if (config.updatedAt) config.updatedAt = new Date(config.updatedAt);
      return config;
    }
  } catch (err) {
    console.error('[System:Status] 读取配置文件失败:', err);
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
    console.log('[System:Status] 从环境变量读取配置:', {
      host: envDbConfig.host,
      port: envDbConfig.port,
      databaseName: envDbConfig.databaseName,
      username: envDbConfig.username,
      password: envDbConfig.password ? '已设置' : '未设置',
    });

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

  console.log('[System:Status] 环境变量未配置或配置不完整');
  return null;
}

/**
 * 尝试自动重连
 */
async function tryAutoReconnect(): Promise<boolean> {
  // 优先级1：配置文件
  const fileConfig = loadConfigFromFile();
  if (fileConfig) {
    console.log('[System:Status] 从配置文件读取配置，尝试自动重新连接...');

    try {
      // 使用临时连接池测试连接
      const testPool = mysql.createPool({
        host: fileConfig.host,
        port: fileConfig.port,
        user: fileConfig.username,
        password: fileConfig.password,
        database: fileConfig.databaseName,
        waitForConnections: true,
        connectionLimit: 1,
      });

      await testPool.getConnection();
      await testPool.end();

      // 连接成功，使用 dbManager 连接
      await dbManager.connect(fileConfig);

      console.log('[System:Status] ✅ 通过配置文件自动重新连接成功');
      return true;
    } catch (connectError) {
      console.error('[System:Status] 配置文件自动重新连接失败:', connectError);
    }
  }

  // 优先级2：环境变量
  const envConfig = loadConfigFromEnv();
  if (envConfig) {
    console.log('[System:Status] 检测到环境变量配置，尝试自动重新连接...');

    try {
      // 测试连接
      const testPool = mysql.createPool({
        host: envConfig.host,
        port: envConfig.port,
        user: envConfig.username,
        password: envConfig.password,
        database: envConfig.databaseName,
        waitForConnections: true,
        connectionLimit: 1,
      });

      await testPool.getConnection();
      await testPool.end();

      // 连接成功，使用 dbManager 连接
      await dbManager.connect(envConfig);

      console.log('[System:Status] ✅ 通过环境变量自动重新连接成功');
      return true;
    } catch (connectError) {
      console.error('[System:Status] 环境变量自动重新连接失败:', connectError);
    }
  }

  console.log('[System:Status] 无法自动重连（没有配置文件或环境变量）');
  console.warn('[System:Status] ⚠️  应用重启后数据库连接丢失');
  console.warn('[System:Status] 💡 建议解决方案：');
  console.warn('[System:Status]    1. 使用环境变量配置数据库（.env 文件）');
  console.warn('[System:Status]    2. 访问 /system-init 重新配置数据库');
  console.warn('[System:Status]    3. 环境变量示例：DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD');
  return false;
}

/**
 * GET /api/system/status
 * 获取系统状态
 */
export async function GET(request: NextRequest) {
  try {
    const status: {
      database: {
        connected: boolean;
        message: string;
      };
      initialized: {
        status: boolean;
        message: string;
        adminCount: number;
      };
      version: string;
    } = {
      database: {
        connected: false,
        message: '',
      },
      initialized: {
        status: false,
        message: '',
        adminCount: 0,
      },
      version: '1.0.0',
    };

    // 检查数据库连接
    try {
      let isConnected = await dbManager.isConnected();

      // 如果数据库未连接，尝试自动重连
      if (!isConnected) {
        console.log('[System:Status] 数据库未连接，尝试自动重连...');
        isConnected = await tryAutoReconnect();
      }

      status.database.connected = isConnected;
      status.database.message = isConnected ? '数据库已连接' : '数据库未连接';

      if (isConnected) {
        // 检查管理员账号数量
        try {
          // 先检查 fd_role 字段是否存在
          const columnCheck = await dbManager.query<{ count: number }>(
            'SELECT COUNT(*) as count FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
            ['sys_org_person', 'fd_role']
          );
          const hasRoleField = ((columnCheck.rows[0] as { count: number } | undefined)?.count || 0) > 0;

          let count = 0;
          if (hasRoleField) {
            // 如果有 fd_role 字段，查询 fd_role = 'admin'
            const result = await dbManager.query<{ count: number }>(
              'SELECT COUNT(*) as count FROM sys_org_person WHERE fd_role = ?',
              ['admin']
            );
            count = (result.rows[0]?.count) || 0;
          } else {
            // 如果没有 fd_role 字段，查询 fd_login_name = 'admin'
            const result = await dbManager.query<{ count: number }>(
              'SELECT COUNT(*) as count FROM sys_org_person WHERE fd_login_name = ?',
              ['admin']
            );
            count = (result.rows[0]?.count) || 0;
          }

          status.initialized.adminCount = count;
          status.initialized.status = count > 0;
          status.initialized.message = count > 0 ? '系统已初始化' : '系统未初始化，请创建管理员账号';
        } catch (error) {
          console.error('[API:System:Status] 检查管理员账号失败:', error);
          status.initialized.status = false;
          status.initialized.message = '无法检查系统初始化状态';
        }
      }
    } catch (error) {
      status.database.connected = false;
      status.database.message = '数据库连接失败';
      status.initialized.message = '无法检查系统初始化状态';
    }

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error: unknown) {
    console.error('[API:System:Status] 获取系统状态失败:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
