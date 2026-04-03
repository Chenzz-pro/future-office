import { NextRequest } from 'next/server';

interface EKPProxyRequest {
  action: 'test' | 'login' | 'submit_leave' | 'submit_expense' | 'query_records';
  baseUrl: string;
  username: string;
  password: string;
  apiPrefix: string;
  data?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const body: EKPProxyRequest = await request.json();
    const { action, baseUrl, username, password, apiPrefix, data } = body;

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

    // 测试连接 / 获取用户信息
    if (action === 'test') {
      if (!username || !password) {
        return makeResponse(false, '请输入用户名和密码');
      }

      try {
        // 步骤1: 调用登录接口获取SESSION cookie
        const loginResponse = await fetch(`${baseUrl}/sys/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        });

        // 提取SESSION cookie
        const setCookie = loginResponse.headers.get('set-cookie');
        if (!setCookie || !setCookie.includes('SESSION=')) {
          return makeResponse(false, '登录接口异常：无法获取会话');
        }

        const sessionMatch = setCookie.match(/SESSION=([^;]+)/);
        const sessionId = sessionMatch ? sessionMatch[1] : '';

        // 步骤2: 用SESSION cookie访问用户信息接口验证认证是否成功
        const userResponse = await fetch(`${baseUrl}/sys/user/getUserInfo`, {
          method: 'GET',
          headers: {
            'Cookie': `SESSION=${sessionId}`,
          },
        });

        const userText = await userResponse.text();

        // 如果重定向到匿名页面，说明认证失败
        if (userText.includes('anonym.jsp') || userText.includes('登录') || userText.includes('login')) {
          return makeResponse(false, '认证失败：用户名或密码错误');
        }

        // 如果返回JSON用户信息，说明认证成功
        try {
          const userData = JSON.parse(userText);
          if (userData.userid || userData.loginname || userData.userName) {
            return makeResponse(true, `认证成功！欢迎 ${userData.userName || userData.loginname || '用户'}`, {
              user: userData,
            });
          }
        } catch {
          // JSON解析失败
        }

        // 如果不是JSON也不是HTML，可能是认证成功但接口格式不同
        if (userResponse.ok && !userText.includes('<html')) {
          return makeResponse(true, '认证成功！');
        }

        return makeResponse(false, '认证失败：用户名或密码错误');

      } catch (err) {
        return makeResponse(false, `连接失败：${err instanceof Error ? err.message : '网络错误'}`);
      }
    }

    // 提交请假
    if (action === 'submit_leave') {
      if (!username || !password) {
        return makeResponse(false, '请输入用户名和密码');
      }

      try {
        const loginResponse = await fetch(`${baseUrl}/sys/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        });

        const setCookie = loginResponse.headers.get('set-cookie');
        
        if (!setCookie || !setCookie.includes('SESSION=')) {
          return makeResponse(false, '登录失败：无法获取会话');
        }

        // 提取SESSION
        const sessionMatch = setCookie.match(/SESSION=([^;]+)/);
        const sessionId = sessionMatch ? sessionMatch[1] : '';

        // 提交请假申请
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
      if (!username || !password) {
        return makeResponse(false, '请输入用户名和密码');
      }

      try {
        const loginResponse = await fetch(`${baseUrl}/sys/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        });

        const setCookie = loginResponse.headers.get('set-cookie');
        
        if (!setCookie || !setCookie.includes('SESSION=')) {
          return makeResponse(false, '登录失败：无法获取会话');
        }

        const sessionMatch = setCookie.match(/SESSION=([^;]+)/);
        const sessionId = sessionMatch ? sessionMatch[1] : '';

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
      if (!username || !password) {
        return makeResponse(false, '请输入用户名和密码');
      }

      try {
        const loginResponse = await fetch(`${baseUrl}/sys/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        });

        const setCookie = loginResponse.headers.get('set-cookie');
        
        if (!setCookie || !setCookie.includes('SESSION=')) {
          return makeResponse(false, '登录失败：无法获取会话');
        }

        const sessionMatch = setCookie.match(/SESSION=([^;]+)/);
        const sessionId = sessionMatch ? sessionMatch[1] : '';

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
