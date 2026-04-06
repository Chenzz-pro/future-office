/**
 * 应用启动时自动初始化
 * 在 Next.js 应用启动时执行，用于自动重新连接数据库
 *
 * 注意：自动重连功能需要配置环境变量或使用持久化存储
 * 如果没有配置，需要用户手动访问 /admin/database 重新连接
 */

import { dbManager, databaseConfigRepository } from '@/lib/database';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseConfig } from '@/lib/database';

// 配置文件路径（用于存储数据库连接信息）
const CONFIG_FILE_PATH = path.join(process.cwd(), '.db-config.json');

export async function initializeApp() {
  try {
    console.log('[Initialize] 开始应用初始化...');

    // 1. 检查环境变量
    const envDbConfig = {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT ?? '3306'),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
      databaseName: process.env.DB_NAME,
    };

    // 调试日志：输出所有环境变量
    console.log('[Initialize] 环境变量检查:', {
      DB_HOST: envDbConfig.host ? '✅ 已设置' : '❌ 未设置',
      DB_PORT: envDbConfig.port,
      DB_USER: envDbConfig.username ? '✅ 已设置' : '❌ 未设置',
      DB_PASSWORD: envDbConfig.password ? '✅ 已设置' : '❌ 未设置',
      DB_NAME: envDbConfig.databaseName ? '✅ 已设置' : '❌ 未设置',
    });

    // 2. 如果配置了环境变量，直接连接
    if (envDbConfig.host && envDbConfig.databaseName && envDbConfig.username) {
      console.log('[Initialize] ✅ 环境变量配置完整，尝试连接...');

      const config = {
        id: 'env-config',
        name: '环境变量配置',
        type: 'mysql' as const,
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

      try {
        // 测试连接
        const testResult = await dbManager.testConnection(config);
        if (!testResult.success) {
          console.error('[Initialize] ❌ 环境变量数据库连接失败:', testResult.error);
          throw new Error(testResult.error);
        }

        // 连接成功
        await dbManager.connect(config);
        console.log('[Initialize] ✅ 通过环境变量连接数据库成功');

        // 尝试保存配置到文件（FaaS 环境可能失败，忽略）
        try {
          saveConfigToFile(config);
          console.log('[Initialize] ✅ 数据库配置已保存到文件');
        } catch (err) {
          console.log('[Initialize] ℹ️ 配置文件保存失败（可能是只读文件系统）:', (err as Error).message);
        }

        // 尝试同步配置到 database_configs 表
        try {
          await databaseConfigRepository.create(config);
          console.log('[Initialize] ✅ 数据库配置已同步到表');
        } catch (err) {
          console.log('[Initialize] ℹ️ 数据库配置已存在，跳过同步');
        }

        return;
      } catch (err) {
        console.error('[Initialize] ❌ 环境变量数据库连接失败:', err);
      }
    } else {
      console.log('[Initialize] ⚠️ 环境变量配置不完整');
    }

    // 3. 尝试从配置文件读取数据库连接信息
    const fileConfig = loadConfigFromFile();
    if (fileConfig) {
      console.log('[Initialize] 检测到配置文件，尝试连接...');

      try {
        // 测试连接
        const testResult = await dbManager.testConnection(fileConfig);
        if (!testResult.success) {
          console.error('[Initialize] ❌ 配置文件数据库连接失败:', testResult.error);
          throw new Error(testResult.error);
        }

        // 连接成功
        await dbManager.connect(fileConfig);
        console.log('[Initialize] ✅ 通过配置文件连接数据库成功');

        // 尝试同步配置到 database_configs 表
        try {
          await databaseConfigRepository.create(fileConfig);
        } catch (err) {
          // 配置可能已存在，忽略错误
        }

        return;
      } catch (err) {
        console.error('[Initialize] ❌ 配置文件数据库连接失败:', err);
      }
    }

    // 4. 都没有配置，提示用户
    console.log('[Initialize] ⚠️ 未找到有效的数据库配置');
    console.log('[Initialize] 📋 请选择以下方式之一配置数据库：');
    console.log('[Initialize]    1. 设置环境变量（推荐）');
    console.log('[Initialize]    2. 访问 /admin/database 手动初始化');
  } catch (error) {
    console.error('[Initialize] ❌ 应用初始化失败:', error);
    // 初始化失败不影响应用启动，只是数据库未连接
  }
}

/**
 * 保存配置到文件
 */
function saveConfigToFile(config: DatabaseConfig) {
  try {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error('[Initialize] ❌ 保存配置文件失败:', err);
  }
}

/**
 * 从配置文件加载配置
 */
function loadConfigFromFile(): DatabaseConfig | null {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      return JSON.parse(data) as DatabaseConfig;
    }
  } catch (err) {
    console.error('[Initialize] ❌ 读取配置文件失败:', err);
  }
  return null;
}
