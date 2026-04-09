/**
 * 表单生成工具
 * 从 EKP 获取模板并自动填充字段
 */

import { ekpApprovalClient, ApprovalType, ApprovalFormTemplate } from '../ekp-approval-client';

export interface FormGenerateParams {
  approval_type: string;
  userId: string;
  deptId: string;
  reason?: string;
  amount?: number;
  days?: number;
  startTime?: string;
  endTime?: string;
}

export interface GenerateFormResult {
  templateId: string;
  formData: Record<string, unknown>;
}

export class FormGenerator {
  /**
   * 从 EKP 获取模板 + 自动填充字段
   */
  async generateForm(params: FormGenerateParams): Promise<GenerateFormResult> {
    // 1. 调用 EKP 获取对应审批类型的表单模板
    const ekpTemplate = await this.getEKPFormTemplate(params.approval_type);

    // 2. 自动填充字段
    const formData: Record<string, unknown> = {
      ...this.buildFormDataFromTemplate(ekpTemplate),
      applicantId: params.userId,
      deptId: params.deptId,
      reason: params.reason || '无',
      amount: params.amount || 0,
      leaveDays: params.days || 0,
      startTime: params.startTime || '',
      endTime: params.endTime || '',
    };

    return {
      templateId: ekpTemplate.templateId,
      formData,
    };
  }

  /**
   * 调用 EKP 表单模板接口
   */
  private async getEKPFormTemplate(approval_type: string): Promise<ApprovalFormTemplate> {
    // 将字符串类型转换为枚举
    const type = this.parseApprovalType(approval_type);

    // 调用EKP审批客户端获取模板
    return await ekpApprovalClient.getFormTemplate(type);
  }

  /**
   * 从模板构建表单数据
   */
  private buildFormDataFromTemplate(template: ApprovalFormTemplate): Record<string, unknown> {
    const formData: Record<string, unknown> = {};

    for (const field of template.fields) {
      if (field.defaultValue !== undefined) {
        formData[field.name] = field.defaultValue;
      } else if (!field.required) {
        formData[field.name] = '';
      }
    }

    return formData;
  }

  /**
   * 解析审批类型
   */
  private parseApprovalType(type: string): ApprovalType {
    const typeMap: Record<string, ApprovalType> = {
      'leave': ApprovalType.LEAVE,
      'reimbursement': ApprovalType.REIMBURSEMENT,
      'purchase': ApprovalType.PURCHASE,
      'expense_report': ApprovalType.EXPENSE_REPORT,
    };

    return typeMap[type] || ApprovalType.LEAVE;
  }
}
