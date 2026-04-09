import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';
import { ApiKeyRepository } from '@/lib/database/repositories/apikey-admin.repository';

// PATCH /api/admin/api-keys/[id] - 更新 API Key
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id } = await params;

    if (!dbManager.isConnected()) {
      return NextResponse.json(
        { success: false, error: '数据库未连接' },
        { status: 400 }
      );
    }

    const apiKeyRepo = new ApiKeyRepository();
    await apiKeyRepo.update(id, body);

    const updated = await apiKeyRepo.findById(id);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('更新 API Key 失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/api-keys/[id] - 删除 API Key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!dbManager.isConnected()) {
      return NextResponse.json(
        { success: false, error: '数据库未连接' },
        { status: 400 }
      );
    }

    const apiKeyRepo = new ApiKeyRepository();
    await apiKeyRepo.delete(id);

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除 API Key 失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
