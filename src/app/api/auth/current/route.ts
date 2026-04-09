/**
 * 获取当前用户完整信息 API
 * GET /api/auth/current
 * 
 * 从 sys_org_person 表获取用户完整信息，包括部门、角色等
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';
import { isAdminRole, getRoleCode, getRoleName, ROLE_IDS } from '@/lib/constants/roles';

/**
 * GET /api/auth/current
 * 获取当前用户完整信息
 */
export async function GET(request: NextRequest) {
  try {
    // 从请求头获取用户ID
    const userId = request.headers.get('X-User-ID');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '缺少用户ID' },
        { status: 401 }
      );
    }

    // 从 sys_org_person 表查询完整信息
    const result = await dbManager.query(`
      SELECT 
        p.fd_id as id,
        p.fd_login_name as username,
        p.fd_name as personName,
        p.fd_email as email,
        p.fd_mobile as mobile,
        p.fd_rtx_account as rtxAccount,
        p.fd_dept_id as deptId,
        p.fd_role as roleId,
        p.fd_is_login_enabled as isLoginEnabled,
        r.fd_name as roleName,
        r.fd_code as roleCode
      FROM sys_org_person p
      LEFT JOIN sys_role r ON p.fd_role = r.fd_id
      WHERE p.fd_id = ?
    `, [userId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    const person = result.rows[0] as {
      id: string;
      username: string;
      personName: string;
      email: string | null;
      mobile: string | null;
      rtxAccount: string | null;
      deptId: string | null;
      roleId: string | null;
      isLoginEnabled: boolean;
      roleName: string | null;
    };

    // 检查用户是否被禁用
    if (!person.isLoginEnabled) {
      return NextResponse.json(
        { success: false, error: '用户已被禁用' },
        { status: 403 }
      );
    }

    const roleId = person.roleId || ROLE_IDS.USER;
    const isAdmin = isAdminRole(roleId);

    console.log('[API:Auth:Current] 获取用户信息成功:', {
      userId: person.id,
      username: person.username,
      deptId: person.deptId,
      roleId,
    });

    return NextResponse.json({
      success: true,
      data: {
        userId: person.id,
        username: person.username,
        personName: person.personName,
        email: person.email,
        mobile: person.mobile,
        rtxAccount: person.rtxAccount,
        deptId: person.deptId,
        role: {
          id: roleId,
          code: getRoleCode(roleId),
          name: person.roleName || getRoleName(roleId),
          isAdmin,
        },
      },
    });
  } catch (error) {
    console.error('[API:Auth:Current] 获取用户信息失败:', error);
    return NextResponse.json(
      { success: false, error: '获取用户信息失败' },
      { status: 500 }
    );
  }
}
