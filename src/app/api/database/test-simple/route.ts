// 简单测试数据库连接
import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';

export async function GET() {
  try {
    // 测试1：简单查询
    const test1 = await dbManager.query('SELECT 1 as test');

    // 测试2：查询表是否存在
    const test2 = await dbManager.query(`
      SELECT COUNT(*) as count FROM agents
    `);

    // 测试3：查询agents数据
    const test3 = await dbManager.query(`
      SELECT id, type, name FROM agents LIMIT 5
    `);

    return NextResponse.json({
      success: true,
      data: {
        test1: test1.rows,
        test2: test2.rows,
        test3: test3.rows,
      },
    });
  } catch (error) {
    console.error('[TestSimple] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
