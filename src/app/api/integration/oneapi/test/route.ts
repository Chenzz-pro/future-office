/**
 * oneAPI连接测试 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';
import { oneAPIManager } from '@/lib/oneapi';

/**
 * POST /api/integration/oneapi/test
 * 测试oneAPI连接
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { baseUrl, apiKey, model } = body;

    // 参数校验
    if (!baseUrl || !apiKey || !model) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必要参数（baseUrl、apiKey、model）',
        },
        { status: 400 }
      );
    }

    // 测试连接
    const testClient = oneAPIManager;
    testClient.initialize({
      id: 'test',
      name: '测试连接',
      baseUrl,
      apiKey,
      model,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const isConnected = await testClient.testConnection();

    if (isConnected) {
      return NextResponse.json({
        success: true,
        message: '连接测试成功',
      });
    } else {
      return NextResponse.json({
        success: false,
        error: '连接测试失败，请检查配置',
      });
    }
  } catch (error: unknown) {
    console.error('[API:OneAPI:Test] 连接测试失败:', error);
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
