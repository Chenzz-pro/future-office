/**
 * 技能配置查询服务
 * 用于从数据库查询技能配置
 */

import { CustomSkill } from '@/types/custom-skill';
import { dbManager } from './database/manager';

/**
 * 技能配置缓存
 */
const skillCache = new Map<string, { skill: CustomSkill; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

/**
 * 清除缓存
 */
export function clearSkillCache(skillCode?: string): void {
  if (skillCode) {
    skillCache.delete(skillCode);
  } else {
    skillCache.clear();
  }
}

/**
 * 根据技能代码查询技能配置
 */
export async function getSkillByCode(skillCode: string): Promise<CustomSkill | null> {
  // 检查缓存
  const cached = skillCache.get(skillCode);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.skill;
  }

  try {
    const result = await dbManager.query(`
      SELECT
        id,
        skill_code,
        skill_name,
        api_path,
        method,
        description,
        category,
        enabled,
        api_config,
        auth_config,
        request_params,
        response_parsing,
        created_at,
        updated_at
      FROM custom_skills
      WHERE skill_code = ?
        AND enabled = TRUE
      LIMIT 1
    `, [skillCode]);

    if (result.rows.length === 0) {
      console.warn(`[SkillQuery] 未找到技能配置: ${skillCode}`);
      return null;
    }

    const row = result.rows[0] as any;
    const skill: CustomSkill = {
      id: row.id,
      name: row.skill_name || row.skill_code,
      description: row.description,
      category: row.category as any || '企业服务',
      enabled: row.enabled,
      icon: 'Settings',  // 默认图标
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
      apiConfig: {
        baseUrl: row.api_config ? JSON.parse(row.api_config).baseUrl || 'http://localhost:5000' : 'http://localhost:5000',
        path: row.api_path || '',
        method: row.api_config ? JSON.parse(row.api_config).method || 'POST' : 'POST',
        contentType: 'application/json',
        timeout: row.api_config ? JSON.parse(row.api_config).timeout || 10000 : 10000,
      },
      authConfig: row.auth_config ? JSON.parse(row.auth_config) : { type: 'none' },
      requestParams: row.request_params ? JSON.parse(row.request_params) : [],
      responseParsing: row.response_parsing ? JSON.parse(row.response_parsing) : {
        successField: 'success',
        successValue: 'true',
        dataField: 'data',
        messageField: 'error',
      },
    };

    // 更新缓存
    skillCache.set(skillCode, { skill, timestamp: Date.now() });

    return skill;
  } catch (error) {
    console.error(`[SkillQuery] 查询技能配置失败: ${skillCode}`, error);
    return null;
  }
}

/**
 * 根据分类查询技能列表
 */
export async function getSkillsByCategory(category: string): Promise<CustomSkill[]> {
  try {
    const result = await dbManager.query(`
      SELECT
        id,
        skill_code,
        skill_name,
        api_path,
        method,
        description,
        category,
        enabled,
        api_config,
        auth_config,
        request_params,
        response_parsing,
        created_at,
        updated_at
      FROM custom_skills
      WHERE category = ?
        AND enabled = TRUE
      ORDER BY skill_code
    `, [category]);

    return result.rows.map((row: any) => ({
      id: row.id,
      name: row.skill_name || row.skill_code,
      description: row.description,
      category: row.category as any || '企业服务',
      enabled: row.enabled,
      icon: 'Settings',
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
      apiConfig: {
        baseUrl: row.api_config ? JSON.parse(row.api_config).baseUrl || 'http://localhost:5000' : 'http://localhost:5000',
        path: row.api_path || '',
        method: row.api_config ? JSON.parse(row.api_config).method || 'POST' : 'POST',
        contentType: 'application/json',
        timeout: row.api_config ? JSON.parse(row.api_config).timeout || 10000 : 10000,
      },
      authConfig: row.auth_config ? JSON.parse(row.auth_config) : { type: 'none' },
      requestParams: row.request_params ? JSON.parse(row.request_params) : [],
      responseParsing: row.response_parsing ? JSON.parse(row.response_parsing) : {
        successField: 'success',
        successValue: 'true',
        dataField: 'data',
        messageField: 'error',
      },
    }));
  } catch (error) {
    console.error(`[SkillQuery] 查询分类技能失败: ${category}`, error);
    return [];
  }
}

/**
 * 查询所有技能
 */
export async function getAllSkills(enabledOnly: boolean = true): Promise<CustomSkill[]> {
  try {
    const query = enabledOnly
      ? `SELECT * FROM custom_skills WHERE enabled = TRUE ORDER BY category, skill_code`
      : `SELECT * FROM custom_skills ORDER BY category, skill_code`;

    const result = await dbManager.query(query);

    return result.rows.map((row: any) => ({
      id: row.id,
      skillCode: row.skill_code,
      skillName: row.skill_name,
      name: row.skill_name,
      description: row.description,
      category: row.category,
      enabled: row.enabled,
      icon: '',
      apiConfig: row.api_config ? JSON.parse(row.api_config) : {},
      authConfig: row.auth_config ? JSON.parse(row.auth_config) : {},
      requestParams: row.request_params ? JSON.parse(row.request_params) : [],
      responseParsing: row.response_parsing ? JSON.parse(row.response_parsing) : {},
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    console.error('[SkillQuery] 查询所有技能失败', error);
    return [];
  }
}

/**
 * 验证技能配置是否完整
 */
export function validateSkillConfig(skill: CustomSkill): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 检查必填字段
  if (!skill.name) errors.push('技能名称不能为空');
  if (!skill.apiConfig.baseUrl) errors.push('API基础URL不能为空');
  if (!skill.apiConfig.method) errors.push('HTTP方法不能为空');

  // 检查响应解析配置
  if (!skill.responseParsing.successField) errors.push('成功标识字段不能为空');
  if (!skill.responseParsing.successValue) errors.push('成功标识值不能为空');
  if (!skill.responseParsing.dataField) errors.push('数据字段不能为空');

  // 检查认证配置
  if (skill.authConfig.type === 'basic') {
    const config = skill.authConfig as any;
    if (!config.username) errors.push('Basic Auth需要用户名');
    if (!config.password) errors.push('Basic Auth需要密码');
  } else if (skill.authConfig.type === 'bearer') {
    const config = skill.authConfig as any;
    if (!config.token) errors.push('Bearer Token需要token');
  } else if (skill.authConfig.type === 'api-key') {
    const config = skill.authConfig as any;
    if (!config.apiKey) errors.push('API Key认证需要apiKey');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 导出技能配置服务
 */
export const skillQueryService = {
  getSkillByCode,
  getSkillsByCategory,
  getAllSkills,
  validateSkillConfig,
  clearSkillCache,
};
