import { NextRequest, NextResponse } from 'next/server';
import { ekpInterfaceRegistry } from '@/lib/ekp-interface-registry';

// GET /api/admin/ekp-interfaces/[id] - 获取接口详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 尝试获取接口
    const interfaceConfig = await ekpInterfaceRegistry.get(id);

    if (!interfaceConfig) {
      return NextResponse.json(
        { success: false, error: '接口不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: interfaceConfig,
    });
  } catch (error) {
    console.error('获取接口详情失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/ekp-interfaces/[id] - 更新接口
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 判断是官方接口还是二开接口
    const allInterfaces = await ekpInterfaceRegistry.getAll();
    const targetInterface = allInterfaces.find(item => item.id === id || item.code === id);

    if (!targetInterface) {
      return NextResponse.json(
        { success: false, error: '接口不存在' },
        { status: 404 }
      );
    }

    if (targetInterface.source === 'official') {
      // 更新官方接口
      const metadata: any = {
        serviceId: body.serviceId,
        requestTemplate: body.request,
        responseParser: body.response,
        version: body.version,
      };
      const success = await ekpInterfaceRegistry.updateOfficial(id, {
        code: body.code,
        name: body.name,
        description: body.description,
        category: body.category,
        endpoint: body.path,
        method: body.method,
        enabled: body.enabled,
        metadata,
      });

      return NextResponse.json({ success: true });
    } else {
      // 更新二开接口
      const success = ekpInterfaceRegistry.updateCustom(targetInterface.code, {
        name: body.name,
        category: body.category,
        path: body.path,
        serviceId: body.serviceId,
        method: body.method,
        enabled: body.enabled,
        request: body.request,
        response: body.response,
        description: body.description,
        version: body.version,
      });

      if (success) {
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json(
          { success: false, error: '更新失败' },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('更新接口失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/ekp-interfaces/[id] - 删除接口
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 判断是官方接口还是二开接口
    const allInterfaces = await ekpInterfaceRegistry.getAll();
    const targetInterface = allInterfaces.find(item => item.id === id || item.code === id);

    if (!targetInterface) {
      return NextResponse.json(
        { success: false, error: '接口不存在' },
        { status: 404 }
      );
    }

    // 检查是否系统内置接口
    if (targetInterface.isSystem) {
      return NextResponse.json(
        { success: false, error: '系统内置接口不能删除' },
        { status: 400 }
      );
    }

    if (targetInterface.source === 'official') {
      // 删除官方接口
      await ekpInterfaceRegistry.deleteOfficial(id);
      return NextResponse.json({ success: true });
    } else {
      // 删除二开接口
      const success = ekpInterfaceRegistry.deleteCustom(targetInterface.code);

      if (success) {
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json(
          { success: false, error: '删除失败' },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('删除接口失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
