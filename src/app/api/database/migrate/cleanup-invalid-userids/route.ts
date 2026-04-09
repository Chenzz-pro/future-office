/**
 * 数据库迁移 API - 清理无效的 user_id
 * 将 chat_sessions 表中无效的 user_id（如 "user"）替换为有效的 UUID 或删除
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';

/**
 * GET /api/database/migrate/cleanup-invalid-userids
 * 检查是否有无效的 user_id 需要清理
 */
export async function GET(request: NextRequest) {
  try {
    // 检查数据库是否已连接
    const isConnected = await dbManager.isConnected();

    if (!isConnected) {
      return NextResponse.json({
        success: false,
        needCleanup: false,
        message: '数据库未连接',
      });
    }

    // 检查 chat_sessions 表是否存在
    const tableCheck = await dbManager.query<{ exists: number }>(
      `SELECT COUNT(*) as exists
       FROM information_schema.tables
       WHERE table_schema = DATABASE()
       AND table_name = 'chat_sessions'`
    );

    const tableExists = (tableCheck.rows[0] as { exists: number })?.exists === 1;

    if (!tableExists) {
      return NextResponse.json({
        success: true,
        needCleanup: false,
        message: 'chat_sessions 表不存在',
      });
    }

    // 查找无效的 user_id（不是 UUID 格式的）
    // UUID 格式: 8-4-4-4-12 的十六进制字符
    const invalidSessions = await dbManager.query<{
      id: string;
      user_id: string;
      title: string;
    }>(
      `SELECT id, user_id, title
       FROM chat_sessions
       WHERE user_id NOT REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'`
    );

    const invalidCount = invalidSessions.rows.length;

    // 统计无效 user_id 的类型
    const invalidUserIds: Record<string, number> = {};
    invalidSessions.rows.forEach((session) => {
      const userId = session.user_id;
      invalidUserIds[userId] = (invalidUserIds[userId] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      needCleanup: invalidCount > 0,
      invalidCount,
      invalidUserIds,
      sessions: invalidSessions.rows.slice(0, 10), // 最多返回 10 条记录
      message: invalidCount > 0
        ? `发现 ${invalidCount} 条无效 user_id 的会话记录`
        : '无需清理',
    });
  } catch (error: unknown) {
    console.error('[API:Database:Migrate:Cleanup] 检查失败:', error);
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

/**
 * POST /api/database/migrate/cleanup-invalid-userids
 * 执行清理无效 user_id 的操作
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API:Database:Migrate:Cleanup] 开始清理无效 user_id...');

    // 使用事务执行清理
    const result = await dbManager.transaction(async (connection) => {
      // 查找所有无效的 user_id
      const [invalidSessions] = await connection.query(
        `SELECT id, user_id, title
         FROM chat_sessions
         WHERE user_id NOT REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'`
      ) as any[];

      const invalidCount = Array.isArray(invalidSessions) ? invalidSessions.length : 0;

      console.log(`[API:Database:Migrate:Cleanup] 发现 ${invalidCount} 条无效记录`);

      if (invalidCount === 0) {
        return { cleaned: 0, message: '没有需要清理的记录' };
      }

      // 统计无效 user_id 的类型
      const invalidUserIds: Record<string, number> = {};
      invalidSessions.forEach((session: any) => {
        const userId = session.user_id;
        invalidUserIds[userId] = (invalidUserIds[userId] || 0) + 1;
      });

      console.log('[API:Database:Migrate:Cleanup] 无效 user_id 统计:', invalidUserIds);

      // 删除无效的会话记录（级联删除消息）
      const [result] = await connection.query(
        `DELETE FROM chat_sessions
         WHERE user_id NOT REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'`
      ) as any[];

      const affectedRows = result?.affectedRows || 0;

      console.log(`[API:Database:Migrate:Cleanup] 已删除 ${affectedRows} 条会话记录`);

      return {
        cleaned: affectedRows,
        invalidUserIds,
        message: `已清理 ${affectedRows} 条无效 user_id 的会话记录`,
      };
    });

    console.log('[API:Database:Migrate:Cleanup] 清理成功', result);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    console.error('[API:Database:Migrate:Cleanup] 清理失败:', error);
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
