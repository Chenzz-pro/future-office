// 测试 Agents 表结构
import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';

export async function GET() {
  try {
    // 测试1：查询表结构
    const structureResult = await dbManager.query(`
      SELECT
        COLUMN_NAME as columnName,
        DATA_TYPE as dataType,
        COLUMN_DEFAULT as columnDefault,
        COLUMN_COMMENT as columnComment,
        IS_NULLABLE as isNullable
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agents'
      ORDER BY ORDINAL_POSITION
    `);

    // 测试2：查询所有agents
    const agentsResult = await dbManager.query(`
      SELECT
        id,
        type,
        agent_type as agentType,
        name,
        description,
        enabled,
        version,
        created_at as createdAt
      FROM agents
      ORDER BY type
    `);

    // 测试3：查询RootAgent
    const rootAgentResult = await dbManager.query(`
      SELECT
        id,
        type,
        agent_type as agentType,
        name,
        description,
        enabled,
        version,
        skills_config,
        permission_rules,
        business_rules
      FROM agents
      WHERE type = 'root'
      LIMIT 1
    `);

    return NextResponse.json({
      success: true,
      data: {
        structure: structureResult.rows,
        agents: agentsResult.rows,
        rootAgent: rootAgentResult.rows.length > 0 ? rootAgentResult.rows[0] : null,
      },
    });
  } catch (error) {
    console.error('[TestAgents] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
