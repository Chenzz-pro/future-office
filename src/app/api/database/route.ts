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

      for (const statement of statements) {
        try {
          await tempPool.query(statement);
        } catch (err) {
          console.warn('执行SQL失败（可能是已存在）:', err);
        }
      }

      await tempPool.end();

      // 保存数据库配置
      const configId = crypto.randomUUID();
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

      // 连接到数据库
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

      return NextResponse.json({
        success: true,
        message: '数据库初始化成功',
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
