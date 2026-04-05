/**
 * 单个会话管理 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { chatSessionRepository } from '@/lib/database/repositories/chatsession.repository';

/**
 * GET /api/chat/sessions/[id] - 获取会话详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('X-User-ID');

    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少用户 ID' }, { status: 400 });
    }

    const session = await chatSessionRepository.findById(id);

    if (!session) {
      return NextResponse.json({ success: false, error: '会话不存在' }, { status: 404 });
    }

    // 检查权限：只能访问自己的会话
    if (session.userId !== userId) {
      return NextResponse.json({ success: false, error: '无权访问该会话' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    console.error('[API:ChatSession] 获取会话详情失败:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

/**
 * PUT /api/chat/sessions/[id] - 更新会话
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('X-User-ID');

    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少用户 ID' }, { status: 400 });
    }

    const session = await chatSessionRepository.findById(id);

    if (!session) {
      return NextResponse.json({ success: false, error: '会话不存在' }, { status: 404 });
    }

    // 检查权限：只能更新自己的会话
    if (session.userId !== userId) {
      return NextResponse.json({ success: false, error: '无权更新该会话' }, { status: 403 });
    }

    const body = await request.json();
    const { title, agentId } = body;

    const updated = await chatSessionRepository.update(id, {
      title,
      agentId,
    });

    if (!updated) {
      return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 });
    }

    // 返回更新后的会话
    const updatedSession = await chatSessionRepository.findById(id);
    return NextResponse.json({ success: true, data: updatedSession });
  } catch (error) {
    console.error('[API:ChatSession] 更新会话失败:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

/**
 * DELETE /api/chat/sessions/[id] - 删除会话
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('X-User-ID');

    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少用户 ID' }, { status: 400 });
    }

    const session = await chatSessionRepository.findById(id);

    if (!session) {
      return NextResponse.json({ success: false, error: '会话不存在' }, { status: 404 });
    }

    // 检查权限：只能删除自己的会话
    if (session.userId !== userId) {
      return NextResponse.json({ success: false, error: '无权删除该会话' }, { status: 403 });
    }

    const deleted = await chatSessionRepository.delete(id);

    if (!deleted) {
      return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '会话已删除' });
  } catch (error) {
    console.error('[API:ChatSession] 删除会话失败:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
