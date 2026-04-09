/**
 * 会话管理 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { chatSessionRepository } from '@/lib/database/repositories/chatsession.repository';

/**
 * GET /api/chat/sessions - 获取会话列表
 */
export async function GET(request: NextRequest) {
  try {
    // 从请求头获取用户 ID
    const userId = request.headers.get('X-User-ID');
    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少用户 ID' }, { status: 400 });
    }

    const sessions = await chatSessionRepository.findByUserId(userId);
    return NextResponse.json({ success: true, data: sessions });
  } catch (error) {
    console.error('[API:ChatSessions] 获取会话列表失败:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

/**
 * POST /api/chat/sessions - 创建新会话
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-ID');
    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少用户 ID' }, { status: 400 });
    }

    const body = await request.json();
    const { title, agentId, id } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: '会话标题不能为空' }, { status: 400 });
    }

    const sessionId = await chatSessionRepository.create({
      id: id || crypto.randomUUID(),
      userId,
      title,
      agentId,
    });

    // 返回创建的会话
    const session = await chatSessionRepository.findById(sessionId);
    return NextResponse.json({ success: true, data: session }, { status: 201 });
  } catch (error) {
    console.error('[API:ChatSessions] 创建会话失败:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
