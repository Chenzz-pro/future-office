/**
 * Agent数据访问层
 * 支持新架构：RootAgent + 业务Agent + 规则引擎
 */

import { dbManager } from '../manager';
import type { AgentConfig, IntentResult } from '@/lib/types/agent';

export class AgentRepository {
  /**
   * 获取所有Agent
   */
  async findAll(): Promise<AgentConfig[]> {
    const result = await dbManager.query(`
      SELECT
        a.id,
        a.type,
        a.agent_type as agentType,
        a.name,
        a.description,
        a.avatar,
        a.system_prompt as systemPrompt,
        a.enabled,
        a.skills_config as skillsConfig,
        a.permission_rules as permissionRules,
        a.business_rules as businessRules,
        a.version,
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
        a.agent_type as agentType,
        a.name,
        a.description,
        a.avatar,
        a.system_prompt as systemPrompt,
        a.enabled,
        a.skills_config as skillsConfig,
        a.permission_rules as permissionRules,
        a.business_rules as businessRules,
        a.version,
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
   * 根据ID获取Agent
   */
  async findById(id: string): Promise<AgentConfig | null> {
    const result = await dbManager.query(`
      SELECT
        a.id,
        a.type,
        a.agent_type as agentType,
        a.name,
        a.description,
        a.avatar,
        a.system_prompt as systemPrompt,
        a.enabled,
        a.skills_config as skillsConfig,
        a.permission_rules as permissionRules,
        a.business_rules as businessRules,
        a.version,
        a.created_at as createdAt,
        a.updated_at as updatedAt
      FROM agents a
      WHERE a.id = ? AND a.enabled = TRUE
    `, [id]);

    const agents = result.rows as AgentConfig[];
    return agents.length > 0 ? agents[0] : null;
  }

  /**
   * 获取RootAgent
   */
  async getRootAgent(): Promise<AgentConfig | null> {
    const result = await dbManager.query(`
      SELECT
        a.id,
        a.type,
        a.agent_type as agentType,
        a.name,
        a.description,
        a.avatar,
        a.system_prompt as systemPrompt,
        a.enabled,
        a.skills_config as skillsConfig,
        a.permission_rules as permissionRules,
        a.business_rules as businessRules,
        a.version,
        a.created_at as createdAt,
        a.updated_at as updatedAt
      FROM agents a
      WHERE a.agent_type = 'root' AND a.enabled = TRUE
      LIMIT 1
    `);

    const agents = result.rows as AgentConfig[];
    return agents.length > 0 ? agents[0] : null;
  }

  /**
   * 获取所有业务Agent
   */
  async getBusinessAgents(): Promise<AgentConfig[]> {
    const result = await dbManager.query(`
      SELECT
        a.id,
        a.type,
        a.agent_type as agentType,
        a.name,
        a.description,
        a.avatar,
        a.system_prompt as systemPrompt,
        a.enabled,
        a.skills_config as skillsConfig,
        a.permission_rules as permissionRules,
        a.business_rules as businessRules,
        a.version,
        a.created_at as createdAt,
        a.updated_at as updatedAt,
        COALESCE(
          (
            SELECT JSON_ARRAYAGG(as_table.skill_id)
            FROM agents_skills as_table
            WHERE as_table.agent_type = a.type
          ),
          JSON_ARRAY()
        ) as skills
      FROM agents a
      WHERE a.agent_type = 'business' AND a.enabled = TRUE
      ORDER BY a.type
    `);

    return result.rows as AgentConfig[];
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
    if (config.skillsConfig !== undefined) {
      updates.push('skills_config = ?');
      values.push(JSON.stringify(config.skillsConfig));
    }
    if (config.permissionRules !== undefined) {
      updates.push('permission_rules = ?');
      values.push(JSON.stringify(config.permissionRules));
    }
    if (config.businessRules !== undefined) {
      updates.push('business_rules = ?');
      values.push(JSON.stringify(config.businessRules));
    }

    if (updates.length === 0) return false;

    updates.push('version = version + 1');
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

  /**
   * 保存Agent规则配置（新架构）
   */
  async saveRules(agentType: string, rules: {
    skillsConfig?: any;
    permissionRules?: any;
    businessRules?: any;
  }): Promise<boolean> {
    const updates: string[] = [];
    const values: any[] = [];

    if (rules.skillsConfig !== undefined) {
      updates.push('skills_config = ?');
      values.push(JSON.stringify(rules.skillsConfig));
    }
    if (rules.permissionRules !== undefined) {
      updates.push('permission_rules = ?');
      values.push(JSON.stringify(rules.permissionRules));
    }
    if (rules.businessRules !== undefined) {
      updates.push('business_rules = ?');
      values.push(JSON.stringify(rules.businessRules));
    }

    if (updates.length === 0) return false;

    updates.push('version = version + 1');
    values.push(agentType);

    await dbManager.query(`
      UPDATE agents
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE type = ?
    `, values);

    return true;
  }

  /**
   * 获取Agent规则配置（新架构）
   */
  async getRules(agentType: string): Promise<{
    skillsConfig?: any;
    permissionRules?: any;
    businessRules?: any;
    version: number;
  } | null> {
    const result = await dbManager.query(`
      SELECT
        skills_config as skillsConfig,
        permission_rules as permissionRules,
        business_rules as businessRules,
        version
      FROM agents
      WHERE type = ?
    `, [agentType]);

    const rows = result.rows as any[];
    if (rows.length === 0) return null;

    return {
      skillsConfig: rows[0].skillsConfig,
      permissionRules: rows[0].permissionRules,
      businessRules: rows[0].businessRules,
      version: rows[0].version,
    };
  }
}

export const agentRepository = new AgentRepository();
