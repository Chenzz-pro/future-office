/**
 * 修复组织架构数据
 * 将子部门的 fd_parentid 字段迁移到 fd_parentorgid 字段
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';

export async function POST(request: NextRequest) {
  try {
    console.log('[FixOrgData] 开始修复组织架构数据...');

    // 检查数据库连接
    const isConnected = await dbManager.isConnected();
    if (!isConnected) {
      return NextResponse.json(
        { success: false, error: '数据库未连接' },
        { status: 400 }
      );
    }

    // 查询所有使用了 fd_parentid 字段的部门
    const result = await dbManager.query(`
      SELECT fd_id, fd_org_type, fd_name, fd_parentid, fd_parentorgid
      FROM sys_org_element
      WHERE fd_org_type = 2
        AND fd_parentid IS NOT NULL
        AND fd_parentid != ''
    `);

    const rows = result.rows as Array<{
      fd_id: string;
      fd_org_type: number;
      fd_name: string;
      fd_parentid: string | null;
      fd_parentorgid: string | null;
    }>;

    console.log(`[FixOrgData] 找到 ${rows.length} 个需要修复的部门`);

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有需要修复的数据',
        fixedCount: 0,
      });
    }

    // 修复数据：将 fd_parentid 迁移到 fd_parentorgid
    let fixedCount = 0;
    for (const row of rows) {
      if (row.fd_parentid) {
        await dbManager.query(`
          UPDATE sys_org_element
          SET fd_parentorgid = ?
          WHERE fd_id = ?
        `, [row.fd_parentid, row.fd_id]);

        console.log(`[FixOrgData] 修复部门: ${row.fd_name}，将 fd_parentid (${row.fd_parentid}) 迁移到 fd_parentorgid`);
        fixedCount++;
      }
    }

    console.log(`[FixOrgData] 数据修复完成，共修复 ${fixedCount} 个部门`);

    return NextResponse.json({
      success: true,
      message: `成功修复 ${fixedCount} 个部门的数据`,
      fixedCount,
    });
  } catch (error: unknown) {
    console.error('[FixOrgData] 修复数据失败:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
