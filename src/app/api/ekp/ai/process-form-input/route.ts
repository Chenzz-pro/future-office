/**
 * AI 表单处理 API
 * POST /api/ekp/ai/process-form-input
 * 
 * 处理自然语言输入，解析并返回表单数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { formService } from '@/lib/ekp/services';

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

    // 使用表单服务解析自然语言
    const formData = formService.formatNaturalLanguage(text, businessType, {
      strict: false,
      fillEmpty: true,
    });

    // 生成 AI 回复
    const message = generateResponseMessage(formData, text);

    return NextResponse.json({
      success: true,
      data: {
        message,
        formData,
        isAction: Object.keys(formData).length > 0,
        actionType: isSubmitAction(text) ? 'submit' : 'fill_field',
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
 * 生成 AI 回复消息
 */
function generateResponseMessage(formData: Record<string, unknown>, originalText: string): string {
  const fields = Object.keys(formData);

  if (fields.length === 0) {
    return '抱歉，我没有从您的描述中提取到有效的表单信息。请尝试更具体的描述，例如：\n\n"请事假3天，明天开始"\n"原因：家中有事"';
  }

  const details = fields.map(key => {
    const value = formData[key];
    const valueStr = formatFieldValue(key, value);
    return `${getFieldLabel(key)}: ${valueStr}`;
  }).join('\n');

  const isSubmit = isSubmitAction(originalText);

  if (isSubmit) {
    return `已准备好提交以下信息：\n\n${details}\n\n正在提交表单...`;
  }

  return `已为您填写以下内容：\n\n${details}\n\n还有其他需要补充的吗？`;
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
  if (field.toLowerCase().includes('amount') || field.toLowerCase().includes('days')) {
    return `${value}元`;
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
