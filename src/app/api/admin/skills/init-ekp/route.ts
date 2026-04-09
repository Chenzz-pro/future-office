/**
 * 初始化EKP待办服务技能
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';

/**
 * POST /api/admin/skills/init-ekp
 * 初始化EKP待办服务技能
 */
export async function POST(request: NextRequest) {
  try {
    // EKP待办服务相关技能
    const ekpSkills = [
      // 1. EKP待办服务（综合技能）
      {
        id: '10000000-0000-0000-0000-000000000001',
        code: 'ekp.notify',
        name: 'EKP待办服务',
        description: '蓝凌EKP待办REST服务，支持发送、删除、已办、查询、更新待办等7个接口操作',
        category: 'ekp',
        apiConfig: {
          baseUrl: '',
          path: '/api/sys-notify/sysNotifyTodoRestService',
          method: 'POST',
          actions: ['getTodoCount', 'getTodo', 'sendTodo', 'deleteTodo', 'setTodoDone', 'updateTodo', 'getTodoTargets']
        },
        enabled: true
      },
      // 2. 获取待办数量
      {
        id: '10000000-0000-0000-0000-000000000002',
        code: 'ekp.todo.count',
        name: '获取待办数量',
        description: '获取指定用户的待办数量，支持按类型筛选',
        category: 'ekp',
        apiConfig: {
          baseUrl: '',
          path: '/api/sys-notify/sysNotifyTodoRestService/getTodoCount',
          method: 'POST',
          params: ['target', 'types']
        },
        enabled: true
      },
      // 3. 获取待办列表
      {
        id: '10000000-0000-0000-0000-000000000003',
        code: 'ekp.todo.list',
        name: '获取待办列表',
        description: '获取指定用户的待办事项列表，支持分页和多种筛选条件',
        category: 'ekp',
        apiConfig: {
          baseUrl: '',
          path: '/api/sys-notify/sysNotifyTodoRestService/getTodo',
          method: 'POST',
          params: ['targets', 'type', 'otherCond', 'rowSize', 'pageNo']
        },
        enabled: true
      },
      // 4. 发送待办
      {
        id: '10000000-0000-0000-0000-000000000004',
        code: 'ekp.todo.send',
        name: '发送待办',
        description: '向指定人员发送待办通知',
        category: 'ekp',
        apiConfig: {
          baseUrl: '',
          path: '/api/sys-notify/sysNotifyTodoRestService/sendTodo',
          method: 'POST',
          params: ['modelName', 'modelId', 'subject', 'link', 'mobileLink', 'padLink', 'type', 'targets', 'createTime']
        },
        enabled: true
      },
      // 5. 删除待办
      {
        id: '10000000-0000-0000-0000-000000000005',
        code: 'ekp.todo.delete',
        name: '删除待办',
        description: '删除指定的待办事项',
        category: 'ekp',
        apiConfig: {
          baseUrl: '',
          path: '/api/sys-notify/sysNotifyTodoRestService/deleteTodo',
          method: 'POST',
          params: ['modelName', 'modelId', 'optType', 'type']
        },
        enabled: true
      },
      // 6. 设为已办
      {
        id: '10000000-0000-0000-0000-000000000006',
        code: 'ekp.todo.done',
        name: '设为已办',
        description: '将待办标记为已处理状态',
        category: 'ekp',
        apiConfig: {
          baseUrl: '',
          path: '/api/sys-notify/sysNotifyTodoRestService/setTodoDone',
          method: 'POST',
          params: ['modelName', 'modelId', 'optType', 'type']
        },
        enabled: true
      },
      // 7. 更新待办
      {
        id: '10000000-0000-0000-0000-000000000007',
        code: 'ekp.todo.update',
        name: '更新待办',
        description: '更新已存在的待办信息',
        category: 'ekp',
        apiConfig: {
          baseUrl: '',
          path: '/api/sys-notify/sysNotifyTodoRestService/updateTodo',
          method: 'POST',
          params: ['modelName', 'modelId', 'subject', 'link', 'mobileLink', 'padLink', 'type', 'level']
        },
        enabled: true
      },
      // 8. 获取待办接收人
      {
        id: '10000000-0000-0000-0000-000000000008',
        code: 'ekp.todo.targets',
        name: '获取待办接收人',
        description: '获取指定待办的所有接收人列表',
        category: 'ekp',
        apiConfig: {
          baseUrl: '',
          path: '/api/sys-notify/sysNotifyTodoRestService/getTodoTargets',
          method: 'POST',
          params: ['fdId']
        },
        enabled: true
      }
    ];

    let insertedCount = 0;
    let updatedCount = 0;

    for (const skill of ekpSkills) {
      // 检查是否已存在
      const existingResult = await dbManager.query(
        'SELECT id FROM skills WHERE code = ?',
        [skill.code]
      );

      if (existingResult.rows.length > 0) {
        // 更新
        await dbManager.query(`
          UPDATE skills 
          SET name = ?, description = ?, category = ?, api_config = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
          WHERE code = ?
        `, [skill.name, skill.description, skill.category, JSON.stringify(skill.apiConfig), skill.enabled, skill.code]);
        updatedCount++;
      } else {
        // 插入
        await dbManager.query(`
          INSERT INTO skills (id, code, name, description, category, api_config, enabled)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [skill.id, skill.code, skill.name, skill.description, skill.category, JSON.stringify(skill.apiConfig), skill.enabled]);
        insertedCount++;
      }
    }

    // 为ApprovalAgent添加EKP待办服务相关技能
    const agentSkills = [
      { id: '10000000-0000-0000-0000-000000000001', agentType: 'approval', skillId: 'ekp.todo.count' },
      { id: '10000000-0000-0000-0000-000000000002', agentType: 'approval', skillId: 'ekp.todo.list' },
      { id: '10000000-0000-0000-0000-000000000003', agentType: 'approval', skillId: 'ekp.todo.done' },
      { id: '10000000-0000-0000-0000-000000000004', agentType: 'approval', skillId: 'ekp.todo.delete' },
      { id: '10000000-0000-0000-0000-000000000005', agentType: 'approval', skillId: 'ekp.notify' }
    ];

    let agentSkillCount = 0;
    for (const agentSkill of agentSkills) {
      // 检查是否已存在
      const existingAgentSkill = await dbManager.query(
        'SELECT id FROM agents_skills WHERE agent_type = ? AND skill_id = ?',
        [agentSkill.agentType, agentSkill.skillId]
      );

      if (existingAgentSkill.rows.length === 0) {
        await dbManager.query(`
          INSERT INTO agents_skills (id, agent_type, skill_id)
          VALUES (?, ?, ?)
        `, [agentSkill.id, agentSkill.agentType, agentSkill.skillId]);
        agentSkillCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'EKP待办服务技能初始化成功',
      data: {
        skillsInserted: insertedCount,
        skillsUpdated: updatedCount,
        agentSkillsAdded: agentSkillCount
      }
    });
  } catch (error) {
    console.error('[API:Admin:Skills:InitEKP] Error:', error);
    return NextResponse.json(
      { success: false, error: `初始化失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    );
  }
}
