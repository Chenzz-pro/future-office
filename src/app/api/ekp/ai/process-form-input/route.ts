/**
 * AI 表单处理 API
 * POST /api/ekp/ai/process-form-input
 * 
 * 处理自然语言输入，解析并返回表单数据
 * 当检测到提交操作时，自动调用 EKP API 提交表单
 */

import { NextRequest, NextResponse } from 'next/server';
import { formService } from '@/lib/ekp/services';
import { flowService } from '@/lib/ekp/services/flow-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, businessType, currentData, fieldMappings, userId } = body;

    if (!text || !businessType) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数',
      }, { status: 400 });
    }

    // 解析自然语言
    const formData = formService.formatNaturalLanguage(text, businessType, {
      strict: false,
      fillEmpty: true,
    });

    // 检查是否是提交操作
    const isSubmit = isSubmitAction(text);
    
    // 如果是提交操作，调用 EKP API 提交表单
    let submitResult: { success: boolean; message: string; instanceId?: string } | null = null;
    if (isSubmit && userId && Object.keys(formData).length > 0) {
      try {
        console.log('[API:process-form-input] 开始提交表单:', { businessType, userId, formData });
        submitResult = await flowService.launchByType(userId, businessType, formData);
        console.log('[API:process-form-input] 提交结果:', submitResult);
      } catch (error) {
        console.error('[API:process-form-input] 提交表单失败:', error);
        submitResult = {
          success: false,
          message: error instanceof Error ? error.message : '提交失败',
        };
      }
    }

    // 生成 AI 回复
    const message = generateResponseMessage(formData, text, isSubmit, submitResult);

    return NextResponse.json({
      success: true,
      data: {
        message,
        formData,
        isAction: Object.keys(formData).length > 0,
        actionType: isSubmit ? 'submit' : 'fill_field',
        submitResult,
      },
    });
  } catch (error) {
    console.error('[API:process-form-input] 处理失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '处理失败',
    }, { status: 500 });
  }
}

/**
 * 判断是否是提交操作
 */
function isSubmitAction(text: string): boolean {
  const submitKeywords = ['提交', '送出', '发起', '申请', '确认', '确定', 'submit', 'send'];
  const lowerText = text.toLowerCase();
  return submitKeywords.some(kw => lowerText.includes(kw));
}

/**
 * 生成 AI 回复消息
 */
function generateResponseMessage(
  formData: Record<string, unknown>, 
  originalText: string,
  isSubmit?: boolean,
  submitResult?: { success: boolean; message: string; instanceId?: string } | null
): string {
  const fields = Object.keys(formData);

  if (fields.length === 0 && !isSubmit) {
    return '抱歉，我没有从您的描述中提取到有效的表单信息。请尝试更具体的描述，例如：\n\n"请事假3天，明天开始"\n"原因：家中有事"';
  }

  // 如果是提交操作
  if (isSubmit && submitResult) {
    if (submitResult.success) {
      return `您的${getBusinessTypeName(originalText)}申请已成功提交！\n\n申请流水号：${submitResult.instanceId || '未知'}\n\n您可以在"我的流程"中查看审批进度。`;
    } else {
      const missingFields = fields.map(key => `- ${getFieldLabel(key)}`).join('\n');
      return `⚠️ 提交遇到问题：${submitResult.message}\n\n请检查以下信息是否完整：\n${missingFields}\n\n或者联系管理员检查 EKP 系统配置。`;
    }
  }

  if (isSubmit) {
    const details = fields.map(key => {
      const value = formData[key];
      const valueStr = formatFieldValue(key, value);
      return `${getFieldLabel(key)}: ${valueStr}`;
    }).join('\n');

    return `已准备好提交以下信息：\n\n${details}\n\n正在提交表单，请稍候...`;
  }

  // 普通填表操作
  const details = fields.map(key => {
    const value = formData[key];
    const valueStr = formatFieldValue(key, value);
    return `${getFieldLabel(key)}: ${valueStr}`;
  }).join('\n');

  return `已为您填写以下内容：\n\n${details}\n\n还有其他需要补充的吗？`;
}

/**
 * 获取业务类型名称
 */
function getBusinessTypeName(text: string): string {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('请假') || lowerText.includes('休假')) return '请假';
  if (lowerText.includes('报销')) return '费用报销';
  if (lowerText.includes('出差')) return '出差';
  if (lowerText.includes('采购')) return '采购';
  if (lowerText.includes('用车')) return '用车';
  return '申请';
}

/**
 * 格式化字段值
 */
function formatFieldValue(field: string, value: unknown): string {
  if (value === undefined || value === null) {
    return '(未填写)';
  }

  // 日期格式化
  if (field.toLowerCase().includes('time') || field.toLowerCase().includes('date')) {
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      return value.split('T')[0];
    }
  }

  // 数字格式化
  if (field.toLowerCase().includes('amount')) {
    return `${value}元`;
  }
  
  // 天数格式化
  if (field.toLowerCase().includes('days') || field === 'days') {
    return `${value}天`;
  }

  // 请假类型
  if (field === 'leaveType') {
    const types: Record<string, string> = {
      '01': '事假',
      '02': '病假',
      '03': '年假',
      '04': '婚假',
      '05': '产假',
      '06': '丧假',
      '07': '调休',
    };
    return types[String(value)] || String(value);
  }

  return String(value);
}

/**
 * 获取字段标签
 */
function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    leaveType: '请假类型',
    startTime: '开始时间',
    endTime: '结束时间',
    days: '请假天数',
    reason: '请假原因',
    expenseType: '费用类型',
    amount: '报销金额',
    expenseDate: '报销日期',
    description: '费用说明',
    purchaseType: '采购类型',
    items: '采购物品',
    totalAmount: '总金额',
  };

  return labels[field] || field;
}
