/**
 * Agent管理API
 */

import { NextRequest, NextResponse } from 'next/server';
import { agentRepository } from '@/lib/database/repositories/agent.repository';
import { skillRepository } from '@/lib/database/repositories/skill.repository';

/**
 * GET /api/admin/agents
 * 获取所有Agent
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'list') {
      const agents = await agentRepository.findAll();
      return NextResponse.json({
        success: true,
        data: agents,
      });
    }

    if (action === 'detail') {
      const type = searchParams.get('type');
      if (!type) {
        return NextResponse.json(
          { success: false, error: '缺少type参数' },
          { status: 400 }
        );
      }

      const agent = await agentRepository.findByType(type);
      if (!agent) {
        return NextResponse.json(
          { success: false, error: 'Agent不存在' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: agent,
      });
    }

    // 默认返回列表
    const agents = await agentRepository.findAll();
    return NextResponse.json({
      success: true,
      data: agents,
    });
  } catch (error) {
    console.error('[API:Admin:Agents:GET] Error:', error);
    return NextResponse.json(
      { success: false, error: '获取Agent列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/agents
 * 更新Agent配置
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'update') {
      const body = await request.json();
      const { type, name, description, avatar, systemPrompt, skills, bots, permissionRules, businessRules } = body;

      if (!type) {
        return NextResponse.json(
          { success: false, error: '缺少type参数' },
          { status: 400 }
        );
      }

      // 更新Agent基本信息
      await agentRepository.update(type, {
        name,
        description,
        avatar,
        systemPrompt,
      });

      // 更新新架构字段
      if (permissionRules !== undefined) {
        await agentRepository.update(type, { permissionRules });
      }
      if (businessRules !== undefined) {
        await agentRepository.update(type, { businessRules });
      }

      // 更新技能列表
      if (skills && Array.isArray(skills)) {
        await agentRepository.updateSkills(type, skills);
      }

      // 更新子Bot列表
      if (bots && Array.isArray(bots)) {
        await agentRepository.updateBots(type, bots);
      }

      return NextResponse.json({
        success: true,
        message: 'Agent配置更新成功',
      });
    }

    return NextResponse.json(
      { success: false, error: '无效的action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API:Admin:Agents:POST] Error:', error);
    return NextResponse.json(
      { success: false, error: '更新Agent配置失败' },
      { status: 500 }
    );
  }
}
