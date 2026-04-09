/**
 * 测试EKP接口表字段
 */
import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database';

export async function GET() {
  try {
    // 检查表是否存在
    const tableExistsResult = await dbManager.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'ekp_official_interfaces'
    `);

    const tableExists = (tableExistsResult.rows[0] as any)?.count > 0;

    if (!tableExists) {
      return NextResponse.json({
        success: false,
        error: '表不存在',
      });
    }

    // 检查表结构
    const columnsResult = await dbManager.query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'ekp_official_interfaces'
      ORDER BY ORDINAL_POSITION
    `);

    return NextResponse.json({
      success: true,
      columns: columnsResult.rows,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
}
