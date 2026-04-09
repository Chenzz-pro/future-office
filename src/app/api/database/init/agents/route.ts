/**
 * 触发Agent和技能表初始化 API
 * 用于手动初始化多Agent架构的表和数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';

/**
 * POST /api/database/init/agents
 * 手动初始化Agent和技能表
 */
export async function POST(request: NextRequest) {
  try {
    // 检查数据库是否已连接
    const isConnected = await dbManager.isConnected();

    if (!isConnected) {
      return NextResponse.json(
        {
          success: false,
          error: '数据库未连接，请先配置数据库连接',
        },
        { status: 400 }
      );
    }

    // 创建多Agent架构表
    console.log('[InitAgents] 开始创建多Agent架构表...');

    // 1. 创建agents表
    await dbManager.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id VARCHAR(36) PRIMARY KEY COMMENT 'Agent ID',
        type VARCHAR(50) NOT NULL UNIQUE COMMENT 'Agent类型（root、approval、meeting、data、assistant）',
        name VARCHAR(100) NOT NULL COMMENT 'Agent名称',
        description TEXT COMMENT 'Agent描述',
        avatar VARCHAR(100) DEFAULT '🤖' COMMENT 'Agent头像',
        system_prompt TEXT COMMENT '系统提示词（角色）',
        enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_type (type),
        INDEX idx_enabled (enabled)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Agent配置表'
    `);
    console.log('[InitAgents] agents 表创建成功');

    // 2. 创建agents_skills表
    await dbManager.query(`
      CREATE TABLE IF NOT EXISTS agents_skills (
        id VARCHAR(36) PRIMARY KEY COMMENT '关联ID',
        agent_type VARCHAR(50) NOT NULL COMMENT 'Agent类型',
        skill_id VARCHAR(100) NOT NULL COMMENT '技能ID（关联skills.code）',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        UNIQUE KEY uk_agent_skill (agent_type, skill_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Agent技能关联表'
    `);
    console.log('[InitAgents] agents_skills 表创建成功');

    // 3. 创建agents_bots表
    await dbManager.query(`
      CREATE TABLE IF NOT EXISTS agents_bots (
        id VARCHAR(36) PRIMARY KEY COMMENT '关联ID',
        agent_type VARCHAR(50) NOT NULL COMMENT 'Agent类型',
        bot_id VARCHAR(100) NOT NULL COMMENT '子Bot ID',
        bot_name VARCHAR(100) NOT NULL COMMENT '子Bot名称',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        UNIQUE KEY uk_agent_bot (agent_type, bot_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Agent子Bot关联表'
    `);
    console.log('[InitAgents] agents_bots 表创建成功');

    // 4. 创建skills表
    await dbManager.query(`
      CREATE TABLE IF NOT EXISTS skills (
        id VARCHAR(36) PRIMARY KEY COMMENT '技能ID',
        code VARCHAR(100) NOT NULL UNIQUE COMMENT '技能代码（如todo.list）',
        name VARCHAR(100) NOT NULL COMMENT '技能名称',
        description TEXT COMMENT '技能描述',
        category VARCHAR(50) DEFAULT 'custom' COMMENT '技能分类（custom、ekp、meeting、data）',
        api_config JSON COMMENT 'API配置',
        enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_code (code),
        INDEX idx_category (category),
        INDEX idx_enabled (enabled)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='技能配置表'
    `);
    console.log('[InitAgents] skills 表创建成功');

    // 5. 插入默认Agent数据
    const agents = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        type: 'root',
        name: '统筹智能体',
        description: '负责意图识别、任务分发、结果汇总',
        avatar: '🎯',
        system_prompt: '你是企业OA系统的统筹智能体，负责：\n1. 识别用户意图（审批/会议/数据/个人助理）\n2. 分发任务给对应业务Agent\n3. 汇总结果返回用户\n\n重要规则：\n- 只能处理当前用户自己的数据\n- 禁止查询他人待办、他人会议、他人流程\n- 禁止越权操作\n- 所有操作必须带上userId、deptId、role\n- 遇到无权限请求，直接拒绝并说明原因'
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        type: 'approval',
        name: '审批智能体',
        description: '负责待办审批、流程发起、审批查询',
        avatar: '✅',
        system_prompt: '你是企业OA系统的审批智能体，负责：\n1. 查询待办事项\n2. 处理审批操作（同意/拒绝）\n3. 发起新的审批流程\n\n权限规则：\n- 只能查询当前用户的待办\n- 只能处理当前用户有权限的审批\n- 所有操作必须带上userId'
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        type: 'meeting',
        name: '会议智能体',
        description: '负责会议查询、会议预定、会议通知',
        avatar: '📅',
        system_prompt: '你是企业OA系统的会议智能体，负责：\n1. 查询会议列表\n2. 预定新会议\n3. 更新会议信息\n4. 取消会议\n\n权限规则：\n- 只能查询当前用户的会议\n- 只能操作当前用户有权限的会议\n- 会议预定必须检查资源占用'
      },
      {
        id: '00000000-0000-0000-0000-000000000004',
        type: 'data',
        name: '数据智能体',
        description: '负责表单查询、统计分析、报表生成',
        avatar: '📊',
        system_prompt: '你是企业OA系统的数据智能体，负责：\n1. 查询表单数据\n2. 生成统计报表\n3. 提供数据分析\n\n权限规则：\n- 只能查询当前用户有权限的数据\n- 根据用户角色过滤数据范围'
      },
      {
        id: '00000000-0000-0000-0000-000000000005',
        type: 'assistant',
        name: '个人助理智能体',
        description: '负责日程管理、提醒通知、个人事务',
        avatar: '🤝',
        system_prompt: '你是企业OA系统的个人助理智能体，负责：\n1. 日程管理\n2. 提醒通知\n3. 个人事务处理\n\n权限规则：\n- 只能管理当前用户的日程和提醒\n- 所有操作必须带上userId'
      }
    ];

    for (const agent of agents) {
      await dbManager.query(
        `INSERT INTO agents (id, type, name, description, avatar, system_prompt, enabled)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)
         ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         description = VALUES(description),
         avatar = VALUES(avatar),
         system_prompt = VALUES(system_prompt)`,
        [agent.id, agent.type, agent.name, agent.description, agent.avatar, agent.system_prompt]
      );
    }
    console.log('[InitAgents] Agent数据插入成功');

    // 6. 插入默认技能数据
    const skills = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        code: 'todo.list',
        name: '待办查询',
        description: '查询当前用户的待办事项',
        category: 'approval',
        api_config: JSON.stringify({
          method: 'GET',
          endpoint: '/api/ekp?action=getTodoCount',
          params: ['todoType']
        })
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        code: 'todo.approve',
        name: '审批同意',
        description: '同意待办事项',
        category: 'approval',
        api_config: JSON.stringify({
          method: 'POST',
          endpoint: '/api/workflow/approve',
          params: ['todoId', 'comment']
        })
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        code: 'todo.reject',
        name: '审批拒绝',
        description: '拒绝待办事项',
        category: 'approval',
        api_config: JSON.stringify({
          method: 'POST',
          endpoint: '/api/workflow/reject',
          params: ['todoId', 'comment']
        })
      },
      {
        id: '00000000-0000-0000-0000-000000000004',
        code: 'meeting.list',
        name: '会议列表',
        description: '查询会议列表',
        category: 'meeting',
        api_config: JSON.stringify({
          method: 'GET',
          endpoint: '/api/meeting/list',
          params: ['startDate', 'endDate']
        })
      },
      {
        id: '00000000-0000-0000-0000-000000000005',
        code: 'meeting.create',
        name: '创建会议',
        description: '预定新会议',
        category: 'meeting',
        api_config: JSON.stringify({
          method: 'POST',
          endpoint: '/api/meeting/create',
          params: ['title', 'startTime', 'endTime', 'participants']
        })
      },
      {
        id: '00000000-0000-0000-0000-000000000006',
        code: 'data.query',
        name: '数据查询',
        description: '查询表单数据',
        category: 'data',
        api_config: JSON.stringify({
          method: 'GET',
          endpoint: '/api/data/query',
          params: ['formId', 'filters']
        })
      },
      {
        id: '00000000-0000-0000-0000-000000000007',
        code: 'report.generate',
        name: '报表生成',
        description: '生成统计报表',
        category: 'data',
        api_config: JSON.stringify({
          method: 'POST',
          endpoint: '/api/report/generate',
          params: ['reportType', 'dateRange']
        })
      },
      {
        id: '00000000-0000-0000-0000-000000000008',
        code: 'schedule.list',
        name: '日程列表',
        description: '查询日程安排',
        category: 'assistant',
        api_config: JSON.stringify({
          method: 'GET',
          endpoint: '/api/schedule/list',
          params: ['date']
        })
      },
      {
        id: '00000000-0000-0000-0000-000000000009',
        code: 'schedule.create',
        name: '创建日程',
        description: '创建新的日程',
        category: 'assistant',
        api_config: JSON.stringify({
          method: 'POST',
          endpoint: '/api/schedule/create',
          params: ['title', 'startTime', 'endTime', 'location']
        })
      }
    ];

    for (const skill of skills) {
      await dbManager.query(
        `INSERT INTO skills (id, code, name, description, category, api_config, enabled)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)
         ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         description = VALUES(description),
         category = VALUES(category),
         api_config = VALUES(api_config)`,
        [skill.id, skill.code, skill.name, skill.description, skill.category, skill.api_config]
      );
    }
    console.log('[InitAgents] 技能数据插入成功');

    // 7. 为各Agent配置技能
    const agentSkills = [
      // ApprovalAgent的技能
      { agentType: 'approval', skillId: 'todo.list' },
      { agentType: 'approval', skillId: 'todo.approve' },
      { agentType: 'approval', skillId: 'todo.reject' },
      // MeetingAgent的技能
      { agentType: 'meeting', skillId: 'meeting.list' },
      { agentType: 'meeting', skillId: 'meeting.create' },
      // DataAgent的技能
      { agentType: 'data', skillId: 'data.query' },
      { agentType: 'data', skillId: 'report.generate' },
      // AssistantAgent的技能
      { agentType: 'assistant', skillId: 'schedule.list' },
      { agentType: 'assistant', skillId: 'schedule.create' }
    ];

    for (const as of agentSkills) {
      await dbManager.query(
        `INSERT INTO agents_skills (id, agent_type, skill_id)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE skill_id = VALUES(skill_id)`,
        [crypto.randomUUID(), as.agentType, as.skillId]
      );
    }
    console.log('[InitAgents] Agent技能关联数据插入成功');

    return NextResponse.json({
      success: true,
      message: 'Agent和技能表初始化成功',
      data: {
        agentsCount: agents.length,
        skillsCount: skills.length,
        agentSkillsCount: agentSkills.length
      }
    });
  } catch (error: unknown) {
    console.error('[InitAgents] 初始化失败:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
