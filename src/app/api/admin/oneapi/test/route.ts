import { NextRequest, NextResponse } from 'next/server';

// POST - 测试OneAPI连接
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { baseUrl, apiKey } = body;

    if (!baseUrl) {
      return NextResponse.json(
        { success: false, message: '请输入 OneAPI 地址' },
        { status: 400 }
      );
    }

    // 构造测试请求
    const testUrl = `${baseUrl.replace(/\/$/, '')}/api/v1/models`;
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(testUrl, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        return NextResponse.json({
          success: true,
          message: '连接成功',
        });
      } else {
        const errorText = await response.text();
        return NextResponse.json({
          success: false,
          message: `连接失败: ${response.status} ${errorText}`,
        });
      }
    } catch (fetchError) {
      console.error('[API:OneAPI:Test] 网络请求失败:', fetchError);
      return NextResponse.json({
        success: false,
        message: '网络连接失败，请检查地址是否正确',
      });
    }
  } catch (error) {
    console.error('[API:OneAPI:Test] 测试连接失败:', error);
    return NextResponse.json(
      { success: false, message: '测试连接失败' },
      { status: 500 }
    );
  }
}
