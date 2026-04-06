/**
 * 数据库连接诊断 API
 * 帮助用户诊断数据库连接问题
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';
import mysql from 'mysql2/promise';

/**
 * GET /api/database/diagnose
 * 诊断数据库连接问题
 */
export async function GET(request: NextRequest) {
  try {
    const configPath = '/workspace/projects/.db-config.json';

    // 1. 检查配置文件是否存在
    const fs = require('fs');
    let configFileExists = false;
    let configData = null;

    try {
      if (fs.existsSync(configPath)) {
        configFileExists = true;
        const data = fs.readFileSync(configPath, 'utf-8');
        configData = JSON.parse(data);
      }
    } catch (error) {
      console.error('[API:Database:Diagnose] 读取配置文件失败:', error);
    }

    // 2. 检查环境变量
    const envConfig = {
      hasHost: !!process.env.DB_HOST,
      hasPort: !!process.env.DB_PORT,
      hasName: !!process.env.DB_NAME,
      hasUser: !!process.env.DB_USER,
      hasPassword: !!process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      name: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD ? '已设置' : '未设置',
    };

    // 3. 诊断结果
    const diagnosis = {
      configFile: {
        exists: configFileExists,
        path: configPath,
        data: configData ? {
          name: configData.name,
          host: configData.host,
          port: configData.port,
          databaseName: configData.databaseName,
          username: configData.username,
          password: configData.password ? '已设置' : '未设置',
          hasValidConfig: !!(
            configData.host &&
            configData.port &&
            configData.databaseName &&
            configData.username &&
            configData.password
          ),
        } : null,
      },
      environment: envConfig,
      priority: configFileExists ? '配置文件' : (envConfig.hasHost ? '环境变量' : '无配置'),
      recommendations: [] as string[],
    };

    // 4. 生成建议
    if (configFileExists && configData) {
      if (!configData.password) {
        diagnosis.recommendations.push('⚠️ 配置文件中缺少密码字段');
      }
    }

    if (!envConfig.hasHost) {
      diagnosis.recommendations.push('💡 建议配置环境变量以提高安全性');
    }

    if (!configFileExists && !envConfig.hasHost) {
      diagnosis.recommendations.push('❌ 未找到数据库配置，请访问 /system-init 进行配置');
    }

    return NextResponse.json({
      success: true,
      diagnosis,
    });
  } catch (error: unknown) {
    console.error('[API:Database:Diagnose] 诊断失败:', error);
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

/**
 * POST /api/database/diagnose
 * 测试数据库连接
 */
export async function POST(request: NextRequest) {
  try {
    const { host, port, databaseName, username, password } = await request.json();

    if (!host || !port || !databaseName || !username) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必要参数：host, port, databaseName, username',
        },
        { status: 400 }
      );
    }

    try {
      // 创建测试连接池（需要保持连接以执行后续查询）
      const testPool = mysql.createPool({
        host,
        port,
        user: username,
        password: password || '',
        database: databaseName,
        waitForConnections: true,
        connectionLimit: 1,
      });

      // 测试连接
      const connection = await testPool.getConnection();

      // 检查admin账户是否存在
      const [adminCheck] = await connection.query(
        'SELECT fd_id, fd_name, fd_login_name, fd_is_login_enabled FROM sys_org_person WHERE fd_login_name = ?',
        ['admin']
      );

      // 释放连接
      connection.release();
      await testPool.end();

      return NextResponse.json({
        success: true,
        message: '数据库连接成功',
        adminExists: Array.isArray(adminCheck) && adminCheck.length > 0,
        adminAccount: Array.isArray(adminCheck) && adminCheck.length > 0 ? adminCheck[0] : null,
      });
    } catch (error: any) {
      console.error('[API:Database:Diagnose] 连接测试失败:', error);

      let errorMessage = '数据库连接失败';
      let errorType = 'unknown';

      if (error.code === 'ECONNREFUSED') {
        errorMessage = '无法连接到数据库服务器';
        errorType = 'connection_refused';
      } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        errorMessage = '数据库认证失败：用户名或密码错误';
        errorType = 'access_denied';
      } else if (error.code === 'ER_BAD_DB_ERROR') {
        errorMessage = '数据库不存在';
        errorType = 'database_not_found';
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          errorType,
          code: error.code,
        },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    console.error('[API:Database:Diagnose] 测试失败:', error);
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
