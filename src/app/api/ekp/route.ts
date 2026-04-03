import { NextRequest } from 'next/server';

interface EKPProxyRequest {
  action: 'test' | 'submit_leave' | 'submit_expense' | 'query_records';
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

    if (!baseUrl || !username || !password) {
      return new Response(
        JSON.stringify({ error: '缺少必要的配置信息' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 构建Basic Auth头
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    };

    // 根据action构建请求
    let targetUrl = `${baseUrl}${apiPrefix}`;
    let method = 'GET';

    switch (action) {
      case 'test':
        // 测试连接 - 尝试获取用户信息
        targetUrl = `${baseUrl}/sys/user/getUserInfo`;
        break;
      case 'submit_leave':
        method = 'POST';
        targetUrl = `${baseUrl}${apiPrefix}`;
        break;
      case 'submit_expense':
        method = 'POST';
        targetUrl = `${baseUrl}${apiPrefix}`;
        break;
      case 'query_records':
        targetUrl = `${baseUrl}${apiPrefix}`;
        break;
    }

    // 发起请求到EKP
    const response = await fetch(targetUrl, {
      method,
      headers,
      body: method !== 'GET' ? JSON.stringify(data) : undefined,
    });

    // 尝试获取响应内容
    let responseData;
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      responseData = await response.json();
    } else {
      const text = await response.text();
      responseData = { raw: text.substring(0, 1000) };
    }

    // 判断是否成功
    const isSuccess = response.ok || response.status === 401 || response.status === 403;

    return new Response(
      JSON.stringify({
        success: isSuccess,
        status: response.status,
        data: responseData,
        message: isSuccess 
          ? 'EKP服务可达' 
          : `请求失败: ${response.status}`,
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('EKP Proxy error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : '连接失败' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
