import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';
import { ApiKeyRepository } from '@/lib/database/repositories/apikey-admin.repository';
import { EKPConfigRepository } from '@/lib/database/repositories/ekpconfig-admin.repository';

// System User ID - 用于管理员后台创建的系统级配置
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

interface MigrateResult {
  apiKeys: { success: number; failed: number };
  ekpConfig: { success: boolean; message: string };
}

// POST /api/admin/migrate-configs - 迁移配置从 localStorage 到数据库
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKeys, ekpConfig } = body;

    if (!dbManager.isConnected()) {
      return NextResponse.json(
        { success: false, error: '数据库未连接' },
        { status: 400 }
      );
    }

    const apiKeyRepo = new ApiKeyRepository();
    const ekpConfigRepo = new EKPConfigRepository();

    const results: MigrateResult = {
      apiKeys: { success: 0, failed: 0 },
      ekpConfig: { success: false, message: '' },
    };

    // 迁移 API Keys
    if (Array.isArray(apiKeys) && apiKeys.length > 0) {
      for (const key of apiKeys) {
        try {
          await apiKeyRepo.create({
            name: key.name,
            apiKey: key.apiKey,
            provider: key.provider,
            baseUrl: key.baseUrl,
            isActive: key.isActive !== false,
            userId: SYSTEM_USER_ID,
          });
          results.apiKeys.success++;
        } catch (error) {
          console.error('迁移 API Key 失败:', key.name, error);
          results.apiKeys.failed++;
        }
      }
    }

    // 迁移 EKP 配置
    if (ekpConfig && ekpConfig.baseUrl) {
      try {
        await ekpConfigRepo.upsert({
          baseUrl: ekpConfig.baseUrl,
          username: ekpConfig.username || '',
          password: ekpConfig.password || '',
          apiPath: ekpConfig.apiPath || '',
          serviceId: ekpConfig.serviceId || '',
          leaveTemplateId: ekpConfig.leaveTemplateId || '',
          expenseTemplateId: ekpConfig.expenseTemplateId || '',
          enabled: ekpConfig.enabled || false,
          authAreaId: ekpConfig.authAreaId || '',
          userId: SYSTEM_USER_ID,
        });
        results.ekpConfig.success = true;
        results.ekpConfig.message = 'EKP 配置迁移成功';
      } catch (error) {
        console.error('迁移 EKP 配置失败:', error);
        results.ekpConfig.success = false;
        results.ekpConfig.message = error instanceof Error ? error.message : '未知错误';
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `迁移完成：API Keys ${results.apiKeys.success}/${results.apiKeys.success + results.apiKeys.failed}`,
    });
  } catch (error) {
    console.error('迁移配置失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

// GET /api/admin/migrate-configs - 获取可迁移的配置预览
export async function GET() {
  try {
    // 这个接口返回提示信息，前端需要从客户端读取 localStorage
    return NextResponse.json({
      success: true,
      data: {
        message: '请从前端读取 localStorage 中的 ai-api-keys 和 ekp_config 数据',
        localStorageKeys: ['ai-api-keys', 'ekp_config'],
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
