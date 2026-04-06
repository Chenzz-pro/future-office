/**
 * 技能列表API（普通用户）
 */

import { NextRequest, NextResponse } from 'next/server';
import { skillRepository } from '@/lib/database/repositories/skill.repository';

/**
 * GET /api/skills
 * 获取所有技能（普通用户）
 */
export async function GET(request: NextRequest) {
  try {
    const skills = await skillRepository.findAll();
    return NextResponse.json({
      success: true,
      data: skills,
    });
  } catch (error) {
    console.error('[API:Skills:GET] Error:', error);
    return NextResponse.json(
      { success: false, error: '获取技能列表失败' },
      { status: 500 }
    );
  }
}
