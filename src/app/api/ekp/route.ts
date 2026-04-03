import { NextRequest } from 'next/server';
import { 
  EKPSoapClient, 
  buildLeaveFormData, 
  buildExpenseFormData,
  KmReviewParameterForm 
} from '@/lib/ekp-soap-client';

interface EKPProxyRequest {
  action: 'test' | 'addReview' | 'approveReview' | 'updateReview';
  baseUrl: string;
  username: string;
  password: string;
  serviceId: string;
  templateId?: string;
  data?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const body: EKPProxyRequest = await request.json();
    const { action, baseUrl, username, password, serviceId, templateId, data } = body;

    // 验证必填参数
    if (!baseUrl) {
      return jsonResponse(false, '请输入 EKP 系统地址');
    }

    if (!username || !password) {
      return jsonResponse(false, '请输入用户名和密码');
    }

    if (!serviceId) {
      return jsonResponse(false, '请输入服务标识');
    }

    // 创建 SOAP 客户端
    const client = new EKPSoapClient({
      baseUrl,
      username,
      password,
      serviceId,
    });

    // 执行操作
    switch (action) {
      case 'test': {
        const result = await client.testConnection();
        if (result.success) {
          return jsonResponse(true, '连接成功！Basic Auth 认证通过，服务可用');
        }
        return jsonResponse(false, result.error || '连接失败');
      }

      case 'addReview': {
        if (!templateId) {
          return jsonResponse(false, '请输入表单模板ID');
        }

        if (!data) {
          return jsonResponse(false, '请提供表单数据');
        }

        // 构建 SOAP 请求参数
        const formData: KmReviewParameterForm = {
          fdTemplateId: templateId,
          docSubject: String(data.docSubject || '新申请'),
          docContent: String(data.docContent || ''),
          formValues: typeof data.formValues === 'string' 
            ? data.formValues 
            : JSON.stringify(data.formValues || {}),
        };

        const result = await client.addReview(formData);
        
        if (result.success) {
          return jsonResponse(true, '流程发起成功', { 
            processId: result.data,
            message: '申请已提交，等待审批' 
          });
        }
        return jsonResponse(false, result.error || '流程发起失败');
      }

      case 'approveReview': {
        if (!data?.fdId) {
          return jsonResponse(false, '请提供流程ID');
        }

        const formData: KmReviewParameterForm = {
          fdId: String(data.fdId),
          docSubject: String(data.docSubject || ''),
          formValues: typeof data.formValues === 'string' 
            ? data.formValues 
            : JSON.stringify(data.formValues || {}),
        };

        const result = await client.approveReview(formData);
        
        if (result.success) {
          return jsonResponse(true, '审批成功', { data: result.data });
        }
        return jsonResponse(false, result.error || '审批失败');
      }

      default:
        return jsonResponse(false, '未知操作');
    }

  } catch (error) {
    console.error('EKP API Error:', error);
    return jsonResponse(false, `服务器错误：${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 统一的 JSON 响应
 */
function jsonResponse(success: boolean, message: string, extra: Record<string, unknown> = {}) {
  return new Response(
    JSON.stringify({ success, message, ...extra }),
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
}
