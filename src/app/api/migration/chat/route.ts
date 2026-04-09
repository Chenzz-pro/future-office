/**
 * 聊天数据迁移 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { migrateChatData, getMigrationPreview } from '@/lib/migration/chat-migration';

// GET: 获取迁移预览
export async function GET(request: NextRequest) {
  try {
    const preview = await getMigrationPreview();
    return NextResponse.json({
      success: true,
      data: preview,
    });
  } catch (error) {
    console.error('[API:Migration] 获取迁移预览失败:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// POST: 执行迁移
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-ID');
    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少用户 ID' }, { status: 400 });
    }

    const result = await migrateChatData(userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API:Migration] 数据迁移失败:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
