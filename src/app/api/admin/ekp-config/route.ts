import { NextRequest, NextResponse } from 'next/server';
import { ekpConfigManager } from '@/lib/ekp/ekp-config-manager';

// 获取 EKP 配置
export async function GET() {
  try {
    // 确保配置已加载
    if (!ekpConfigManager.isLoaded()) {
      await ekpConfigManager.load();
    }

    const config = ekpConfigManager.getConfig();

    return NextResponse.json({
      success: true,
      data: {
        baseUrl: config.baseUrl,
        username: config.username,
        password: config.password ? '******' : '',
        apiPath: config.apiPath,
        enabled: config.enabled,
        ssoEnabled: config.ssoEnabled,
        ssoServiceId: config.ssoServiceId,
        ssoWebservicePath: config.ssoWebservicePath,
        ssoLoginPath: config.ssoLoginPath,
        ssoSessionVerifyPath: config.ssoSessionVerifyPath,
        proxyEnabled: config.proxyEnabled,
        proxyPath: config.proxyPath,
        leaveTemplateId: config.leaveTemplateId,
        expenseTemplateId: config.expenseTemplateId,
        tripTemplateId: config.tripTemplateId,
        purchaseTemplateId: config.purchaseTemplateId,
      },
    });
  } catch (error) {
    console.error('获取EKP配置失败:', error);
    return NextResponse.json(
      { success: false, error: '获取配置失败' },
      { status: 500 }
    );
  }
}

// 保存 EKP 配置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const success = await ekpConfigManager.save({
      baseUrl: body.baseUrl,
      username: body.username,
      password: body.password && body.password !== '******' ? body.password : undefined,
      apiPath: body.apiPath,
      enabled: body.enabled,
      ssoEnabled: body.ssoEnabled,
      ssoServiceId: body.ssoServiceId,
      ssoWebservicePath: body.ssoWebservicePath,
      ssoLoginPath: body.ssoLoginPath,
      ssoSessionVerifyPath: body.ssoSessionVerifyPath,
      proxyEnabled: body.proxyEnabled,
      proxyPath: body.proxyPath,
      leaveTemplateId: body.leaveTemplateId,
      expenseTemplateId: body.expenseTemplateId,
      tripTemplateId: body.tripTemplateId,
      purchaseTemplateId: body.purchaseTemplateId,
    });

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: '保存配置失败' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('保存EKP配置失败:', error);
    return NextResponse.json(
      { success: false, error: '保存配置失败' },
      { status: 500 }
    );
  }
}
