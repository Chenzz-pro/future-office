/**
 * Agent数据访问层
 */

import { dbManager } from '../manager';

export interface AgentConfig {
  id: string;
  type: string;
  name: string;
  description: string;
  avatar: string;
  systemPrompt: string;
  enabled: boolean;
  skills: string[];
  bots: Array<{ id: string; name: string }>;
  createdAt: Date;
  updatedAt: Date;
}

export class AgentRepository {
  /**
   * 获取所有Agent
   */
  async findAll(): Promise<AgentConfig[]> {
    const result = await dbManager.query(`
      SELECT
        a.id,
        a.type,
        a.name,
        a.description,
        a.avatar,
        a.system_prompt as systemPrompt,
        a.enabled,
        a.created_at as createdAt,
        a.updated_at as updatedAt,
        COALESCE(
          (
            SELECT JSON_ARRAYAGG(as_table.skill_id)
            FROM agents_skills as_table
            WHERE as_table.agent_type = a.type
          ),
          JSON_ARRAY()
        ) as skills,
        COALESCE(
          (
            SELECT JSON_ARRAYAGG(
              JSON_OBJECT(
                'id', ab_table.bot_id,
                'name', ab_table.bot_name
              )
            )
            FROM agents_bots ab_table
            WHERE ab_table.agent_type = a.type
          ),
          JSON_ARRAY()
        ) as bots
      FROM agents a
      WHERE a.enabled = TRUE
      ORDER BY a.type
    `);

    return result.rows as AgentConfig[];
  }

  /**
   * 根据类型获取Agent
   */
  async findByType(type: string): Promise<AgentConfig | null> {
    const result = await dbManager.query(`
      SELECT
        a.id,
        a.type,
        a.name,
        a.description,
        a.avatar,
        a.system_prompt as systemPrompt,
        a.enabled,
        a.created_at as createdAt,
        a.updated_at as updatedAt,
        COALESCE(
          (
            SELECT JSON_ARRAYAGG(as_table.skill_id)
            FROM agents_skills as_table
            WHERE as_table.agent_type = a.type
          ),
          JSON_ARRAY()
        ) as skills,
        COALESCE(
          (
            SELECT JSON_ARRAYAGG(
              JSON_OBJECT(
                'id', ab_table.bot_id,
                'name', ab_table.bot_name
              )
            )
            FROM agents_bots ab_table
            WHERE ab_table.agent_type = a.type
          ),
          JSON_ARRAY()
        ) as bots
      FROM agents a
      WHERE a.type = ? AND a.enabled = TRUE
    `, [type]);

    const agents = result.rows as AgentConfig[];
    return agents.length > 0 ? agents[0] : null;
  }

  /**
   * 更新Agent配置
   */
  async update(type: string, config: Partial<AgentConfig>): Promise<boolean> {
    const updates: string[] = [];
    const values: any[] = [];

    if (config.name !== undefined) {
      updates.push('name = ?');
      values.push(config.name);
    }
    if (config.description !== undefined) {
      updates.push('description = ?');
      values.push(config.description);
    }
    if (config.avatar !== undefined) {
      updates.push('avatar = ?');
      values.push(config.avatar);
    }
    if (config.systemPrompt !== undefined) {
      updates.push('system_prompt = ?');
      values.push(config.systemPrompt);
    }
    if (config.enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(config.enabled);
    }

    if (updates.length === 0) return false;

    values.push(type);

    await dbManager.query(`
      UPDATE agents
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE type = ?
    `, values);

    return true;
  }

  /**
   * 更新Agent技能列表
   */
  async updateSkills(agentType: string, skillIds: string[]): Promise<boolean> {
    // 先删除旧的关联
    await dbManager.query('DELETE FROM agents_skills WHERE agent_type = ?', [agentType]);

    // 插入新的关联
    for (const skillId of skillIds) {
      await dbManager.query(`
        INSERT INTO agents_skills (id, agent_type, skill_id)
        VALUES (?, ?, ?)
      `, [crypto.randomUUID(), agentType, skillId]);
    }

    return true;
  }

  /**
   * 更新Agent子Bot列表
   */
  async updateBots(agentType: string, bots: Array<{ id: string; name: string }>): Promise<boolean> {
    // 先删除旧的关联
    await dbManager.query('DELETE FROM agents_bots WHERE agent_type = ?', [agentType]);

    // 插入新的关联
    for (const bot of bots) {
      await dbManager.query(`
        INSERT INTO agents_bots (id, agent_type, bot_id, bot_name)
        VALUES (?, ?, ?, ?)
      `, [crypto.randomUUID(), agentType, bot.id, bot.name]);
    }

    return true;
  }
}

export const agentRepository = new AgentRepository();
