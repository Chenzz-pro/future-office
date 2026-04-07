import { NextRequest, NextResponse } from 'next/server';
import { logger, generateRequestId } from '@/lib/utils/logger';
import { BusinessErrors } from '@/lib/utils/error-handler';

/**
 * 发送超时催办接口
 * 技能代码: send_approval_reminder
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    logger.info({
      module: 'approval',
      action: 'send_reminder',
      requestId,
      message: '发送超时催办请求',
      data: { path: '/api/approval/reminder/send' },
    });

    // 解析请求参数
    const body = await request.json();
    const { nodes, userId } = body;

    // 参数校验
    if (!nodes || !userId) {
      throw BusinessErrors.invalidParams({
        missing: ['nodes', 'userId'],
      });
    }

    // TODO: 发送消息提醒（钉钉/企业微信/邮件）
    // 这里需要调用消息发送接口
    // 示例：await messageService.sendReminder(nodes, userId);

    // 模拟返回数据
    const result = {
      success: true,
      message: '已发送催办提醒',
      sentCount: nodes.length,
    };

    logger.info({
      module: 'approval',
      action: 'send_reminder_success',
      requestId,
      message: '催办提醒发送成功',
      data: { sentCount: nodes.length },
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error({
      module: 'approval',
      action: 'send_reminder_error',
      requestId,
      message: '发送超时催办失败',
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
