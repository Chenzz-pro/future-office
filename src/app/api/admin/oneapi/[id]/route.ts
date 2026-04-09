import { NextRequest, NextResponse } from 'next/server';

// PATCH - 更新OneAPI配置
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 获取数据库管理器
    const { dbManager } = await import('@/lib/database');

    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.name !== undefined) {
      updates.push('name = ?');
      values.push(body.name);
    }
    if (body.baseUrl !== undefined) {
      updates.push('base_url = ?');
      values.push(body.baseUrl);
    }
    if (body.apiKey !== undefined) {
      updates.push('api_key = ?');
      values.push(body.apiKey);
    }
    if (body.channelName !== undefined) {
      updates.push('channel_name = ?');
      values.push(body.channelName);
    }
    if (body.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(body.isActive);
    }
    if (body.autoLoadBalance !== undefined) {
      updates.push('auto_load_balance = ?');
      values.push(body.autoLoadBalance);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有需要更新的字段' },
        { status: 400 }
      );
    }

    values.push(id);
    await dbManager.query(
      `UPDATE oneapi_configs SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return NextResponse.json({ success: true, message: '配置更新成功' });
  } catch (error) {
    console.error('[API:OneAPI:ID] 更新配置失败:', error);
    return NextResponse.json(
      { success: false, error: '更新配置失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除OneAPI配置
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { dbManager } = await import('@/lib/database');

    await dbManager.query('DELETE FROM oneapi_configs WHERE id = ?', [id]);

    return NextResponse.json({ success: true, message: '配置删除成功' });
  } catch (error) {
    console.error('[API:OneAPI:ID] 删除配置失败:', error);
    return NextResponse.json(
      { success: false, error: '删除配置失败' },
      { status: 500 }
    );
  }
}
