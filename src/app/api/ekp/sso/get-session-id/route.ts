/**
 * EKP SSO - 获取 SessionId API
 * 
 * 功能：从本系统单点到 EKP
 * 
 * 流程：
 * 1. 接收 loginName
 * 2. 调用 EKP WebService getLoginSessionId
 * 3. 返回 sessionId 和 SSO 登录 URL
 * 
 * 前端使用：
 * - iframe src = /api/ekp-proxy/sys/authentication/sso/login_auto.jsp?sessionId=xxx&target=encoded_url
 * - 或直接跳转到该 URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLoginSessionId, buildSSOLoginUrl } from '@/lib/ekp/ekp-sso-client';
import { dbManager } from '@/lib/database';

/**
 * POST /api/ekp/sso/get-session-id
 * 获取 EKP SessionId
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '未提供用户ID' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { loginName: providedLoginName, targetUrl } = body;

    let loginName = providedLoginName;

    // 如果没有提供 loginName，从数据库查询
    let userLoginName: string | undefined = undefined;
    if (!loginName) {
      const userResult = await dbManager.query<{
        fd_login_name: string;
        fd_email?: string;
        fd_mobile?: string;
      }>(
        `SELECT fd_login_name, fd_email, fd_mobile FROM sys_org_person WHERE fd_id = ?`,
        [userId]
      );

      if (!userResult.rows || userResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: '用户不存在' },
          { status: 404 }
        );
      }

      const user = userResult.rows[0];
      // 优先使用 login_name，其次 email（去掉域名部分），最后 mobile
      userLoginName = user.fd_login_name 
        || (user.fd_email ? user.fd_email.split('@')[0] : undefined)
        || user.fd_mobile;
      loginName = userLoginName || null;
    }

    if (!loginName) {
      return NextResponse.json(
        { success: false, error: '无法确定 EKP 登录名' },
        { status: 400 }
      );
    }

    // 获取 EKP 配置以获取密码
    let ekpPassword = '';
    try {
      const ekpConfigResult = await dbManager.query<{ password: string }>(
        'SELECT password FROM ekp_configs LIMIT 1'
      );
      if (ekpConfigResult.rows && ekpConfigResult.rows.length > 0) {
        ekpPassword = ekpConfigResult.rows[0].password || '';
      }
    } catch (e) {
      console.warn('[SSO] 获取 EKP 配置密码失败，使用空密码');
    }

    // 调用 EKP WebService 获取 sessionId
    // 注意：实际项目中可能需要用户输入密码，或者使用其他认证方式
    const result = await getLoginSessionId(loginName, ekpPassword);

    if (!result.success || !result.sessionId) {
      console.error('[SSO] 获取 sessionId 失败:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error || '获取 sessionId 失败',
      });
    }

    // 构建 SSO 登录 URL
    // 如果没有提供 targetUrl，默认跳转到 EKP 首页
    const defaultTarget = targetUrl || '/km/review/';
    const ssoLoginUrl = buildSSOLoginUrl(result.sessionId, defaultTarget);

    return NextResponse.json({
      success: true,
      data: {
        sessionId: result.sessionId,
        ssoLoginUrl,
        loginName,
        // 代理路径，前端 iframe 使用
        iframeSrc: `/api/ekp-proxy/sys/authentication/sso/login_auto.jsp?sessionId=${encodeURIComponent(result.sessionId)}&target=${encodeURIComponent(defaultTarget)}`,
      },
    });
  } catch (error) {
    console.error('[SSO] 获取 SessionId API 错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '获取 SessionId 失败' 
      },
      { status: 500 }
    );
  }
}
