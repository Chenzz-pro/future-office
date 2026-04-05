/**
 * 消息管理 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { chatSessionRepository } from '@/lib/database/repositories/chatsession.repository';

/**
 * GET /api/chat/sessions/[id]/messages - 获取消息列表
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const userId = request.headers.get('X-User-ID');

    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少用户 ID' }, { status: 400 });
    }

    // 检查会话是否存在且属于该用户
    const session = await chatSessionRepository.findById(sessionId);

    if (!session) {
      return NextResponse.json({ success: false, error: '会话不存在' }, { status: 404 });
    }

    if (session.userId !== userId) {
      return NextResponse.json({ success: false, error: '无权访问该会话' }, { status: 403 });
    }

    const messages = await chatSessionRepository.getMessages(sessionId);
    return NextResponse.json({ success: true, data: messages });
  } catch (error) {
    console.error('[API:ChatMessages] 获取消息列表失败:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

/**
 * POST /api/chat/sessions/[id]/messages - 添加消息
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const userId = request.headers.get('X-User-ID');

    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少用户 ID' }, { status: 400 });
    }

    // 检查会话是否存在且属于该用户
    const session = await chatSessionRepository.findById(sessionId);

    if (!session) {
      return NextResponse.json({ success: false, error: '会话不存在' }, { status: 404 });
    }

    if (session.userId !== userId) {
      return NextResponse.json({ success: false, error: '无权访问该会话' }, { status: 403 });
    }

    const body = await request.json();
    const { role, content, metadata } = body;

    if (!role || !content) {
      return NextResponse.json({ success: false, error: '角色和内容不能为空' }, { status: 400 });
    }

    if (!['user', 'assistant', 'system'].includes(role)) {
      return NextResponse.json({ success: false, error: '无效的角色类型' }, { status: 400 });
    }

    const messageId = await chatSessionRepository.addMessage({
      sessionId,
      role,
      content,
      metadata,
    });

    // 返回添加的消息
    const messages = await chatSessionRepository.getMessages(sessionId);
    const newMessage = messages.find(m => m.id === messageId);

    return NextResponse.json({ success: true, data: newMessage }, { status: 201 });
  } catch (error) {
    console.error('[API:ChatMessages] 添加消息失败:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
