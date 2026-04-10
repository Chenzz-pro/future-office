/**
 * EKP 反向代理 API
 * 
 * 通过服务端代理访问 EKP，自动注入用户认证 Cookie
 * 解决 iframe 跨域 Cookie 问题
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEKPSession, convertCookieDomain } from '@/lib/ekp/cookie-bridge';

// EKP 基础 URL
const EKP_BASE_URL = process.env.EKP_BASE_URL || 'https://oa.fjhxrl.com';

/**
 * 获取代理的路径
 */
function getPath(params: { path: string[] }): string {
  return params.path.join('/');
}

/**
 * 执行代理请求
 */
async function proxyRequest(
  request: NextRequest,
  path: string,
  userId: string | null
): Promise<NextResponse> {
  try {
    // 构建目标 URL
    const targetUrl = `${EKP_BASE_URL}/${path}${request.nextUrl.search}`;
    
    // 获取用户 EKP Session
    let ekpCookie = '';
    if (userId) {
      const session = await getEKPSession(userId);
      if (session?.ekpCookie) {
        ekpCookie = session.ekpCookie;
      }
    }
    
    // 准备请求头
    const headers = new Headers();
    headers.set('Host', 'oa.fjhxrl.com');
    headers.set('X-Real-IP', request.headers.get('x-forwarded-for') || '127.0.0.1');
    headers.set('X-Forwarded-For', request.headers.get('x-forwarded-for') || '');
    headers.set('X-Forwarded-Proto', 'https');
    headers.set('User-Agent', request.headers.get('user-agent') || '');
    headers.set('Accept', request.headers.get('accept') || '*/*');
    headers.set('Accept-Language', request.headers.get('accept-language') || 'zh-CN,zh;q=0.9');
    
    // 添加 EKP Cookie
    if (ekpCookie) {
      headers.set('Cookie', ekpCookie);
    }
    
    // 获取请求体
    let body: BodyInit | undefined;
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      body = await request.text();
      
      // 设置 Content-Type
      const contentType = request.headers.get('content-type');
      if (contentType) {
        headers.set('Content-Type', contentType);
      }
    }
    
    // 发送代理请求
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      redirect: 'manual',
      credentials: 'include',
    });
    
    // 处理响应
    const responseHeaders = new Headers();
    
    // 复制响应头（除了 Set-Cookie）
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'set-cookie' && key.toLowerCase() !== 'transfer-encoding') {
        responseHeaders.set(key, value);
      }
    });
    
    // 处理 Set-Cookie，转换域名
    const setCookies = response.headers.getSetCookie?.() || [];
    if (setCookies.length > 0) {
      const targetDomain = request.nextUrl.hostname;
      const convertedCookies = setCookies.map(cookie => 
        convertCookieDomain(cookie, targetDomain)
      );
      responseHeaders.set('Set-Cookie', convertedCookies.join(', '));
    }
    
    // 获取响应内容
    const contentType = response.headers.get('content-type') || '';
    let data: string | object;
    
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    // 处理重定向
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) {
        // 如果是 EKP 的重定向，转换为代理路径
        if (location.startsWith('https://oa.fjhxrl.com') || location.startsWith('http://oa.fjhxrl.com')) {
          const newPath = location
            .replace('https://oa.fjhxrl.com', '')
            .replace('http://oa.fjhxrl.com', '');
          // 清理路径开头的斜杠并转换重定向路径
          const cleanPath = newPath.replace(/^\/+/, '');
          return NextResponse.redirect(
            new URL(`/api/ekp-proxy/${cleanPath}`, request.url),
            response.status
          );
        }
        // 其他重定向直接返回
        return new NextResponse(null, {
          status: response.status,
          headers: {
            Location: location,
          },
        });
      }
    }
    
    // 返回响应
    if (typeof data === 'object') {
      return NextResponse.json(data, {
        status: response.status,
        headers: responseHeaders,
      });
    }
    
    return new NextResponse(data, {
      status: response.status,
      headers: responseHeaders,
    });
    
  } catch (error) {
    console.error('EKP 代理请求失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '代理请求失败',
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 502 }
    );
  }
}

/**
 * GET 请求代理
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const userId = request.headers.get('x-user-id');
  
  return proxyRequest(request, path.join('/'), userId);
}

/**
 * POST 请求代理
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const userId = request.headers.get('x-user-id');
  
  return proxyRequest(request, path.join('/'), userId);
}

/**
 * PUT 请求代理
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const userId = request.headers.get('x-user-id');
  
  return proxyRequest(request, path.join('/'), userId);
}

/**
 * DELETE 请求代理
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const userId = request.headers.get('x-user-id');
  
  return proxyRequest(request, path.join('/'), userId);
}
