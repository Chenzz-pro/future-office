import { NextRequest, NextResponse } from 'next/server';
import { logger, generateRequestId } from '@/lib/utils/logger';
import { BusinessErrors } from '@/lib/utils/error-handler';

/**
 * 同步OA数据接口
 * 技能代码: sync_oa_data
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    logger.info({
      module: 'approval',
      action: 'sync_data',
      requestId,
      message: '同步OA数据请求',
      data: { path: '/api/approval/data/sync' },
    });

    // 解析请求参数
    const body = await request.json();
    const { requestId: approvalRequestId, approval_type } = body;

    // 参数校验
    if (!approvalRequestId || !approval_type) {
      throw BusinessErrors.invalidParams({
        missing: ['requestId', 'approval_type'],
      });
    }

    // TODO: 同步 EKP 数据（考勤/费用/库存）
    // 这里需要调用 EKP 数据同步接口
    // 示例：const syncResult = await ekpClient.syncData(approvalRequestId, approval_type);

    // 模拟返回数据
    const syncResult = {
      requestId: approvalRequestId,
      syncStatus: 'done',
      syncedItems: {
        attendance: approval_type === 'leave',
        expense: approval_type === 'reimbursement',
        inventory: approval_type === 'purchase',
      },
      syncedAt: new Date().toISOString(),
    };

    logger.info({
      module: 'approval',
      action: 'sync_data_success',
      requestId,
      message: 'OA数据同步成功',
      data: { requestId: approvalRequestId, syncStatus: syncResult.syncStatus },
    });

    return NextResponse.json({
      success: true,
      data: syncResult,
    });
  } catch (error: any) {
    logger.error({
      module: 'approval',
      action: 'sync_data_error',
      requestId,
      message: '同步OA数据失败',
      error: {
        type: error.name,
        message: error.message,
        stack: error.stack,
      },
    });
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
