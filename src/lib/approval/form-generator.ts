/**
 * 表单生成工具
 * 从 EKP 获取模板并自动填充字段
 */

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

export interface EKPFormTemplate {
  templateId: string;
  fields: Record<string, unknown>;
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
      ...ekpTemplate.fields,
      applicantId: params.userId,
      deptId: params.deptId,
      reason: params.reason || "无",
      amount: params.amount || 0,
      leaveDays: params.days || 0,
      startTime: params.startTime || "",
      endTime: params.endTime || "",
    };

    return {
      templateId: ekpTemplate.templateId,
      formData,
    };
  }

  /**
   * 调用 EKP 表单模板接口
   */
  private async getEKPFormTemplate(approval_type: string): Promise<EKPFormTemplate> {
    // TODO: 实际封装 EKP /ekp/form/template 接口
    // 这里需要调用 EKP REST 客户端获取表单模板

    // 模拟返回数据（实际应调用 EKP 接口）
    return {
      templateId: `FORM_${approval_type.toUpperCase()}`,
      fields: {},
    };
  }
}
