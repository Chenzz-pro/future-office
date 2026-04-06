import { NextRequest, NextResponse } from 'next/server';
import { dbManager, databaseConfigRepository } from '@/lib/database';
import * as fs from 'fs';
import * as path from 'path';
import mysql from 'mysql2/promise';

// 缓存最后激活的配置，用于页面刷新后自动重新连接
let lastActiveConfig: import('@/lib/database').DatabaseConfig | null = null;

/**
 * POST /api/database?action=init
 * 初始化数据库表结构
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'init') {
      const body = await request.json();
      const { host, port, databaseName, username, password } = body;

      if (!host || !databaseName || !username || !password) {
        return NextResponse.json(
          { success: false, error: '缺少必要参数' },
          { status: 400 }
        );
      }

      // 读取 SQL 脚本
      const sqlScript = fs.readFileSync(
        path.join(process.cwd(), 'database-schema-org-structure.sql'),
        'utf-8'
      );

      // 创建临时连接（不指定数据库）
      const tempPool = mysql.createPool({
        host,
        port: port ?? 3306,
        user: username,
        password,
        waitForConnections: true,
        connectionLimit: 1,
      });

      // 创建数据库（如果不存在）
      await tempPool.query(
        `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );

      // 切换到目标数据库
      await tempPool.query(`USE \`${databaseName}\``);

      // 执行表创建脚本（逐条执行）
      const statements: string[] = [];
      const lines = sqlScript.split('\n');
      let currentStatement = '';

      for (const line of lines) {
        // 跳过空行和注释行
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('--') || trimmedLine === '') {
          continue;
        }

        currentStatement += line + '\n';

        // 如果行以分号结尾，说明语句结束
        if (trimmedLine.endsWith(';')) {
          statements.push(currentStatement.trim());
          currentStatement = '';
        }
      }

      const failedStatements: { sql: string; error: string }[] = [];
      const successCount: { sql: string }[] = [];

      console.log(`[init] 解析出 ${statements.length} 条 SQL 语句`);

      for (const statement of statements) {
        if (!statement) continue;
        try {
          await tempPool.query(statement);
          successCount.push({ sql: statement.substring(0, 60) });
          console.log(`[init] SQL 执行成功: ${statement.substring(0, 60)}...`);
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          console.warn('[init] 执行SQL失败:', error);
          console.warn('[init] SQL:', statement.substring(0, 100));
          failedStatements.push({ sql: statement, error });
        }
      }

      console.log(`[init] SQL 执行完成: 成功 ${successCount.length} 条, 失败 ${failedStatements.length} 条`);

      // 检查关键表是否创建成功
      try {
        console.log('[init] 检查 database_configs 表是否存在...');
        const [rows] = await tempPool.query("SHOW TABLES LIKE 'database_configs'");
        console.log('[init] SHOW TABLES 结果:', JSON.stringify(rows));
        // 检查返回的行中是否包含 database_configs
        // MySQL 5.7 返回格式: { "Tables_in_db (table_name)": "table_name" }
        // 所以检查第一个对象的第一个值
        const tableExists = Array.isArray(rows) && rows.length > 0 &&
          Object.values(rows[0])[0] === 'database_configs';

        if (!tableExists) {
          await tempPool.end();
          console.error('[init] database_configs 表不存在');
          return NextResponse.json(
            {
              success: false,
              error: '关键表 database_configs 创建失败，请检查日志或权限',
              failedStatements: failedStatements.slice(0, 3),
              successCount: successCount.length,
            },
            { status: 500 }
          );
        }
        console.log('[init] database_configs 表已创建');
      } catch (err) {
        await tempPool.end();
        console.error('[init] 验证表失败:', err);
        return NextResponse.json(
          {
            success: false,
            error: '无法验证表是否创建成功: ' + (err instanceof Error ? err.message : String(err)),
          },
          { status: 500 }
        );
      }

      await tempPool.end();

      // 连接到数据库
      const configId = crypto.randomUUID();
      await dbManager.connect({
        id: configId,
        name: '默认配置',
        type: 'mysql',
        host,
        port: port ?? 3306,
        databaseName,
        username,
        password,
        isActive: true,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 保存数据库配置
      await databaseConfigRepository.create({
        id: configId,
        name: '默认配置',
        type: 'mysql',
        host,
        port: port ?? 3306,
        databaseName,
        username,
        password,
        isActive: true,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as import('@/lib/database').DatabaseConfig);

      return NextResponse.json({
        success: true,
        message: '数据库初始化成功',
      });
    }

    if (action === 'recreate') {
      const body = await request.json();
      const { host, port, databaseName, username, password } = body;

      if (!host || !databaseName || !username || !password) {
        return NextResponse.json(
          { success: false, error: '缺少必要参数' },
          { status: 400 }
        );
      }

      // 创建临时连接（不指定数据库）
      const tempPool = mysql.createPool({
        host,
        port: port ?? 3306,
        user: username,
        password,
        waitForConnections: true,
        connectionLimit: 1,
      });

      // 删除数据库（如果存在）
      await tempPool.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);

      // 读取 SQL 脚本
      const sqlScript = fs.readFileSync(
        path.join(process.cwd(), 'database-schema-org-structure.sql'),
        'utf-8'
      );

      // 创建数据库
      await tempPool.query(
        `CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );

      // 切换到目标数据库
      await tempPool.query(`USE \`${databaseName}\``);

      // 执行表创建脚本（逐条执行）
      const statements: string[] = [];
      const lines = sqlScript.split('\n');
      let currentStatement = '';

      for (const line of lines) {
        // 跳过空行和注释行
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('--') || trimmedLine === '') {
          continue;
        }

        currentStatement += line + '\n';

        // 如果行以分号结尾，说明语句结束
        if (trimmedLine.endsWith(';')) {
          statements.push(currentStatement.trim());
          currentStatement = '';
        }
      }

      const failedStatements: { sql: string; error: string }[] = [];

      console.log(`[recreate] 解析出 ${statements.length} 条 SQL 语句`);

      for (const statement of statements) {
        if (!statement) continue;
        try {
          await tempPool.query(statement);
          console.log(`[recreate] SQL 执行成功: ${statement.substring(0, 60)}...`);
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          console.warn('[recreate] 执行SQL失败:', error);
          console.warn('[recreate] SQL:', statement.substring(0, 100));
          failedStatements.push({ sql: statement, error });
        }
      }

      // 检查关键表是否创建成功
      try {
        console.log('[recreate] 检查 database_configs 表是否存在...');
        const [rows] = await tempPool.query("SHOW TABLES LIKE 'database_configs'");
        console.log('[recreate] SHOW TABLES 结果:', JSON.stringify(rows));
        // 检查返回的行中是否包含 database_configs
        // MySQL 5.7 返回格式: { "Tables_in_db (table_name)": "table_name" }
        // 所以检查第一个对象的第一个值
        const tableExists = Array.isArray(rows) && rows.length > 0 &&
          Object.values(rows[0])[0] === 'database_configs';

        if (!tableExists) {
          await tempPool.end();
          console.error('[recreate] database_configs 表不存在');
          return NextResponse.json(
            {
              success: false,
              error: '关键表 database_configs 创建失败，请检查日志或权限',
              failedStatements: failedStatements.slice(0, 3),
            },
            { status: 500 }
          );
        }
        console.log('[recreate] database_configs 表已创建');
      } catch (err) {
        await tempPool.end();
        console.error('[recreate] 验证表失败:', err);
        return NextResponse.json(
          {
            success: false,
            error: '无法验证表是否创建成功: ' + (err instanceof Error ? err.message : String(err)),
          },
          { status: 500 }
        );
      }

      await tempPool.end();

      // 连接到数据库
      const configId = crypto.randomUUID();
      await dbManager.connect({
        id: configId,
        name: '默认配置',
        type: 'mysql',
        host,
        port: port ?? 3306,
        databaseName,
        username,
        password,
        isActive: true,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 保存数据库配置
      const savedConfigId = await databaseConfigRepository.create({
        name: '默认配置',
        type: 'mysql',
        host,
        port: port ?? 3306,
        databaseName,
        username,
        password,
        isActive: false, // 先设置为不激活
        isDefault: false, // 先设置为非默认
      } as unknown as import('@/lib/database').DatabaseConfig, configId);

      // 设置为激活配置（确保只有一个配置是激活的）
      await databaseConfigRepository.setActive(savedConfigId);

      // 缓存配置，用于页面刷新后自动重新连接
      lastActiveConfig = {
        id: savedConfigId,
        name: '默认配置',
        type: 'mysql',
        host,
        port: port ?? 3306,
        databaseName,
        username,
        password,
        isActive: true,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return NextResponse.json({
        success: true,
        message: '数据库重新创建成功',
      });
    }

    if (action === 'test') {
      const body = await request.json();
      const { host, port, databaseName, username, password } = body;

      const config = {
        id: 'test',
        name: '测试连接',
        type: 'mysql',
        host,
        port: port ?? 3306,
        databaseName,
        username,
        password,
        isActive: true,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as import('@/lib/database').DatabaseConfig;

      const result = await databaseConfigRepository.testConnection(config);
      return NextResponse.json(result);
    }

    if (action === 'connect') {
      const body = await request.json();

      // 支持两种方式：
      // 1. 传递 configId（从数据库读取配置）
      // 2. 传递完整的配置对象（直接连接）
      let config: import('@/lib/database').DatabaseConfig | null = null;

      if (body.configId) {
        config = await databaseConfigRepository.findById(body.configId);
        if (!config) {
          return NextResponse.json(
            { success: false, error: '配置不存在' },
            { status: 404 }
          );
        }
      } else if (body.host && body.databaseName && body.username) {
        // 使用传递的配置对象
        config = {
          id: body.id || 'default',
          name: body.name || '默认配置',
          type: 'mysql',
          host: body.host,
          port: body.port ?? 3306,
          databaseName: body.databaseName,
          username: body.username,
          password: body.password,
          isActive: body.isActive ?? true,
          isDefault: body.isDefault ?? false,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as import('@/lib/database').DatabaseConfig;
      } else {
        return NextResponse.json(
          { success: false, error: '缺少必要参数（configId 或 配置信息）' },
          { status: 400 }
        );
      }

      // 先连接数据库
      await dbManager.connect(config);

      // 检查 database_configs 表是否存在，如果不存在则创建
      try {
        const checkResult = await dbManager.query<{ count: number }>(
          'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
          ['database_configs']
        );
        const tableExists = checkResult.rows[0]?.count > 0;

        if (!tableExists) {
          console.log('[API:Database:Connect] database_configs 表不存在，创建中...');
          await dbManager.query(`
            CREATE TABLE database_configs (
              id VARCHAR(36) PRIMARY KEY,
              name VARCHAR(100) NOT NULL,
              type VARCHAR(20) NOT NULL,
              host VARCHAR(255) NOT NULL,
              port INT NOT NULL,
              database_name VARCHAR(100) NOT NULL,
              username VARCHAR(100) NOT NULL,
              password VARCHAR(255) NOT NULL,
              is_active BOOLEAN DEFAULT FALSE,
              is_default BOOLEAN DEFAULT FALSE,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
          `);
          console.log('[API:Database:Connect] database_configs 表创建成功');
        }
      } catch (err) {
        console.warn('[API:Database:Connect] 检查或创建 database_configs 表失败:', err);
      }

      // 尝试保存配置到数据库
      try {
        const existingConfig = await databaseConfigRepository.findById(config.id);
        const configData: Omit<import('@/lib/database').DatabaseConfig, 'id' | 'createdAt' | 'updatedAt'> = {
          name: config.name,
          type: config.type,
          host: config.host,
          port: config.port,
          databaseName: config.databaseName,
          username: config.username,
          password: config.password,
          isActive: config.isActive,
          isDefault: config.isDefault,
        };

        if (!existingConfig) {
          await databaseConfigRepository.create(configData, config.id);
        } else {
          await databaseConfigRepository.update(config.id, configData);
        }

        // 设置为激活状态
        await databaseConfigRepository.setActive(config.id);
      } catch (err) {
        console.warn('[API:Database:Connect] 保存配置失败:', err);
        // 保存失败不影响连接成功
      }

      // 缓存配置，用于页面刷新后自动重新连接
      lastActiveConfig = config;

      return NextResponse.json({
        success: true,
        message: '数据库连接成功',
      });
    }

    if (action === 'add') {
      const body = await request.json();
      const { config } = body;

      if (!config || !config.name || !config.host || !config.databaseName || !config.username) {
        return NextResponse.json(
          { success: false, error: '缺少必要参数' },
          { status: 400 }
        );
      }

      // 1. 先测试连接，确保数据库可访问
      const testConfig = {
        id: 'test',
        name: '测试连接',
        type: 'mysql',
        host: config.host,
        port: config.port ?? 3306,
        databaseName: config.databaseName,
        username: config.username,
        password: config.password || '',
        isActive: true,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as import('@/lib/database').DatabaseConfig;

      const testResult = await databaseConfigRepository.testConnection(testConfig);
      if (!testResult.success) {
        return NextResponse.json(
          { success: false, error: '无法连接到数据库: ' + testResult.message },
          { status: 400 }
        );
      }

      // 2. 连接成功后，连接到数据库
      await dbManager.connect({
        id: '', // 临时ID，稍后会更新
        name: config.name,
        type: 'mysql',
        host: config.host,
        port: config.port ?? 3306,
        databaseName: config.databaseName,
        username: config.username,
        password: config.password || '',
        isActive: false,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 3. 确保数据库表存在（如果没有，自动创建）
      const fs = await import('fs');
      const path = await import('path');
      const sqlScript = fs.readFileSync(
        path.join(process.cwd(), 'database-schema-org-structure.sql'),
        'utf-8'
      );

      // 使用和 init/recreate 一样的解析逻辑
      const statements: string[] = [];
      const lines = sqlScript.split('\n');
      let currentStatement = '';

      for (const line of lines) {
        // 跳过空行和注释行
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('--') || trimmedLine === '') {
          continue;
        }

        currentStatement += line + '\n';

        // 如果行以分号结尾，说明语句结束
        if (trimmedLine.endsWith(';')) {
          statements.push(currentStatement.trim());
          currentStatement = '';
        }
      }

      console.log(`[add] 解析出 ${statements.length} 条 SQL 语句用于表初始化`);

      for (const statement of statements) {
        try {
          await dbManager.query(statement);
          console.log(`[add] SQL 执行成功: ${statement.substring(0, 60)}...`);
        } catch (err) {
          // 忽略已存在的表错误
          console.warn('[add] 执行SQL失败（可能是已存在）:', err);
        }
      }

      // 4. 保存配置到数据库
      const configId = await databaseConfigRepository.create({
        name: config.name,
        type: 'mysql',
        host: config.host,
        port: config.port ?? 3306,
        databaseName: config.databaseName,
        username: config.username,
        password: config.password || '',
        isActive: false, // 先设置为不激活
        isDefault: false, // 先设置为非默认
      });

      // 5. 设置为激活配置（确保只有一个配置是激活的）
      await databaseConfigRepository.setActive(configId);

      // 6. 更新 dbManager 的配置 ID
      const currentConfig = dbManager.getConfig();
      if (currentConfig) {
        currentConfig.id = configId;
      }

      // 缓存配置，用于页面刷新后自动重新连接
      lastActiveConfig = {
        id: configId,
        name: config.name,
        type: 'mysql',
        host: config.host,
        port: config.port ?? 3306,
        databaseName: config.databaseName,
        username: config.username,
        password: config.password || '',
        isActive: true,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return NextResponse.json({
        success: true,
        message: '数据库配置添加成功并已连接',
        configId,
      });
    }

    if (action === 'disconnect') {
      await dbManager.disconnect();
      return NextResponse.json({
        success: true,
        message: '数据库已断开',
      });
    }

    return NextResponse.json(
      { success: false, error: '不支持的操作' },
      { status: 400 }
    );
  } catch (error) {
    console.error('数据库操作失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/database
 * 获取数据库配置列表和状态
 */
