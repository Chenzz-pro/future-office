/**
 * 修复Agent类型字段 API
 * 用于修复数据库中的agent type字段，使其与AgentFactory和LLM输出一致
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';

/**
 * POST /api/database/migrate/fix-agent-type
 * 修复Agent类型字段
 */
export async function POST(request: NextRequest) {
  try {
    // 检查数据库是否已连接
    const isConnected = await dbManager.isConnected();

    if (!isConnected) {
      return NextResponse.json(
        {
          success: false,
          error: '数据库未连接',
        },
        { status: 400 }
      );
    }

    console.log('[FixAgentType] 开始修复Agent类型字段...');

    // 1. 更新agents表
    const agentsUpdateResult = await dbManager.query(`
      UPDATE agents SET type = CONCAT(type, '-agent')
      WHERE type IN ('approval', 'meeting', 'data', 'assistant')
    `);
    console.log('[FixAgentType] agents表更新完成:', agentsUpdateResult);

    // 2. 更新agents_skills表
    const skillsUpdateResult = await dbManager.query(`
      UPDATE agents_skills SET agent_type = CONCAT(agent_type, '-agent')
      WHERE agent_type IN ('approval', 'meeting', 'data', 'assistant')
    `);
    console.log('[FixAgentType] agents_skills表更新完成:', skillsUpdateResult);

    // 3. 更新agents_bots表
    const botsUpdateResult = await dbManager.query(`
      UPDATE agents_bots SET agent_type = CONCAT(agent_type, '-agent')
      WHERE agent_type IN ('approval', 'meeting', 'data', 'assistant')
    `);
    console.log('[FixAgentType] agents_bots表更新完成:', botsUpdateResult);

    return NextResponse.json({
      success: true,
      message: 'Agent类型字段修复成功',
      data: {
        agentsUpdated: agentsUpdateResult.affectedRows,
        skillsUpdated: skillsUpdateResult.affectedRows,
        botsUpdated: botsUpdateResult.affectedRows,
      }
    });
  } catch (error: unknown) {
    console.error('[FixAgentType] 修复失败:', error);
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
