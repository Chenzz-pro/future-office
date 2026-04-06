/**
 * Agent列表API（普通用户）
 */

import { NextRequest, NextResponse } from 'next/server';
import { agentRepository } from '@/lib/database/repositories/agent.repository';

/**
 * GET /api/agents
 * 获取所有Agent（普通用户）
 */
export async function GET(request: NextRequest) {
  try {
    const agents = await agentRepository.findAll();
    return NextResponse.json({
      success: true,
      data: agents,
    });
  } catch (error) {
    console.error('[API:Agents:GET] Error:', error);
    return NextResponse.json(
      { success: false, error: '获取Agent列表失败' },
      { status: 500 }
    );
  }
}
