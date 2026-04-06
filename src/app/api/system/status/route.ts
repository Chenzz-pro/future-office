/**
 * 系统状态检查 API
 * 用于检查数据库连接、系统初始化状态等
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';

/**
 * GET /api/system/status
 * 获取系统状态
 */
export async function GET(request: NextRequest) {
  try {
    const status: {
      database: {
        connected: boolean;
        message: string;
      };
      initialized: {
        status: boolean;
        message: string;
        adminCount: number;
      };
      version: string;
    } = {
      database: {
        connected: false,
        message: '',
      },
      initialized: {
        status: false,
        message: '',
        adminCount: 0,
      },
      version: '1.0.0',
    };

    // 检查数据库连接
    try {
      const isConnected = await dbManager.isConnected();
      status.database.connected = isConnected;
      status.database.message = isConnected ? '数据库已连接' : '数据库未连接';

      if (isConnected) {
        // 检查管理员账号数量
        try {
          // 先检查 fd_role 字段是否存在
          const columnCheck = await dbManager.query<{ count: number }>(
            'SELECT COUNT(*) as count FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
            ['sys_org_person', 'fd_role']
          );
          const hasRoleField = ((columnCheck.rows[0] as { count: number } | undefined)?.count || 0) > 0;

          let count = 0;
          if (hasRoleField) {
            // 如果有 fd_role 字段，查询 fd_role = 'admin'
            const result = await dbManager.query<{ count: number }>(
              'SELECT COUNT(*) as count FROM sys_org_person WHERE fd_role = ?',
              ['admin']
            );
            count = (result.rows[0]?.count) || 0;
          } else {
            // 如果没有 fd_role 字段，查询 fd_login_name = 'admin'
            const result = await dbManager.query<{ count: number }>(
              'SELECT COUNT(*) as count FROM sys_org_person WHERE fd_login_name = ?',
              ['admin']
            );
            count = (result.rows[0]?.count) || 0;
          }

          status.initialized.adminCount = count;
          status.initialized.status = count > 0;
          status.initialized.message = count > 0 ? '系统已初始化' : '系统未初始化，请创建管理员账号';
        } catch (error) {
          console.error('[API:System:Status] 检查管理员账号失败:', error);
          status.initialized.status = false;
          status.initialized.message = '无法检查系统初始化状态';
        }
      }
    } catch (error) {
      status.database.connected = false;
      status.database.message = '数据库连接失败';
      status.initialized.message = '无法检查系统初始化状态';
    }

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error: unknown) {
    console.error('[API:System:Status] 获取系统状态失败:', error);
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
