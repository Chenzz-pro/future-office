/**
 * 自定义技能 API
 * 
 * POST /api/custom-skill
 * - action: 'execute' | 'test' | 'save' | 'list' | 'delete'
 * - skill: CustomSkill (保存时需要)
 * - skillId: string (执行/测试/删除时需要)
 * - params: Record<string, unknown> (执行时需要)
 */

import { NextRequest } from 'next/server';
import { CustomSkill, SKILL_TEMPLATES } from '@/types/custom-skill';
import { executeSkill, testSkill } from '@/lib/custom-skill-executor';

// 简单的内存存储（实际项目中应该使用数据库）
// 这里使用 localStorage 在客户端存储，服务端使用内存缓存
let skillsCache: CustomSkill[] = [];

function jsonResponse(success: boolean, message: string, data?: unknown) {
  return Response.json({ success, message, data });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, skill, skillId, params } = body as {
      action: 'execute' | 'test' | 'save' | 'list' | 'delete' | 'templates';
      skill?: CustomSkill;
      skillId?: string;
      params?: Record<string, unknown>;
    };

    switch (action) {
      case 'templates': {
        // 获取预置模板列表
        return jsonResponse(true, '获取模板成功', SKILL_TEMPLATES);
      }

      case 'list': {
        // 获取技能列表
        return jsonResponse(true, '获取成功', skillsCache);
      }

      case 'save': {
        // 保存技能
        if (!skill) {
          return jsonResponse(false, '缺少技能配置');
        }

        const now = new Date().toISOString();
        const existingIndex = skillsCache.findIndex(s => s.id === skill.id);
        
        if (existingIndex >= 0) {
          // 更新现有技能
          skillsCache[existingIndex] = {
            ...skill,
            updatedAt: now,
          };
          return jsonResponse(true, '技能更新成功', skillsCache[existingIndex]);
        } else {
          // 创建新技能
          const newSkill: CustomSkill = {
            ...skill,
            id: skill.id || `skill_${Date.now()}`,
            createdAt: now,
            updatedAt: now,
          };
          skillsCache.unshift(newSkill);
          return jsonResponse(true, '技能创建成功', newSkill);
        }
      }

      case 'delete': {
        // 删除技能
        if (!skillId) {
          return jsonResponse(false, '缺少技能ID');
        }
        
        const index = skillsCache.findIndex(s => s.id === skillId);
        if (index >= 0) {
          skillsCache.splice(index, 1);
          return jsonResponse(true, '技能删除成功');
        }
        return jsonResponse(false, '技能不存在');
      }

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

        const result = await testSkill(skill);
        return jsonResponse(result.success, result.message, result.data);
      }

      case 'execute': {
        // 执行技能
        if (!skillId) {
          return jsonResponse(false, '缺少技能ID');
        }
        
        const foundSkill = skillsCache.find(s => s.id === skillId);
        if (!foundSkill) {
          return jsonResponse(false, '技能不存在');
        }

        if (!foundSkill.enabled) {
          return jsonResponse(false, '技能未启用');
        }

        const result = await executeSkill(foundSkill, params || {});
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

// GET 请求：获取技能列表或模板
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (type === 'templates') {
    return jsonResponse(true, '获取模板成功', SKILL_TEMPLATES);
  }

  return jsonResponse(true, '获取成功', skillsCache);
}
