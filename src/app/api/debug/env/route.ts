/**
 * 检查环境变量 API
 * GET /api/debug/env
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const envVars = {
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT,
      DB_NAME: process.env.DB_NAME,
      DB_USER: process.env.DB_USER,
      DB_PASSWORD: process.env.DB_PASSWORD ? '已设置（隐藏）' : '未设置',
      NODE_ENV: process.env.NODE_ENV,
      COZE_PROJECT_ENV: process.env.COZE_PROJECT_ENV,
      // 其他相关环境变量
      DEPLOY_RUN_PORT: process.env.DEPLOY_RUN_PORT,
      COZE_PROJECT_DOMAIN_DEFAULT: process.env.COZE_PROJECT_DOMAIN_DEFAULT,
      COZE_WORKSPACE_PATH: process.env.COZE_WORKSPACE_PATH,
    };

    return NextResponse.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        environment: envVars,
        configPriority: {
          env: '环境变量',
          file: '配置文件 (.db-config.json)',
          note: '环境变量优先级高于配置文件',
        },
      },
    });
  } catch (error) {
    console.error('[Debug:Env] 检查环境变量失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '服务器错误',
      },
      { status: 500 }
    );
  }
}