export async function GET() {
  try {
    // 尝试从数据库读取配置
    const configs = await databaseConfigRepository.findAll();
    const isConnected = dbManager.isConnected();
    const currentConfig = dbManager.getConfig();

    return NextResponse.json({
      success: true,
      data: {
        configs,
        isConnected,
        currentConfig,
      },
    });
  } catch (error) {
    console.error('获取数据库配置失败:', error);

    // 如果错误是因为数据库未连接，尝试使用缓存的配置自动重新连接
    if (error instanceof Error && error.message === '数据库未连接' && lastActiveConfig) {
      console.log('[GET] 数据库未连接，尝试使用缓存的配置自动重新连接...');

      try {
        // 使用临时连接池测试连接
        const testPool = mysql.createPool({
          host: lastActiveConfig.host,
          port: lastActiveConfig.port,
          user: lastActiveConfig.username,
          password: lastActiveConfig.password,
          database: lastActiveConfig.databaseName,
          waitForConnections: true,
          connectionLimit: 1,
        });

        await testPool.getConnection();
        await testPool.end();

        // 连接成功，使用 dbManager 连接
        await dbManager.connect(lastActiveConfig);

        // 重新读取配置列表
        const configs = await databaseConfigRepository.findAll();
        const isConnected = dbManager.isConnected();
        const currentConfig = dbManager.getConfig();

        console.log('[GET] 自动重新连接成功');

        return NextResponse.json({
          success: true,
          data: {
            configs,
            isConnected,
            currentConfig,
          },
        });
      } catch (connectError) {
        console.error('[GET] 自动重新连接失败:', connectError);
        // 连接失败，返回未连接状态
        return NextResponse.json({
          success: true,
          data: {
            configs: [],
            isConnected: false,
            currentConfig: null,
          },
        });
      }
    }

    // 检查是否有环境变量配置，尝试使用环境变量重新连接
    if (error instanceof Error && error.message === '数据库未连接') {
      const envDbConfig = {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT ?? '3306'),
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD || '',
        databaseName: process.env.DB_NAME,
      };

      if (envDbConfig.host && envDbConfig.databaseName && envDbConfig.username) {
        console.log('[GET] 检测到环境变量配置，尝试重新连接...');

        try {
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

          // 测试连接
          const testPool = mysql.createPool({
            host: config.host,
            port: config.port,
            user: config.username,
            password: config.password,
            database: config.databaseName,
            waitForConnections: true,
            connectionLimit: 1,
          });

          await testPool.getConnection();
          await testPool.end();

          // 连接成功
          await dbManager.connect(config);
          console.log('[GET] ✅ 通过环境变量重新连接成功');

          // 更新缓存
          lastActiveConfig = config;

          // 重新读取配置列表
          const configs = await databaseConfigRepository.findAll();
          const isConnected = dbManager.isConnected();
          const currentConfig = dbManager.getConfig();

          return NextResponse.json({
            success: true,
            data: {
              configs,
              isConnected,
              currentConfig,
            },
          });
        } catch (envError) {
          console.error('[GET] 环境变量连接失败:', envError);
        }
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
