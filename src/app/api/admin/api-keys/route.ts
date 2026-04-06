import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';
import { ApiKeyRepository } from '@/lib/database/repositories/apikey-admin.repository';

// 确保 system 用户存在
async function ensureSystemUser(): Promise<void> {
  const systemUserId = '00000000-0000-0000-0000-000000000000';

  // 检查 sys_org_person 表中是否存在 system 用户
  const { rows } = await dbManager.query(
    'SELECT fd_id FROM sys_org_person WHERE fd_id = ?',
    [systemUserId]
  );

  if (!rows || rows.length === 0) {
    // system 用户不存在，创建它
    console.log('[API Keys] System user not found, creating...');
    await dbManager.query(
      `INSERT INTO sys_org_person (fd_id, fd_name, fd_login_name, fd_email, fd_role, fd_is_login_enabled, fd_is_business_related, fd_user_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [systemUserId, 'System', 'system', 'system@system.local', 'admin', 0, 1, 'system']
    );
    console.log('[API Keys] System user created successfully');
  }
}

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

    // 确保 system 用户存在
    await ensureSystemUser();

    const apiKeyRepo = new ApiKeyRepository();
    const id = await apiKeyRepo.create({
      name: body.name,
      apiKey: body.apiKey,
      provider: body.provider,
      baseUrl: body.baseUrl,
      isActive: body.isActive !== false,
      userId: '00000000-0000-0000-0000-000000000000', // system user ID
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
