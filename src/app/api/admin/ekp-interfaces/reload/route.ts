import { NextRequest, NextResponse } from 'next/server';
import { ekpInterfaceRegistry } from '@/lib/ekp-interface-registry';

// POST /api/admin/ekp-interfaces/reload - 重载二开接口配置
export async function POST(request: NextRequest) {
  try {
    // 重载二开接口配置
    ekpInterfaceRegistry.reloadCustom();

    // 获取更新后的接口列表
    const customInterfaces = await ekpInterfaceRegistry.getBySource('custom');

    return NextResponse.json({
      success: true,
      message: '二开接口配置已重新加载',
      data: customInterfaces,
    });
  } catch (error) {
    console.error('重载配置失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
