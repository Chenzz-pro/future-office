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
        // 方式1: 尝试Basic Auth
        const auth = Buffer.from(`${username}:${password}`).toString('base64');
        
        // 先尝试登录获取cookie
        const loginResponse = await fetch(`${baseUrl}/sys/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        });

        // 检查是否返回了SESSION cookie
        const setCookie = loginResponse.headers.get('set-cookie');
        const location = loginResponse.headers.get('location');
        
        // 如果有重定向，检查是否指向登录页
        if (location && (location.includes('login') || location.includes('anonym'))) {
          // 尝试方式2: 直接Basic Auth获取用户信息
          const userResponse = await fetch(`${baseUrl}/sys/user/getUserInfo`, {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${auth}`,
            },
          });

          const text = await userResponse.text();
          
          // 检查是否返回HTML登录页
          if (text.includes('<html') || text.includes('login') || text.includes('登录')) {
            return makeResponse(false, '认证失败：用户名或密码错误');
          }

          // 尝试解析为JSON
          try {
            const userData = JSON.parse(text);
            if (userData.userid || userData.loginname) {
              return makeResponse(true, '认证成功！Basic Auth 连接正常', { 
                user: userData,
                authType: 'basic'
              });
            }
          } catch {
            // JSON解析失败，继续检查
          }
        }

        // 方式3: 检查SESSION cookie是否获取成功
        if (setCookie && setCookie.includes('SESSION=')) {
          return makeResponse(true, '登录成功！Cookie认证连接正常', { 
            authType: 'cookie',
            sessionCookie: setCookie
          });
        }

        // 如果是200 OK，尝试获取响应内容
        if (loginResponse.ok) {
          const text = await loginResponse.text();
          
          // 检查是否是JSON响应
          if (text.startsWith('{') || text.startsWith('[')) {
            return makeResponse(true, '认证成功！', { 
              data: JSON.parse(text),
              authType: 'form'
            });
          }
          
          // 如果返回HTML，检查是否包含错误信息
          if (text.includes('密码错误') || text.includes('用户名错误') || text.includes('登录失败')) {
            return makeResponse(false, '认证失败：用户名或密码错误');
          }
        }

        return makeResponse(false, `认证方式不支持或配置错误 (HTTP ${loginResponse.status})`);

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
