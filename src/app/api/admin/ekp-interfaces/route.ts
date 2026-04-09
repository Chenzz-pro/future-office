import { NextRequest, NextResponse } from 'next/server';
import { ekpInterfaceRegistry } from '@/lib/ekp-interface-registry';

// GET /api/admin/ekp-interfaces - 获取接口列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // official | custom | all
    const category = searchParams.get('category');
    const keyword = searchParams.get('keyword');
    const enabled = searchParams.get('enabled'); // true | false | all

    let interfaces: any[] = [];

    // 按类型筛选
    if (type === 'official') {
      interfaces = await ekpInterfaceRegistry.getBySource('official');
    } else if (type === 'custom') {
      interfaces = await ekpInterfaceRegistry.getBySource('custom');
    } else {
      // 获取所有接口
      if (enabled === 'true') {
        interfaces = await ekpInterfaceRegistry.getAllEnabled();
      } else if (enabled === 'false') {
        const all = await ekpInterfaceRegistry.getAll();
        interfaces = all.filter(i => !i.enabled);
      } else {
        interfaces = await ekpInterfaceRegistry.getAll();
      }
    }

    // 分类筛选
    if (category) {
      interfaces = interfaces.filter(item => item.category === category);
    }

    // 关键词搜索
    if (keyword) {
      interfaces = interfaces.filter(item =>
        item.code.toLowerCase().includes(keyword.toLowerCase()) ||
        item.name.toLowerCase().includes(keyword.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(keyword.toLowerCase()))
      );
    }

    // 获取统计信息
    const stats = await ekpInterfaceRegistry.getStats();

    // 获取分类列表
    const categories = await ekpInterfaceRegistry.getCategories();

    return NextResponse.json({
      success: true,
      data: interfaces,
      stats,
      categories,
    });
  } catch (error) {
    console.error('获取接口列表失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

// POST /api/admin/ekp-interfaces - 创建接口
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source, ...interfaceData } = body;

    if (!source) {
      return NextResponse.json(
        { success: false, error: '缺少参数 source' },
        { status: 400 }
      );
    }

    if (source === 'official') {
      // 创建官方接口
      const metadata: any = {
        serviceId: interfaceData.serviceId,
        requestTemplate: interfaceData.request,
        responseParser: interfaceData.response,
        version: interfaceData.version || '1.0',
        isSystem: false,
      };
      const id = await ekpInterfaceRegistry.createOfficial({
        code: interfaceData.code,
        name: interfaceData.name,
        description: interfaceData.description,
        category: interfaceData.category,
        endpoint: interfaceData.path,
        method: interfaceData.method,
        enabled: interfaceData.enabled !== false,
        metadata,
      });

      return NextResponse.json({
        success: true,
        data: { id },
      });
    } else if (source === 'custom') {
      // 创建二开接口
      const success = ekpInterfaceRegistry.createCustom({
        code: interfaceData.code,
        name: interfaceData.name,
        category: interfaceData.category,
        path: interfaceData.path,
        serviceId: interfaceData.serviceId,
        method: interfaceData.method,
        enabled: interfaceData.enabled !== false,
        request: interfaceData.request,
        response: interfaceData.response,
        description: interfaceData.description,
        version: interfaceData.version || '1.0',
      });

      if (success) {
        return NextResponse.json({
          success: true,
          data: { code: interfaceData.code },
        });
      } else {
        return NextResponse.json(
          { success: false, error: '创建失败' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: '无效的 source 参数' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('创建接口失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
