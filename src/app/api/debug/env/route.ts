import { NextResponse } from 'next/server';

/**
 * GET /api/debug/env
 * 调试 API：查看环境变量
 */
export async function GET() {
  const envVars = {
    DB_HOST: process.env.DB_HOST || '未设置',
    DB_PORT: process.env.DB_PORT || '未设置',
    DB_NAME: process.env.DB_NAME || '未设置',
    DB_USER: process.env.DB_USER || '未设置',
    DB_PASSWORD: process.env.DB_PASSWORD ? '已设置（隐藏）' : '未设置',
    NODE_ENV: process.env.NODE_ENV || '未设置',
    COZE_PROJECT_DOMAIN_DEFAULT: process.env.COZE_PROJECT_DOMAIN_DEFAULT || '未设置',
    DEPLOY_RUN_PORT: process.env.DEPLOY_RUN_PORT || '未设置',
  };

  console.log('[Debug:Env] 环境变量检查:', envVars);

  return NextResponse.json({
    success: true,
    data: envVars,
  });
}
