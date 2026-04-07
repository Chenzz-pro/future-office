// 查询 agents 表详细信息
import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';

export async function GET() {
  try {
    // 查询所有列
    const result = await dbManager.query(`
      SELECT * FROM agents LIMIT 5
    `);

    // 查询表结构
    const structure = await dbManager.query(`
      SELECT
        COLUMN_NAME,
        DATA_TYPE,
        COLUMN_TYPE,
        COLUMN_DEFAULT,
        IS_NULLABLE,
        COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agents'
      ORDER BY ORDINAL_POSITION
    `);

    return NextResponse.json({
      success: true,
      data: {
        agents: result.rows,
        structure: structure.rows,
      },
    });
  } catch (error) {
    console.error('[TestAgentsDetail] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
