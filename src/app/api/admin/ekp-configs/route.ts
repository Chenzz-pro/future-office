import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';
import { EKPConfigRepository } from '@/lib/database/repositories/ekpconfig-admin.repository';

// System User ID - 用于管理员后台创建的系统级配置
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

// GET /api/admin/ekp-configs - 获取 EKP 配置
export async function GET() {
  try {
    if (!dbManager.isConnected()) {
      return NextResponse.json(
        { success: false, error: '数据库未连接' },
        { status: 400 }
      );
    }

    const ekpConfigRepo = new EKPConfigRepository();
    const config = await ekpConfigRepo.findSystemConfig();

    return NextResponse.json({
      success: true,
      data: config || null,
    });
  } catch (error) {
    console.error('获取 EKP 配置失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

// POST /api/admin/ekp-configs - 保存或更新 EKP 配置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必填字段
    if (!body.baseUrl || !body.username || !body.password) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段：baseUrl, username, password' },
        { status: 400 }
      );
    }

    if (!dbManager.isConnected()) {
      return NextResponse.json(
        { success: false, error: '数据库未连接' },
        { status: 400 }
      );
    }

    const ekpConfigRepo = new EKPConfigRepository();
    const id = await ekpConfigRepo.upsert({
      baseUrl: body.baseUrl,
      username: body.username,
      password: body.password,
      apiPath: body.apiPath || '',
      serviceId: body.serviceId || '',
      leaveTemplateId: body.leaveTemplateId || '',
      expenseTemplateId: body.expenseTemplateId || '',
      enabled: body.enabled || false,
      userId: SYSTEM_USER_ID,
    });

    const saved = await ekpConfigRepo.findById(id);

    return NextResponse.json({
      success: true,
      data: saved,
    });
  } catch (error) {
    console.error('保存 EKP 配置失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
