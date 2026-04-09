/**
 * 流程映射管理 API
 * /api/admin/flow-mappings
 * 
 * CRUD 操作流程映射配置
 */

import { NextRequest, NextResponse } from 'next/server';
import { flowMappingService } from '@/lib/ekp/services';

// ============================================
// GET - 获取流程映射列表
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || undefined;
    const enabled = searchParams.get('enabled');
    const isSystem = searchParams.get('isSystem');

    const mappings = await flowMappingService.getAll({
      keyword,
      enabled: enabled === 'true' ? true : enabled === 'false' ? false : undefined,
      isSystem: isSystem === 'true' ? true : isSystem === 'false' ? false : undefined,
    });

    // 获取业务类型列表（用于下拉选择）
    const businessTypes = await flowMappingService.getBusinessTypes();

    return NextResponse.json({
      success: true,
      data: {
        mappings,
        businessTypes,
      },
    });
  } catch (error) {
    console.error('[API:flow-mappings:GET] 获取映射列表失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '获取列表失败',
    }, { status: 500 });
  }
}

// ============================================
// POST - 创建/初始化流程映射
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    // 初始化默认映射
    if (action === 'init') {
      await flowMappingService.initDefaultMappings();
      return NextResponse.json({
        success: true,
        message: '默认映射初始化成功',
      });
    }

    // 创建新映射
    const id = await flowMappingService.create(params);

    return NextResponse.json({
      success: true,
      data: { id },
      message: '创建成功',
    }, { status: 201 });
  } catch (error) {
    console.error('[API:flow-mappings:POST] 创建失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '创建失败',
    }, { status: 500 });
  }
}

// ============================================
// PUT - 批量更新
// ============================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...params } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: '缺少映射ID',
      }, { status: 400 });
    }

    const success = await flowMappingService.update(id, params);

    return NextResponse.json({
      success,
      message: success ? '更新成功' : '更新失败',
    });
  } catch (error) {
    console.error('[API:flow-mappings:PUT] 更新失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '更新失败',
    }, { status: 500 });
  }
}

// ============================================
// DELETE - 删除映射
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        error: '缺少映射ID',
      }, { status: 400 });
    }

    const success = await flowMappingService.delete(id);

    return NextResponse.json({
      success,
      message: success ? '删除成功' : '删除失败（系统预置或不存在）',
    });
  } catch (error) {
    console.error('[API:flow-mappings:DELETE] 删除失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '删除失败',
    }, { status: 500 });
  }
}
