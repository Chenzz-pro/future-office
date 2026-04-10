/**
 * 流程发起 API
 * POST /api/ekp/flow/launch
 * 
 * 根据业务类型发起流程
 */

import { NextRequest, NextResponse } from 'next/server';
import { flowService, flowMappingService } from '@/lib/ekp/services';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-ID');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: '缺少用户ID',
      }, { status: 400 });
    }

    const body = await request.json();
    const { businessType, formValues, draft = false } = body;

    if (!businessType) {
      return NextResponse.json({
        success: false,
        error: '缺少业务类型',
      }, { status: 400 });
    }

    if (!formValues || Object.keys(formValues).length === 0) {
      return NextResponse.json({
        success: false,
        error: '表单数据不能为空',
      }, { status: 400 });
    }

    console.log('[API:flow/launch] 发起流程:', {
      userId,
      businessType,
      formValues,
      draft,
    });

    // 通过业务类型发起流程
    const result = await flowService.launchByType(userId, businessType, formValues);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          message: result.message,
          instanceId: result.instanceId,
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.message,
      }, { status: 400 });
    }
  } catch (error) {
    console.error('[API:flow/launch] 发起流程失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '发起流程失败',
    }, { status: 500 });
  }
}

/**
 * 获取可用的流程模板列表
 * GET /api/ekp/flow/launch
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || undefined;
    const category = searchParams.get('category') || undefined;

    // 获取流程模板
    const templates = await flowService.getTemplates({ keyword, category });

    // 获取业务类型映射
    const businessTypes = await flowMappingService.getBusinessTypes();

    return NextResponse.json({
      success: true,
      data: {
        templates,
        businessTypes,
      },
    });
  } catch (error) {
    console.error('[API:flow/launch:GET] 获取模板列表失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '获取模板列表失败',
    }, { status: 500 });
  }
}
