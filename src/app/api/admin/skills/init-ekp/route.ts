/**
 * 初始化EKP待办服务技能
 * 只保留一个技能：ekp_notify（EKP待办服务）
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';
import { randomUUID } from 'crypto';

/**
 * POST /api/admin/skills/init-ekp
 * 初始化EKP待办服务技能
 */
export async function POST(request: NextRequest) {
  try {
    // EKP待办服务技能（单一技能，包含7个操作）
    const ekpSkill = {
      id: '10000000-0000-0000-0000-000000000001',
      code: 'ekp_notify',
      name: 'EKP待办服务',
      description: '蓝凌EKP待办REST服务，支持发送、删除、已办、查询、更新待办等7个接口操作',
      category: 'ekp',
      apiConfig: {
        baseUrl: '',
        path: '/api/sys-notify/sysNotifyTodoRestService',
        method: 'POST',
        // 7个操作：getTodoCount, getTodo, sendTodo, deleteTodo, setTodoDone, updateTodo, getTodoTargets
        actions: ['getTodoCount', 'getTodo', 'sendTodo', 'deleteTodo', 'setTodoDone', 'updateTodo', 'getTodoTargets']
      },
      enabled: true
    };

    // 1. 清理所有旧技能（旧版简化技能和EKP子技能）
    const oldSkillCodes = [
      // 旧版简化技能
      'todo.approve', 'todo.list', 'todo.reject',
      'schedule.create', 'schedule.list',
      'meeting.create', 'meeting.list',
      'data.query', 'report.generate',
      // EKP子技能（注意旧code使用点号分隔）
      'ekp.todo.count', 'ekp.todo.list', 'ekp.todo.send',
      'ekp.todo.delete', 'ekp.todo.done', 'ekp.todo.update', 'ekp.todo.targets',
      // 旧版 ekp.notify
      'ekp.notify'
    ];

    let deletedCount = 0;
    for (const code of oldSkillCodes) {
      const result = await dbManager.query('DELETE FROM skills WHERE code = ?', [code]);
      if (result.affectedRows > 0) {
        deletedCount++;
      }
    }

    // 2. 插入或更新EKP待办服务技能（使用REPLACE INTO避免重复主键问题）
    await dbManager.query(`
      REPLACE INTO skills (id, code, name, description, category, api_config, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [ekpSkill.id, ekpSkill.code, ekpSkill.name, ekpSkill.description, ekpSkill.category, JSON.stringify(ekpSkill.apiConfig), ekpSkill.enabled]);

    // 3. 确保 agents_skills 表存在
    await dbManager.query(`
      CREATE TABLE IF NOT EXISTS agents_skills (
        id VARCHAR(36) PRIMARY KEY COMMENT '关联ID',
        agent_type VARCHAR(50) NOT NULL COMMENT 'Agent类型',
        skill_id VARCHAR(100) NOT NULL COMMENT '技能ID（关联skills.code）',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        UNIQUE KEY uk_agent_skill (agent_type, skill_id)
      )
    `);

    // 4. 更新审批智能体技能关联（只关联ekp_notify）
    // 先删除审批智能体的所有旧技能关联
    await dbManager.query('DELETE FROM agents_skills WHERE agent_type = ?', ['approval-agent']);

    // 添加新的技能关联（使用随机UUID作为ID）
    await dbManager.query(`
      INSERT INTO agents_skills (id, agent_type, skill_id)
      VALUES (?, ?, ?)
    `, [randomUUID(), 'approval-agent', 'ekp_notify']);

    // 清理其他智能体的旧技能关联
    for (const agentType of ['assistant-agent', 'data-agent', 'meeting-agent']) {
      await dbManager.query('DELETE FROM agents_skills WHERE agent_type = ?', [agentType]);
    }

    return NextResponse.json({
      success: true,
      message: 'EKP待办服务技能初始化成功',
      data: {
        oldSkillsDeleted: deletedCount,
        currentSkill: 'ekp_notify',
        agentSkillsUpdated: '审批智能体已关联 ekp_notify'
      }
    });
  } catch (error) {
    console.error('[API:Admin:Skills:InitEKP] Error:', error);
    return NextResponse.json(
      { success: false, error: `初始化EKP待办服务技能失败: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
