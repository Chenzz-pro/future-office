import { NextRequest } from 'next/server';

interface EKPProxyRequest {
  action: 'test' | 'login' | 'submit_leave' | 'submit_expense' | 'query_records';
  baseUrl: string;
  username?: string;
  password?: string;
  sessionCookie?: string;  // 支持直接传入 SESSION cookie
  apiPrefix: string;
  data?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const body: EKPProxyRequest = await request.json();
    const { action, baseUrl, username, password, sessionCookie, apiPrefix, data } = body;

    if (!baseUrl) {
      return new Response(
        JSON.stringify({ error: '缺少 EKP 系统地址' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 统一的响应格式
    const makeResponse = (success: boolean, message: string, extra: Record<string, unknown> = {}) => {
      return new Response(
        JSON.stringify({ success, message, ...extra }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    // 获取 SESSION cookie（优先使用传入的 cookie，否则尝试登录获取）
    const getSessionCookie = async (): Promise<{ success: boolean; session?: string; message?: string }> => {
      // 如果直接传入了 sessionCookie，直接使用
      if (sessionCookie) {
        return { success: true, session: sessionCookie };
      }

      // 否则尝试用用户名密码登录
      if (!username || !password) {
        return { success: false, message: '请提供 SESSION Cookie 或用户名密码' };
      }

      // 尝试蓝凌EKP的登录接口（加密版本需要在前端完成）
      // 由于蓝凌EKP使用DES加密，这里只能尝试明文登录（大多数系统不支持）
      try {
        const loginResponse = await fetch(`${baseUrl}/sys/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        });

        const setCookie = loginResponse.headers.get('set-cookie');
        if (setCookie && setCookie.includes('SESSION=')) {
          const sessionMatch = setCookie.match(/SESSION=([^;]+)/);
          if (sessionMatch) {
            return { success: true, session: sessionMatch[1] };
          }
        }

        return { success: false, message: '登录失败：无法获取会话，请使用 SESSION Cookie 方式' };
      } catch (err) {
        return { success: false, message: `登录失败：${err instanceof Error ? err.message : '网络错误'}` };
      }
    };

    // 测试连接 / 获取用户信息
    if (action === 'test') {
      const sessionResult = await getSessionCookie();
      if (!sessionResult.success || !sessionResult.session) {
        return makeResponse(false, sessionResult.message || '获取会话失败');
      }

      const sessionId = sessionResult.session;

      try {
        // 尝试多个用户信息接口
        const userEndpoints = [
          '/sys/user/getUserInfo',
          '/api/sys/user/getUserInfo',
          '/sys/portal/sysPortalPortlet/getUserInfo.jsp',
          '/sys/person/getMyInfo',
        ];

        let userData = null;
        let lastText = '';

        for (const endpoint of userEndpoints) {
          const userResponse = await fetch(`${baseUrl}${endpoint}`, {
            method: 'GET',
            headers: {
              'Cookie': `SESSION=${sessionId}`,
            },
          });

          const userText = await userResponse.text();
          lastText = userText;

          // 如果重定向到匿名页面，说明认证失败
          if (userText.includes('anonym.jsp') || userText.includes('登录') || userText.includes('login.jsp')) {
            continue;
          }

          // 尝试解析JSON
          try {
            const parsed = JSON.parse(userText);
            if (parsed.userid || parsed.loginname || parsed.userName || parsed.fdName || parsed.fdLoginName) {
              userData = parsed;
              break;
            }
          } catch {
            // 不是JSON，检查是否包含用户信息
            if (userText.includes('fdName') || userText.includes('fdLoginName')) {
              // 可能是JSONP或其他格式
              userData = { raw: userText.substring(0, 500) };
              break;
            }
          }
        }

        if (userData) {
          const displayName = userData.fdName || userData.userName || userData.loginname || userData.fdLoginName || '用户';
          return makeResponse(true, `认证成功！欢迎 ${displayName}`, {
            user: userData,
            sessionCookie: sessionId,
          });
        }

        // 如果所有接口都失败，检查最后响应
        if (lastText && lastText.includes('anonym.jsp')) {
          return makeResponse(false, 'SESSION Cookie 无效或已过期，请重新获取');
        }

        return makeResponse(false, '无法获取用户信息，SESSION Cookie 可能无效');

      } catch (err) {
        return makeResponse(false, `连接失败：${err instanceof Error ? err.message : '网络错误'}`);
      }
    }

    // 提交请假
    if (action === 'submit_leave') {
      const sessionResult = await getSessionCookie();
      if (!sessionResult.success || !sessionResult.session) {
        return makeResponse(false, sessionResult.message || '获取会话失败');
      }

      const sessionId = sessionResult.session;

      try {
        const submitResponse = await fetch(`${baseUrl}${apiPrefix}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `SESSION=${sessionId}`,
          },
          body: JSON.stringify(data),
        });

        const result = await submitResponse.json();
        
        if (submitResponse.ok && result) {
          return makeResponse(true, '请假申请提交成功', { data: result });
        } else {
          return makeResponse(false, result.message || '提交失败');
        }

      } catch (err) {
        return makeResponse(false, `提交失败：${err instanceof Error ? err.message : '网络错误'}`);
      }
    }

    // 提交报销
    if (action === 'submit_expense') {
      const sessionResult = await getSessionCookie();
      if (!sessionResult.success || !sessionResult.session) {
        return makeResponse(false, sessionResult.message || '获取会话失败');
      }

      const sessionId = sessionResult.session;

      try {
        const submitResponse = await fetch(`${baseUrl}${apiPrefix}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `SESSION=${sessionId}`,
          },
          body: JSON.stringify(data),
        });

        const result = await submitResponse.json();
        
        if (submitResponse.ok && result) {
          return makeResponse(true, '报销申请提交成功', { data: result });
        } else {
          return makeResponse(false, result.message || '提交失败');
        }

      } catch (err) {
        return makeResponse(false, `提交失败：${err instanceof Error ? err.message : '网络错误'}`);
      }
    }

    // 查询记录
    if (action === 'query_records') {
      const sessionResult = await getSessionCookie();
      if (!sessionResult.success || !sessionResult.session) {
        return makeResponse(false, sessionResult.message || '获取会话失败');
      }

      const sessionId = sessionResult.session;

      try {
        const queryResponse = await fetch(`${baseUrl}${apiPrefix}`, {
          method: 'GET',
          headers: {
            'Cookie': `SESSION=${sessionId}`,
          },
        });

        const result = await queryResponse.json();
        
        if (queryResponse.ok && result) {
          return makeResponse(true, '查询成功', { data: result });
        } else {
          return makeResponse(false, result.message || '查询失败');
        }

      } catch (err) {
        return makeResponse(false, `查询失败：${err instanceof Error ? err.message : '网络错误'}`);
      }
    }

    return makeResponse(false, '未知操作');

  } catch (error) {
    console.error('EKP Proxy error:', error);
    return new Response(
      JSON.stringify({ success: false, message: '服务器错误' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
