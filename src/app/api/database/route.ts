import { NextRequest, NextResponse } from 'next/server';
import { dbManager, databaseConfigRepository } from '@/lib/database';
import * as fs from 'fs';
import * as path from 'path';
import mysql from 'mysql2/promise';

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
        path.join(process.cwd(), 'database-schema.sql'),
        'utf-8'
      );

      // 创建临时连接（不指定数据库）
      const tempPool = mysql.createPool({
        host,
        port: port || 3306,
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
      const statements = sqlScript
        .split(';')
        .map((s: string) => s.trim())
        .filter((s: string) => s && !s.startsWith('--'));

      const failedStatements: { sql: string; error: string }[] = [];

      for (const statement of statements) {
        if (!statement) continue;
        try {
          await tempPool.query(statement);
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          console.warn('执行SQL失败:', error);
          console.warn('SQL:', statement.substring(0, 100));
          failedStatements.push({ sql: statement, error });
        }
      }

      // 检查关键表是否创建成功
      try {
        const [rows] = await tempPool.query('SHOW TABLES LIKE "database_configs"');
        if (!Array.isArray(rows) || rows.length === 0) {
          await tempPool.end();
          return NextResponse.json(
            {
              success: false,
              error: '关键表 database_configs 创建失败，请检查日志或权限',
              failedStatements: failedStatements.slice(0, 3), // 只返回前3个错误
            },
            { status: 500 }
          );
        }
      } catch (err) {
        await tempPool.end();
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
        port: port || 3306,
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
        port: port || 3306,
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
        port: port || 3306,
        user: username,
        password,
        waitForConnections: true,
        connectionLimit: 1,
      });

      // 删除数据库（如果存在）
      await tempPool.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);

      // 读取 SQL 脚本
      const sqlScript = fs.readFileSync(
        path.join(process.cwd(), 'database-schema.sql'),
        'utf-8'
      );

      // 创建数据库
      await tempPool.query(
        `CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );

      // 切换到目标数据库
      await tempPool.query(`USE \`${databaseName}\``);

      // 执行表创建脚本（逐条执行）
      const statements = sqlScript
        .split(';')
        .map((s: string) => s.trim())
        .filter((s: string) => s && !s.startsWith('--'));

      const failedStatements: { sql: string; error: string }[] = [];

      for (const statement of statements) {
        if (!statement) continue;
        try {
          await tempPool.query(statement);
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          console.warn('执行SQL失败:', error);
          console.warn('SQL:', statement.substring(0, 100));
          failedStatements.push({ sql: statement, error });
        }
      }

      // 检查关键表是否创建成功
      try {
        const [rows] = await tempPool.query('SHOW TABLES LIKE "database_configs"');
        if (!Array.isArray(rows) || rows.length === 0) {
          await tempPool.end();
          return NextResponse.json(
            {
              success: false,
              error: '关键表 database_configs 创建失败，请检查日志或权限',
              failedStatements: failedStatements.slice(0, 3),
            },
            { status: 500 }
          );
        }
      } catch (err) {
        await tempPool.end();
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
        port: port || 3306,
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
        port: port || 3306,
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
        port: port || 3306,
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
      const { configId } = body;

      const config = await databaseConfigRepository.findById(configId);
      if (!config) {
        return NextResponse.json(
          { success: false, error: '配置不存在' },
          { status: 404 }
        );
      }

      await dbManager.connect(config);
      await databaseConfigRepository.setActive(configId);

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
        port: config.port || 3306,
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
        port: config.port || 3306,
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
        path.join(process.cwd(), 'database-schema.sql'),
        'utf-8'
      );

      const statements = sqlScript
        .split(';')
        .map((s: string) => s.trim())
        .filter((s: string) => s && !s.startsWith('--'));

      for (const statement of statements) {
        try {
          await dbManager.query(statement);
        } catch (err) {
          // 忽略已存在的表错误
          console.warn('执行SQL失败（可能是已存在）:', err);
        }
      }

      // 4. 保存配置到数据库
      const configId = await databaseConfigRepository.create({
        name: config.name,
        type: 'mysql',
        host: config.host,
        port: config.port || 3306,
        databaseName: config.databaseName,
        username: config.username,
        password: config.password || '',
        isActive: true,
        isDefault: true,
      });

      // 5. 重新连接，使用正确的 ID
      await dbManager.connect({
        id: configId,
        name: config.name,
        type: 'mysql',
        host: config.host,
        port: config.port || 3306,
        databaseName: config.databaseName,
        username: config.username,
        password: config.password || '',
        isActive: true,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

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
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
