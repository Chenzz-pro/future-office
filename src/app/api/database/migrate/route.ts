/**
 * 执行数据库迁移脚本
 * 用于创建角色表并修改 sys_org_person 表
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sql } = body;

    if (!sql) {
      return NextResponse.json({ success: false, error: '缺少SQL脚本' }, { status: 400 });
    }

    if (!dbManager.isConnected()) {
      return NextResponse.json(
        { success: false, error: '数据库未连接，请先配置数据库' },
        { status: 400 }
      );
    }

    console.log('[API:Migration] 开始执行数据库迁移...');

    // 分割SQL语句
    const statements: string[] = [];
    const lines = sql.split('\n');
    let currentStatement = '';

    for (const line of lines) {
      // 跳过空行和注释行
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('--') || trimmedLine === '') {
        continue;
      }

      currentStatement += line + '\n';

      // 如果行以分号结尾，说明语句结束
      if (trimmedLine.endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }

    console.log(`[API:Migration] 解析出 ${statements.length} 条 SQL 语句`);

    const failedStatements: { sql: string; error: string }[] = [];
    const successCount: { sql: string }[] = [];

    // 逐条执行SQL语句
    for (const statement of statements) {
      if (!statement) continue;
      try {
        await dbManager.query(statement);
        successCount.push({ sql: statement.substring(0, 60) });
        console.log(`[API:Migration] SQL 执行成功: ${statement.substring(0, 60)}...`);
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.warn('[API:Migration] 执行SQL失败:', error);
        console.warn('[API:Migration] SQL:', statement.substring(0, 100));
        failedStatements.push({ sql: statement, error });
      }
    }

    console.log(`[API:Migration] SQL 执行完成: 成功 ${successCount.length} 条, 失败 ${failedStatements.length} 条`);

    return NextResponse.json({
      success: true,
      message: `数据库迁移完成: 成功 ${successCount.length} 条, 失败 ${failedStatements.length} 条`,
      successCount: successCount.length,
      failedCount: failedStatements.length,
      failedStatements: failedStatements.slice(0, 5), // 只返回前5个失败的语句
    });
  } catch (error: unknown) {
    console.error('[API:Migration] 迁移失败:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
