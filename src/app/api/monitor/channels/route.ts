/**
 * 通知渠道管理 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { monitorRepository } from '@/lib/monitor/monitor-repository';
import { NotificationChannel } from '@/lib/monitor/types';

/**
 * GET /api/monitor/channels
 * 获取通知渠道列表
 */
export async function GET() {
  try {
    const channels = await monitorRepository.getAllChannels();

    return NextResponse.json({
      success: true,
      data: channels,
    });
  } catch (error) {
    console.error('[API:Monitor:Channels] 获取渠道失败:', error);
    return NextResponse.json(
      { success: false, error: '获取渠道失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/monitor/channels
 * 创建/更新通知渠道
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const channel = {
      id: body.id || crypto.randomUUID(),
      channel: body.channel as NotificationChannel,
      name: body.name,
      enabled: body.enabled ?? true,
      config: body.config || {},
      // SMTP配置
      smtpHost: body.smtpHost,
      smtpPort: body.smtpPort,
      smtpUser: body.smtpUser,
      smtpPassword: body.smtpPassword,
      smtpFrom: body.smtpFrom,
      // Webhook配置
      webhookUrl: body.webhookUrl,
      webhookHeaders: body.webhookHeaders,
      webhookMethod: body.webhookMethod,
      // 钉钉配置
      dingtalkWebhook: body.dingtalkWebhook,
      dingtalkSecret: body.dingtalkSecret,
      // 企业微信配置
      wechatWorkWebhook: body.wechatWorkWebhook,
      wechatWorkAgentId: body.wechatWorkAgentId,
    };

    // 验证必填字段
    if (!channel.channel || !channel.name) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段' },
        { status: 400 }
      );
    }

    const savedChannel = await monitorRepository.saveChannel(channel);

    return NextResponse.json({
      success: true,
      message: '渠道保存成功',
      data: savedChannel,
    });
  } catch (error) {
    console.error('[API:Monitor:Channels] 保存渠道失败:', error);
    return NextResponse.json(
      { success: false, error: '保存渠道失败' },
      { status: 500 }
    );
  }
}
