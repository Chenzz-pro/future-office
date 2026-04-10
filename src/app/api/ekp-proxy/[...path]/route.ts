/**
 * EKP 代理 API
 * 用于 iframe 嵌入 EKP 表单，支持跨域访问和自动认证
 */

import { NextRequest, NextResponse } from 'next/server';
import { ekpConfigManager } from '@/lib/ekp/ekp-config-manager';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  // 检查代理是否启用
  const config = ekpConfigManager.getConfig();
  if (!config.proxyEnabled) {
    return NextResponse.json(
      { error: 'EKP 代理未启用' },
      { status: 403 }
    );
  }

  const baseUrl = config.baseUrl;
  if (!baseUrl) {
    return NextResponse.json(
      { error: 'EKP 未配置' },
      { status: 500 }
    );
  }

  // 构造目标 URL
  const targetPath = pathSegments.join('/');
  let targetUrl: URL;

  try {
    targetUrl = new URL(`${baseUrl}/${targetPath}`);
  } catch (e) {
    return NextResponse.json(
      { error: '无效的目标 URL' },
      { status: 400 }
    );
  }

  // 保留原始查询参数
  const searchParams = request.nextUrl.searchParams;
  searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  try {
    // 获取请求体
    let body: string | undefined;
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      body = await request.text();
    }

    // 构建代理请求
    const headers: Record<string, string> = {
      'Content-Type': request.headers.get('Content-Type') || 'application/x-www-form-urlencoded',
      'Accept': request.headers.get('Accept') || '*/*',
    };

    // 添加来源标记
    headers['X-Proxy-From'] = 'ekp-proxy';
    headers['X-Proxy-Path'] = `/${targetPath}`;

    // 构造代理请求
    const proxyResponse = await fetch(targetUrl.toString(), {
      method: request.method,
      headers,
      body,
      redirect: 'manual', // 不自动跟随重定向
    });

    // 处理重定向
    if ([301, 302, 303, 307, 308].includes(proxyResponse.status)) {
      const location = proxyResponse.headers.get('Location');
      if (location) {
        // 将 EKP 重定向转换为代理重定向
        let redirectUrl: string;
        if (location.startsWith('http://') || location.startsWith('https://')) {
          // 绝对 URL，转换为代理路径
          try {
            const locUrl = new URL(location);
            const proxyPath = config.proxyPath || '/api/ekp-proxy';
            redirectUrl = `/api/ekp-proxy/${locUrl.pathname.replace(/^\//, '')}`;
            if (locUrl.search) {
              redirectUrl += locUrl.search;
            }
          } catch (e) {
            redirectUrl = location;
          }
        } else {
          // 相对路径
          redirectUrl = `/api/ekp-proxy/${location.replace(/^\//, '')}`;
        }

        return new NextResponse(null, {
          status: proxyResponse.status,
          headers: {
            'Location': redirectUrl,
            'X-Proxy-Redirect': 'true',
          },
        });
      }
    }

    // 返回代理响应
    const responseBody = await proxyResponse.text();
    const contentType = proxyResponse.headers.get('Content-Type') || '';

    // 如果是 HTML 内容，修改其中的链接
    let processedBody = responseBody;
    if (contentType.includes('text/html')) {
      processedBody = processHtmlContent(responseBody, baseUrl, config.proxyPath || '/api/ekp-proxy');
    }

    return new NextResponse(processedBody, {
      status: proxyResponse.status,
      headers: {
        'Content-Type': contentType,
        'X-Proxy-Target': targetUrl.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('EKP 代理请求失败:', error);
    return NextResponse.json(
      { error: '代理请求失败', details: String(error) },
      { status: 502 }
    );
  }
}

/**
 * 处理 HTML 内容中的链接
 * 将 EKP 链接转换为代理链接
 */
function processHtmlContent(html: string, baseUrl: string, proxyPath: string): string {
  const proxyBase = proxyPath.replace(/\/$/, '');
  
  // 处理 href 属性
  html = html.replace(/href=["'](https?:\/\/[^"']*)?(\/[^"']+)["']/gi, (match, protocol, path) => {
    if (protocol) {
      // 外部链接，保持不变
      return match;
    }
    // 内部链接，转换为代理链接
    return `href="${proxyBase}${path}"`;
  });

  // 处理 src 属性
  html = html.replace(/src=["'](https?:\/\/[^"']*)?(\/[^"']+)["']/gi, (match, protocol, path) => {
    if (protocol) {
      return match;
    }
    return `src="${proxyBase}${path}"`;
  });

  // 处理 action 属性
  html = html.replace(/action=["'](https?:\/\/[^"']*)?(\/[^"']+)["']/gi, (match, protocol, path) => {
    if (protocol) {
      return match;
    }
    return `action="${proxyBase}${path}"`;
  });

  // 添加 base 标签以确保相对链接正确
  if (!html.includes('<base')) {
    html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${baseUrl}/">`);
  }

  return html;
}
