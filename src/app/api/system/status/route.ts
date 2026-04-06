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
const CONFIG_FILE_PATH = '/workspace/projects/.db-config.json';

/**
 * 从配置文件加载配置
 */
function loadConfigFromFile(): any | null {
  try {
    console.log('[System:Status:LoadConfig] 检查配置文件:', CONFIG_FILE_PATH);
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      console.log('[System:Status:LoadConfig] 配置文件存在，开始读取...');
      const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      console.log('[System:Status:LoadConfig] 配置文件内容长度:', data.length);
      const config = JSON.parse(data);
      console.log('[System:Status:LoadConfig] 解析成功，配置信息:', {
        host: config.host,
        port: config.port,
        databaseName: config.databaseName,
        username: config.username,
      });
      // 确保日期字段是 Date 对象
      if (config.createdAt) config.createdAt = new Date(config.createdAt);
      if (config.updatedAt) config.updatedAt = new Date(config.updatedAt);
      return config;
    } else {
      console.log('[System:Status:LoadConfig] 配置文件不存在');
    }
  } catch (err) {
    console.error('[System:Status:LoadConfig] 读取配置文件失败:', err);
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
  console.log('[System:Status] 开始尝试自动重连...');

  // 优先级1：配置文件
  const fileConfig = loadConfigFromFile();
  if (fileConfig) {
    console.log('[System:Status] [1/3] 尝试从配置文件读取配置...');

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
    console.log('[System:Status] [2/3] 尝试从环境变量读取配置...');

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

  // 优先级3：从 database_configs 表读取配置
  // 注意：这需要先连接到数据库，但连接数据库又需要配置信息
  // 所以这里只能依赖环境变量或配置文件
  // 如果都没有，则无法读取 database_configs 表

  console.log('[System:Status] ❌ 无法自动重连');
  console.log('[System:Status] 原因：');
  console.log('[System:Status]   1. 配置文件不存在或连接失败');
  console.log('[System:Status]   2. 环境变量未配置或连接失败');
  console.log('[System:Status]   3. 无法从 database_configs 表读取（需要先连接数据库）');
  console.warn('[System:Status] ⚠️  应用重启后数据库连接丢失');
  console.warn('[System:Status] 💡 解决方案：');
  console.warn('[System:Status]    1. 访问 /admin/database 查看已保存的数据库配置');
  console.warn('[System:Status]    2. 访问 /system-init 重新配置数据库');
  console.warn('[System:Status]    3. 配置环境变量（推荐）：DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD');

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
        error?: string;
        errorType?: string;
        configExists?: boolean;
        configSource?: string;
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

      if (!isConnected) {
        // 检查配置文件和环境变量
        const fileConfig = loadConfigFromFile();
        const envConfig = loadConfigFromEnv();

        status.database.configExists = !!(fileConfig || envConfig);
        status.database.configSource = fileConfig ? 'file' : (envConfig ? 'env' : 'none');

        // 测试连接，获取详细错误信息
        const testConfig = fileConfig || envConfig;
        if (testConfig) {
          try {
            const testPool = mysql.createPool({
              host: testConfig.host,
              port: testConfig.port,
              user: testConfig.username,
              password: testConfig.password,
              database: testConfig.databaseName,
              waitForConnections: true,
              connectionLimit: 1,
            });

            await testPool.getConnection();
            await testPool.end();
          } catch (testError: any) {
            console.error('[System:Status] 数据库连接测试失败:', testError);

            // 根据错误类型判断原因
            if (testError.code === 'ER_ACCESS_DENIED_ERROR') {
              status.database.errorType = 'auth_failed';
              status.database.error = '数据库认证失败：用户名或密码错误';
              status.database.message = '数据库认证失败，请检查密码是否正确';
            } else if (testError.code === 'ECONNREFUSED') {
              status.database.errorType = 'connection_refused';
              status.database.error = '无法连接到数据库服务器';
              status.database.message = '无法连接到数据库服务器，请检查主机地址和端口';
            } else if (testError.code === 'ER_BAD_DB_ERROR') {
              status.database.errorType = 'database_not_found';
              status.database.error = '数据库不存在';
              status.database.message = '数据库不存在，请检查数据库名称';
            } else {
              status.database.errorType = 'unknown';
              status.database.error = testError.message;
              status.database.message = `数据库连接失败: ${testError.message}`;
            }
          }
        } else {
          status.database.errorType = 'config_not_found';
          status.database.error = '未找到数据库配置';
          status.database.message = '未找到数据库配置，请先配置数据库';
        }
      }

      if (isConnected) {
        // 检查管理员账号数量
        try {
          // 优化：检查是否存在名为'admin'且启用的账户（更准确的初始化判断）
          // 系统初始化的标准：存在名为'admin'且启用的账户
          const adminResult = await dbManager.query<{ count: number }>(
            `SELECT COUNT(*) as count
             FROM sys_org_person
             WHERE fd_login_name = 'admin'
             AND fd_is_login_enabled = 1`
          );
          const adminCount = (adminResult.rows[0]?.count) || 0;

          status.initialized.adminCount = adminCount;
          status.initialized.status = adminCount > 0;
          status.initialized.message = adminCount > 0 ? '系统已初始化' : '系统未初始化，请创建管理员账号';
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
