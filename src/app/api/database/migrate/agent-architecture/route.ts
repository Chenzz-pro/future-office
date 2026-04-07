/**
 * Agent架构迁移 API
 * 用于将现有的 agents 表升级到新架构（RootAgent + 业务Agent + 规则引擎）
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';

export async function POST(request: NextRequest) {
  try {
    console.log('[MigrateAgentArchitecture] 开始Agent架构迁移...');

    // 1. 检查并添加 agent_type 字段
    try {
      await dbManager.query(`
        ALTER TABLE agents ADD COLUMN agent_type ENUM('root', 'business') DEFAULT 'business' COMMENT 'Agent类型（root=根智能体，business=业务智能体）'
      `);
      console.log('[MigrateAgentArchitecture] agent_type 字段添加成功');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('[MigrateAgentArchitecture] agent_type 字段已存在，跳过');
      } else {
        throw error;
      }
    }

    // 2. 检查并添加 skills_config 字段
    try {
      await dbManager.query(`
        ALTER TABLE agents ADD COLUMN skills_config JSON COMMENT '技能绑定配置（定义Agent可调用的技能白名单）'
      `);
      console.log('[MigrateAgentArchitecture] skills_config 字段添加成功');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('[MigrateAgentArchitecture] skills_config 字段已存在，跳过');
      } else {
        throw error;
      }
    }

    // 3. 检查并添加 permission_rules 字段
    try {
      await dbManager.query(`
        ALTER TABLE agents ADD COLUMN permission_rules JSON COMMENT '权限规则配置（条件+校验逻辑+拦截动作）'
      `);
      console.log('[MigrateAgentArchitecture] permission_rules 字段添加成功');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('[MigrateAgentArchitecture] permission_rules 字段已存在，跳过');
      } else {
        throw error;
      }
    }

    // 4. 检查并添加 business_rules 字段
    try {
      await dbManager.query(`
        ALTER TABLE agents ADD COLUMN business_rules JSON COMMENT '业务流程规则（流程步骤+校验逻辑+异常处理）'
      `);
      console.log('[MigrateAgentArchitecture] business_rules 字段添加成功');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('[MigrateAgentArchitecture] business_rules 字段已存在，跳过');
      } else {
        throw error;
      }
    }

    // 5. 检查并添加 version 字段
    try {
      await dbManager.query(`
        ALTER TABLE agents ADD COLUMN version INT DEFAULT 1 COMMENT '配置版本号'
      `);
      console.log('[MigrateAgentArchitecture] version 字段添加成功');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('[MigrateAgentArchitecture] version 字段已存在，跳过');
      } else {
        throw error;
      }
    }

    // 6. 更新现有Agent的agent_type
    await dbManager.query(`
      UPDATE agents SET agent_type = 'root' WHERE type = 'root'
    `);
    console.log('[MigrateAgentArchitecture] RootAgent的agent_type更新成功');

    await dbManager.query(`
      UPDATE agents SET agent_type = 'business' WHERE type IN ('approval', 'meeting', 'data', 'assistant')
    `);
    console.log('[MigrateAgentArchitecture] 业务Agent的agent_type更新成功');

    // 7. 为现有Agent初始化默认配置
    // RootAgent 不需要 skills_config，只需要 system_prompt
    // 业务Agent的配置将根据系统提示词自动生成（在迁移工具中实现）

    return NextResponse.json({
      success: true,
      message: 'Agent架构迁移成功',
      data: {
        fieldsAdded: ['agent_type', 'skills_config', 'permission_rules', 'business_rules', 'version'],
      },
    });
  } catch (error: unknown) {
    console.error('[MigrateAgentArchitecture] 迁移失败:', error);
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

export async function GET() {
  try {
    // 检查迁移状态
    const result = await dbManager.query(`
      SELECT
        COLUMN_NAME,
        DATA_TYPE,
        COLUMN_DEFAULT,
        COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agents'
      ORDER BY ORDINAL_POSITION
    `);

    const columns = result.rows as any[];
    const newFields = ['agent_type', 'skills_config', 'permission_rules', 'business_rules', 'version'];
    const existingFields = columns.map(c => c.COLUMN_NAME);
    const missingFields = newFields.filter(f => !existingFields.includes(f));

    // 查询Agent数据
    const agentsResult = await dbManager.query(`
      SELECT
        id,
        type,
        agent_type as agentType,
        name,
        version,
        CASE
          WHEN skills_config IS NOT NULL THEN TRUE
          ELSE FALSE
        END as hasSkillsConfig,
        CASE
          WHEN permission_rules IS NOT NULL THEN TRUE
          ELSE FALSE
        END as hasPermissionRules,
        CASE
          WHEN business_rules IS NOT NULL THEN TRUE
          ELSE FALSE
        END as hasBusinessRules
      FROM agents
      ORDER BY type
    `);

    return NextResponse.json({
      success: true,
      data: {
        migrationStatus: {
          allFieldsExist: missingFields.length === 0,
          missingFields,
          existingFields,
        },
        columns,
        agents: agentsResult.rows,
      },
    });
  } catch (error: unknown) {
    console.error('[MigrateAgentArchitecture] 检查失败:', error);
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
