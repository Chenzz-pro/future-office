/**
 * 技能数据访问层
 */

import { dbManager } from '../manager';

export interface SkillConfig {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  apiConfig: Record<string, any>;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class SkillRepository {
  /**
   * 获取所有技能
   */
  async findAll(): Promise<SkillConfig[]> {
    const result = await dbManager.query(`
      SELECT
        id,
        code,
        name,
        description,
        category,
        api_config as apiConfig,
        enabled,
        created_at as createdAt,
        updated_at as updatedAt
      FROM skills
      WHERE enabled = TRUE
      ORDER BY category, code
    `);

    return result.rows as SkillConfig[];
  }

  /**
   * 根据代码获取技能
   */
  async findByCode(code: string): Promise<SkillConfig | null> {
    const result = await dbManager.query(`
      SELECT
        id,
        code,
        name,
        description,
        category,
        api_config as apiConfig,
        enabled,
        created_at as createdAt,
        updated_at as updatedAt
      FROM skills
      WHERE code = ? AND enabled = TRUE
    `, [code]);

    const skills = result.rows as SkillConfig[];
    return skills.length > 0 ? skills[0] : null;
  }

  /**
   * 根据分类获取技能
   */
  async findByCategory(category: string): Promise<SkillConfig[]> {
    const result = await dbManager.query(`
      SELECT
        id,
        code,
        name,
        description,
        category,
        api_config as apiConfig,
        enabled,
        created_at as createdAt,
        updated_at as updatedAt
      FROM skills
      WHERE category = ? AND enabled = TRUE
      ORDER BY code
    `, [category]);

    return result.rows as SkillConfig[];
  }

  /**
   * 创建技能
   */
  async create(skill: Omit<SkillConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = crypto.randomUUID();
    await dbManager.query(`
      INSERT INTO skills (id, code, name, description, category, api_config, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, skill.code, skill.name, skill.description, skill.category, JSON.stringify(skill.apiConfig), skill.enabled]);

    return id;
  }

  /**
   * 更新技能
   */
  async update(code: string, skill: Partial<Omit<SkillConfig, 'id' | 'code' | 'createdAt' | 'updatedAt'>>): Promise<boolean> {
    const updates: string[] = [];
    const values: any[] = [];

    if (skill.name !== undefined) {
      updates.push('name = ?');
      values.push(skill.name);
    }
    if (skill.description !== undefined) {
      updates.push('description = ?');
      values.push(skill.description);
    }
    if (skill.category !== undefined) {
      updates.push('category = ?');
      values.push(skill.category);
    }
    if (skill.apiConfig !== undefined) {
      updates.push('api_config = ?');
      values.push(JSON.stringify(skill.apiConfig));
    }
    if (skill.enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(skill.enabled);
    }

    if (updates.length === 0) return false;

    values.push(code);

    await dbManager.query(`
      UPDATE skills
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE code = ?
    `, values);

    return true;
  }

  /**
   * 删除技能
   */
  async delete(code: string): Promise<boolean> {
    await dbManager.query('DELETE FROM skills WHERE code = ?', [code]);
    return true;
  }
}

export const skillRepository = new SkillRepository();
