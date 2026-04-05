// 自定义技能数据访问层

import { dbManager } from '../manager';

export interface CustomSkill {
  id: string;
  userId: string;
  name: string;
  description?: string;
  icon?: string;
  category?: string;
  enabled: boolean;
  apiConfig: Record<string, unknown>;
  authConfig?: Record<string, unknown>;
  requestParams?: Record<string, unknown>;
  bodyTemplate?: Record<string, unknown>;
  responseParsing?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class CustomSkillRepository {
  /**
   * 创建自定义技能
   */
  async create(skill: Omit<CustomSkill, 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = skill.id || crypto.randomUUID();
    const sql = `
      INSERT INTO custom_skills (
        id, user_id, name, description, icon, category, enabled,
        api_config, auth_config, request_params, body_template, response_parsing
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await dbManager.query(sql, [
      id,
      skill.userId,
      skill.name,
      skill.description || null,
      skill.icon || null,
      skill.category || null,
      skill.enabled,
      JSON.stringify(skill.apiConfig),
      skill.authConfig ? JSON.stringify(skill.authConfig) : null,
      skill.requestParams ? JSON.stringify(skill.requestParams) : null,
      skill.bodyTemplate ? JSON.stringify(skill.bodyTemplate) : null,
      skill.responseParsing ? JSON.stringify(skill.responseParsing) : null,
    ]);
    return id;
  }

  /**
   * 根据 ID 查找技能
   */
  async findById(id: string): Promise<CustomSkill | null> {
    const sql = 'SELECT * FROM custom_skills WHERE id = ?';
    const { rows } = await dbManager.query<CustomSkill>(sql, [id]);
    return rows[0] ? this.parseJsonFields(rows[0]) : null;
  }

  /**
   * 获取用户的所有技能
   */
  async findByUserId(userId: string): Promise<CustomSkill[]> {
    const sql = `
      SELECT * FROM custom_skills
      WHERE user_id = ?
      ORDER BY created_at DESC
    `;
    const { rows } = await dbManager.query<CustomSkill>(sql, [userId]);
    return rows.map(row => this.parseJsonFields(row));
  }

  /**
   * 获取用户启用的技能
   */
  async findEnabledByUserId(userId: string): Promise<CustomSkill[]> {
    const sql = `
      SELECT * FROM custom_skills
      WHERE user_id = ? AND enabled = true
      ORDER BY created_at DESC
    `;
    const { rows } = await dbManager.query<CustomSkill>(sql, [userId]);
    return rows.map(row => this.parseJsonFields(row));
  }

  /**
   * 根据分类获取技能
   */
  async findByCategory(userId: string, category: string): Promise<CustomSkill[]> {
    const sql = `
      SELECT * FROM custom_skills
      WHERE user_id = ? AND category = ?
      ORDER BY created_at DESC
    `;
    const { rows } = await dbManager.query<CustomSkill>(sql, [userId, category]);
    return rows.map(row => this.parseJsonFields(row));
  }

  /**
   * 获取所有预置模板（用户ID为空或特殊值）
   */
  async findTemplates(): Promise<CustomSkill[]> {
    const sql = `
      SELECT * FROM custom_skills
      WHERE user_id IS NULL OR user_id = 'system'
      ORDER BY created_at DESC
    `;
    const { rows } = await dbManager.query<CustomSkill>(sql);
    return rows.map(row => this.parseJsonFields(row));
  }

  /**
   * 更新技能
   */
  async update(id: string, updates: Partial<Omit<CustomSkill, 'id' | 'createdAt'>>): Promise<boolean> {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      params.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      params.push(updates.description);
    }
    if (updates.icon !== undefined) {
      fields.push('icon = ?');
      params.push(updates.icon);
    }
    if (updates.category !== undefined) {
      fields.push('category = ?');
      params.push(updates.category);
    }
    if (updates.enabled !== undefined) {
      fields.push('enabled = ?');
      params.push(updates.enabled);
    }
    if (updates.apiConfig !== undefined) {
      fields.push('api_config = ?');
      params.push(JSON.stringify(updates.apiConfig));
    }
    if (updates.authConfig !== undefined) {
      fields.push('auth_config = ?');
      params.push(JSON.stringify(updates.authConfig));
    }
    if (updates.requestParams !== undefined) {
      fields.push('request_params = ?');
      params.push(JSON.stringify(updates.requestParams));
    }
    if (updates.bodyTemplate !== undefined) {
      fields.push('body_template = ?');
      params.push(JSON.stringify(updates.bodyTemplate));
    }
    if (updates.responseParsing !== undefined) {
      fields.push('response_parsing = ?');
      params.push(JSON.stringify(updates.responseParsing));
    }

    if (fields.length === 0) return false;

    params.push(id);
    const sql = `UPDATE custom_skills SET ${fields.join(', ')} WHERE id = ?`;
    const { affectedRows } = await dbManager.query(sql, params);
    return (affectedRows || 0) > 0;
  }

  /**
   * 删除技能
   */
  async delete(id: string): Promise<boolean> {
    const sql = 'DELETE FROM custom_skills WHERE id = ?';
    const { affectedRows } = await dbManager.query(sql, [id]);
    return (affectedRows || 0) > 0;
  }

  /**
   * 解析 JSON 字段
   */
  private parseJsonFields(skill: CustomSkill): CustomSkill {
    return {
      ...skill,
      apiConfig: typeof skill.apiConfig === 'string' ? JSON.parse(skill.apiConfig) : skill.apiConfig,
      authConfig: skill.authConfig && typeof skill.authConfig === 'string'
        ? JSON.parse(skill.authConfig)
        : skill.authConfig,
      requestParams: skill.requestParams && typeof skill.requestParams === 'string'
        ? JSON.parse(skill.requestParams)
        : skill.requestParams,
      bodyTemplate: skill.bodyTemplate && typeof skill.bodyTemplate === 'string'
        ? JSON.parse(skill.bodyTemplate)
        : skill.bodyTemplate,
      responseParsing: skill.responseParsing && typeof skill.responseParsing === 'string'
        ? JSON.parse(skill.responseParsing)
        : skill.responseParsing,
    };
  }
}

export const customSkillRepository = new CustomSkillRepository();
