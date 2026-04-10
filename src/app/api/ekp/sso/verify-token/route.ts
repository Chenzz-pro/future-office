/**
 * EKP SSO - 验证 Token API
 * 
 * 功能：从 EKP 单点到本系统
 * 
 * 流程：
 * 1. 从 Cookie 获取 token (LtpaToken 或 LRToken)
 * 2. 调用 EKP WebService getTokenLoginName
 * 3. 返回登录名
 * 
 * 前端使用：
 * - 调用此 API 验证 token
 * - 如果成功，使用返回的 loginName 自动登录本系统
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTokenLoginName } from '@/lib/ekp/ekp-sso-client';
import { dbManager } from '@/lib/database';

/**
 * POST /api/ekp/sso/verify-token
 * 验证 EKP SSO Token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token 不能为空' },
        { status: 400 }
      );
    }

    // 调用 EKP WebService 解析 token
    const result = await getTokenLoginName(token);

    if (!result.result || !result.loginName) {
      console.error('[SSO] 解析 token 失败:', result.errorMsg);
      return NextResponse.json({
        success: false,
        error: result.errorMsg || 'Token 验证失败',
      });
    }

    const loginName = result.loginName;

    // 查询本系统用户
    const userResult = await dbManager.query<{
      fd_id: string;
      fd_login_name: string;
      fd_name: string;
      fd_email?: string;
      fd_mobile?: string;
    }>(
      `SELECT fd_id, fd_login_name, fd_name, fd_email, fd_mobile 
       FROM sys_org_person 
       WHERE fd_login_name = ? 
          OR fd_email = ? 
          OR fd_mobile = ?
       LIMIT 1`,
      [loginName, loginName, loginName]
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      // 用户不存在，但 SSO 验证成功
      return NextResponse.json({
        success: true,
        data: {
          verified: true,
          loginName,
          userExists: false,
          message: 'EKP SSO 验证成功，但本系统没有对应用户',
        },
      });
    }

    const user = userResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        verified: true,
        loginName,
        userExists: true,
        user: {
          userId: user.fd_id,
          loginName: user.fd_login_name,
          name: user.fd_name,
          email: user.fd_email,
          mobile: user.fd_mobile,
        },
      },
    });
  } catch (error) {
    console.error('[SSO] 验证 Token API 错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Token 验证失败' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ekp/sso/verify-token
 * 从 Cookie 获取 Token 并验证
 * 
 * 此接口从 Cookie 中获取 LtpaToken/LRToken 并验证
 */
export async function GET(request: NextRequest) {
  try {
    // 从 Cookie 获取 token
    const cookies = request.cookies;
    const token = cookies.get('LtpaToken')?.value 
      || cookies.get('LRToken')?.value
      || cookies.get('lrToken')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: '未找到 SSO Token' },
        { status: 400 }
      );
    }

    // 调用 EKP WebService 解析 token
    const result = await getTokenLoginName(token);

    if (!result.result || !result.loginName) {
      return NextResponse.json({
        success: false,
        error: result.errorMsg || 'Token 验证失败',
      });
    }

    const loginName = result.loginName;

    // 查询本系统用户
    const userResult = await dbManager.query<{
      fd_id: string;
      fd_login_name: string;
      fd_name: string;
      fd_email?: string;
      fd_mobile?: string;
    }>(
      `SELECT fd_id, fd_login_name, fd_name, fd_email, fd_mobile 
       FROM sys_org_person 
       WHERE fd_login_name = ? 
          OR fd_email = ? 
          OR fd_mobile = ?
       LIMIT 1`,
      [loginName, loginName, loginName]
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          verified: true,
          loginName,
          userExists: false,
          message: 'EKP SSO 验证成功，但本系统没有对应用户',
        },
      });
    }

    const user = userResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        verified: true,
        loginName,
        userExists: true,
        user: {
          userId: user.fd_id,
          loginName: user.fd_login_name,
          name: user.fd_name,
          email: user.fd_email,
          mobile: user.fd_mobile,
        },
      },
    });
  } catch (error) {
    console.error('[SSO] GET 验证 Token API 错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Token 验证失败' 
      },
      { status: 500 }
    );
  }
}
