/**
 * 技能管理API
 */

import { NextRequest, NextResponse } from 'next/server';
import { skillRepository } from '@/lib/database/repositories/skill.repository';

/**
 * GET /api/admin/skills
 * 获取所有技能
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'list') {
      const skills = await skillRepository.findAll();
      return NextResponse.json({
        success: true,
        data: skills,
      });
    }

    if (action === 'detail') {
      const code = searchParams.get('code');
      if (!code) {
        return NextResponse.json(
          { success: false, error: '缺少code参数' },
          { status: 400 }
        );
      }

      const skill = await skillRepository.findByCode(code);
      if (!skill) {
        return NextResponse.json(
          { success: false, error: '技能不存在' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: skill,
      });
    }

    if (action === 'category') {
      const category = searchParams.get('category');
      if (!category) {
        return NextResponse.json(
          { success: false, error: '缺少category参数' },
          { status: 400 }
        );
      }

      const skills = await skillRepository.findByCategory(category);
      return NextResponse.json({
        success: true,
        data: skills,
      });
    }

    // 默认返回列表
    const skills = await skillRepository.findAll();
    return NextResponse.json({
      success: true,
      data: skills,
    });
  } catch (error) {
    console.error('[API:Admin:Skills:GET] Error:', error);
    return NextResponse.json(
      { success: false, error: '获取技能列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/skills
 * 创建/更新技能
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'create') {
      const body = await request.json();
      const { code, name, description, category, apiConfig, enabled } = body;

      if (!code || !name || !category) {
        return NextResponse.json(
          { success: false, error: '缺少必要参数（code、name、category）' },
          { status: 400 }
        );
      }

      // 检查是否已存在
      const existing = await skillRepository.findByCode(code);
      if (existing) {
        return NextResponse.json(
          { success: false, error: '技能代码已存在' },
          { status: 400 }
        );
      }

      const id = await skillRepository.create({
        code,
        name,
        description,
        category,
        apiConfig: apiConfig || {},
        enabled: enabled !== undefined ? enabled : true,
      });

      return NextResponse.json({
        success: true,
        message: '技能创建成功',
        data: { id },
      });
    }

    if (action === 'update') {
      const body = await request.json();
      const { code, name, description, category, apiConfig, enabled } = body;

      if (!code) {
        return NextResponse.json(
          { success: false, error: '缺少code参数' },
          { status: 400 }
        );
      }

      await skillRepository.update(code, {
        name,
        description,
        category,
        apiConfig,
        enabled,
      });

      return NextResponse.json({
        success: true,
        message: '技能更新成功',
      });
    }

    if (action === 'delete') {
      const body = await request.json();
      const { code } = body;

      if (!code) {
        return NextResponse.json(
          { success: false, error: '缺少code参数' },
          { status: 400 }
        );
      }

      await skillRepository.delete(code);

      return NextResponse.json({
        success: true,
        message: '技能删除成功',
      });
    }

    return NextResponse.json(
      { success: false, error: '无效的action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API:Admin:Skills:POST] Error:', error);
    return NextResponse.json(
      { success: false, error: '技能操作失败' },
      { status: 500 }
    );
  }
}
