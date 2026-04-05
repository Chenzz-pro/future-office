import { NextRequest } from 'next/server';
import { 
  EKPRestClient, 
  buildLeaveFormData, 
  buildExpenseFormData,
  EKPRequest 
} from '@/lib/ekp-rest-client';

interface EKPProxyRequest {
  action: 'test' | 'addReview' | 'approveReview' | 'updateReview' | 'getTodoCount';
  baseUrl: string;
  username: string;
  password: string;
  apiPath?: string;
  serviceId?: string;
  templateId?: string;
  loginName?: string;  // 用于获取待办数量
  todoType?: number;   // 待办类型
  data?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const body: EKPProxyRequest = await request.json();
    const { action, baseUrl, username, password, apiPath, serviceId, templateId, loginName, todoType, data } = body;

    // 验证必填参数
    if (!baseUrl) {
      return jsonResponse(false, '请输入 EKP 系统地址');
    }

    if (!username || !password) {
      return jsonResponse(false, '请输入用户名和密码');
    }

    // 创建 REST 客户端
    const client = new EKPRestClient({
      baseUrl,
      username,
      password,
      apiPath: apiPath || '',
      serviceId: serviceId || '',
    });

    // 执行操作
    switch (action) {
      case 'test': {
        const result = await client.testConnection();
        if (result.success) {
          return jsonResponse(true, result.msg || '连接成功！', { todoCount: result.data });
        }
        return jsonResponse(false, result.msg || '连接失败');
      }

      case 'getTodoCount': {
        // 获取指定用户的待办数量
        const targetUser = loginName || username;
        const result = await client.getTodoCount(targetUser, todoType as -1 | 0 | 1 | 2 | 3 | 13 || 0);
        
        if (result.success) {
          return jsonResponse(true, result.msg || '获取成功', { 
            loginName: targetUser,
            todoCount: result.data 
          });
        }
        return jsonResponse(false, result.msg || '获取待办数量失败');
      }

      case 'addReview': {
        if (!templateId) {
          return jsonResponse(false, '请输入表单模板ID');
        }

        if (!data) {
          return jsonResponse(false, '请提供表单数据');
        }

        // 构建请求参数
        const formData: EKPRequest = {
          fdTemplateId: templateId,
          docSubject: String(data.docSubject || '新申请'),
          docContent: String(data.docContent || ''),
          formValues: (data.formValues as Record<string, unknown>) || {},
        };

        const result = await client.addReview(formData);
        
        if (result.success) {
          return jsonResponse(true, '流程发起成功', { 
            processId: result.data,
            message: '申请已提交，等待审批' 
          });
        }
        return jsonResponse(false, result.msg || '流程发起失败');
      }

      case 'approveReview': {
        if (!data?.fdId) {
          return jsonResponse(false, '请提供流程ID');
        }

        const formData: EKPRequest = {
          fdId: String(data.fdId),
          formValues: (data.formValues as Record<string, unknown>) || {},
        };

        const result = await client.approveReview(formData);
        
        if (result.success) {
          return jsonResponse(true, '审批成功', { data: result.data });
        }
        return jsonResponse(false, result.msg || '审批失败');
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
