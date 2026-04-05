import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';
import { ApiKeyRepository } from '@/lib/database/repositories/apikey-admin.repository';

// GET /api/admin/api-keys - 获取所有 API Keys
export async function GET() {
  try {
    if (!dbManager.isConnected()) {
      return NextResponse.json(
        { success: false, error: '数据库未连接' },
        { status: 400 }
      );
    }

    const apiKeyRepo = new ApiKeyRepository();
    const apiKeys = await apiKeyRepo.findAll();

    return NextResponse.json({
      success: true,
      data: apiKeys,
    });
  } catch (error) {
    console.error('获取 API Keys 失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

// POST /api/admin/api-keys - 创建新的 API Key
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必填字段
    if (!body.name || !body.apiKey || !body.provider) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段：name, apiKey, provider' },
        { status: 400 }
      );
    }

    if (!dbManager.isConnected()) {
      return NextResponse.json(
        { success: false, error: '数据库未连接' },
        { status: 400 }
      );
    }

    const apiKeyRepo = new ApiKeyRepository();
    const id = await apiKeyRepo.create({
      name: body.name,
      apiKey: body.apiKey,
      provider: body.provider,
      baseUrl: body.baseUrl,
      isActive: body.isActive !== false,
      userId: 'system',
    });

    const created = await apiKeyRepo.findById(id);

    return NextResponse.json({
      success: true,
      data: created,
    });
  } catch (error) {
    console.error('创建 API Key 失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
