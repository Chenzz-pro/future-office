/**
 * 自定义技能 API
 * 
 * POST /api/custom-skill
 * - action: 'execute' | 'test'
 * - skill: CustomSkill (执行/测试时需要)
 * - params: Record<string, unknown> (执行时需要)
 * 
 * GET /api/custom-skill?type=templates - 获取预置模板
 */

import { NextRequest } from 'next/server';
import { CustomSkill, SKILL_TEMPLATES } from '@/types/custom-skill';
import { executeSkill } from '@/lib/custom-skill-executor';

function jsonResponse(success: boolean, message: string, data?: unknown) {
  return Response.json({ success, message, data });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, skill, params } = body as {
      action: 'execute' | 'test';
      skill?: CustomSkill;
      params?: Record<string, unknown>;
    };

    switch (action) {
      case 'test': {
        // 测试技能
        if (!skill) {
          return jsonResponse(false, '缺少技能配置');
        }

        // 验证必填配置
        if (!skill.apiConfig.baseUrl) {
          return jsonResponse(false, '请填写服务地址');
        }
        if (skill.authConfig.type === 'basic') {
          if (!skill.authConfig.username || !skill.authConfig.password) {
            return jsonResponse(false, '请填写用户名和密码');
          }
        }

        const result = await executeSkill(skill, params || {});
        return jsonResponse(result.success, result.message, result.data);
      }

      case 'execute': {
        // 执行技能
        if (!skill) {
          return jsonResponse(false, '缺少技能配置');
        }

        if (!skill.enabled) {
          return jsonResponse(false, '技能未启用');
        }

        const result = await executeSkill(skill, params || {});
        return jsonResponse(result.success, result.message, result.data);
      }

      default:
        return jsonResponse(false, '未知操作');
    }
  } catch (err) {
    console.error('Custom skill API error:', err);
    return jsonResponse(false, `服务器错误：${err instanceof Error ? err.message : '未知错误'}`);
  }
}

// GET 请求：获取预置模板
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (type === 'templates') {
    return jsonResponse(true, '获取模板成功', SKILL_TEMPLATES);
  }

  return jsonResponse(true, '获取成功', []);
}
