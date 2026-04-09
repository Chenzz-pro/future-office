import { NextRequest } from 'next/server';
import mysql from 'mysql2/promise';
import { EKPRestClient, EKPRequest } from '@/lib/ekp-rest-client';
import { dbManager } from '@/lib/database';

interface EKPProxyRequest {
  action: 'test' | 'addReview' | 'approveReview' | 'updateReview' | 'getTodoCount' | 'getTodo' | 'invoke' | 'setTodoDone' | 'deleteTodo' | 'sendTodo' | 'updateTodo' | 'getTodoTargets';
  baseUrl?: string;
  username?: string;
  password?: string;
  apiPath?: string;
  serviceId?: string;
  templateId?: string;
  loginName?: string;
  todoType?: number;
  data?: Record<string, unknown>;
  userId?: string;
  todoId?: string;
  target?: string;
  content?: string;
  comment?: string;
}

interface EkpConfigRow {
  id: string;
  user_id: string;
  ekp_address: string;
  api_path: string;
  username: string | null;
  password: string | null;
  auth_type: string;
  is_active: number;
}

/**
 * 统一响应格式
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

/**
 * 从数据库获取EKP配置 - 使用连接池直接查询
 */
async function getEKPConfigFromDB(): Promise<{
  baseUrl: string;
  username: string;
  password: string;
  apiPath: string;
} | null> {
  try {
    // 获取数据库配置
    const dbConfig = dbManager.getConfig();
    console.log('[EKP API] 数据库配置:', dbConfig ? {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.databaseName,
      hasPassword: !!dbConfig.password,
    } : null);
    
    if (!dbConfig) {
      console.log('[EKP API] 未找到数据库配置');
      return null;
    }

    // 创建临时连接池
    const tempPool = mysql.createPool({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.databaseName,
      waitForConnections: true,
      connectionLimit: 1,
    });

    try {
      // 查询 EKP 配置
      const [rows] = await tempPool.execute(
        'SELECT * FROM ekp_configs LIMIT 1'
      ) as [EkpConfigRow[], unknown];

      if (!rows || rows.length === 0) {
        console.log('[EKP API] 没有找到活跃的EKP配置');
        return null;
      }

      const config = rows[0];
      console.log('[EKP API] 找到EKP配置:', {
        baseUrl: config.ekp_address,
        username: config.username,
        hasPassword: !!config.password,
        apiPath: config.api_path,
      });

      return {
        baseUrl: config.ekp_address,
        username: config.username || '',
        password: config.password || '',
        apiPath: config.api_path || '/api/sys-notify/sysNotifyTodoRestService/getTodo',
      };
    } finally {
      await tempPool.end();
    }
  } catch (error) {
    console.error('[EKP API] 获取EKP配置失败:', error);
    return null;
  }
}

/**
 * 根据用户ID获取登录名
 */
async function getLoginNameByUserId(userId: string): Promise<string | null> {
  try {
    // 获取数据库配置
    const dbConfig = dbManager.getConfig();
    if (!dbConfig) {
      return null;
    }

    // 创建临时连接池
    const tempPool = mysql.createPool({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.databaseName,
      waitForConnections: true,
      connectionLimit: 1,
    });

    try {
      const [rows] = await tempPool.execute(
        'SELECT fd_login_name FROM sys_org_person WHERE fd_id = ?',
        [userId]
      ) as [{ fd_login_name: string }[], unknown];

      if (rows && rows.length > 0) {
        return rows[0].fd_login_name;
      }

      return null;
    } finally {
      await tempPool.end();
    }
  } catch (error) {
    console.error('[EKP API] 获取用户登录名失败:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: EKPProxyRequest = await request.json();
    const { action, baseUrl, username, password, apiPath, serviceId, templateId, loginName, todoType, data, userId } = body;

    // 权限校验
    if (action !== 'test' && !userId) {
      console.error('[EKP API] 权限校验失败：userId为空');
      return jsonResponse(false, '用户ID不能为空');
    }

    // 获取认证信息
    let ekpBaseUrl = baseUrl;
    let ekpUsername = username;
    let ekpPassword = password;
    let ekpApiPath = apiPath;

    // 从数据库获取
    if (!ekpBaseUrl || !ekpUsername || !ekpPassword) {
      console.log('[EKP API] 尝试从数据库获取EKP配置...');
      const dbConfig = await getEKPConfigFromDB();
      
      if (!dbConfig) {
        console.log('[EKP API] 数据库配置获取失败');
        return jsonResponse(false, 'EKP系统未配置，请先在集成中心配置EKP连接信息');
      }
      
      ekpBaseUrl = ekpBaseUrl || dbConfig.baseUrl;
      ekpUsername = ekpUsername || dbConfig.username;
      ekpPassword = ekpPassword || dbConfig.password;
      ekpApiPath = ekpApiPath || dbConfig.apiPath;
    }

    // 验证必填参数
    if (!ekpBaseUrl) {
      return jsonResponse(false, '请输入 EKP 系统地址');
    }

    if (!ekpUsername || !ekpPassword) {
      return jsonResponse(false, '请输入用户名和密码');
    }

    // 创建 REST 客户端
    const client = new EKPRestClient({
      baseUrl: ekpBaseUrl,
      username: ekpUsername,
      password: ekpPassword,
      apiPath: ekpApiPath || '',
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

      // 通用的 EKP 待办服务调用入口
      // 支持: getTodoCount, getTodo, setTodoDone, deleteTodo, sendTodo, updateTodo, getTodoTargets
      case 'invoke':
      case 'getTodoCount': {

        let targetUser = loginName || ekpUsername;
        
        if (userId && !loginName) {
          const fetchedLoginName = await getLoginNameByUserId(userId);
          if (fetchedLoginName) {
            targetUser = fetchedLoginName;
          }
        }

        console.log('[EKP API] 查询待办', { userId, targetUser, action: 'getTodoCount' });

        const result = await client.getTodoCount(targetUser, todoType as -1 | 0 | 1 | 2 | 3 | 13 || 0);

        if (result.success) {
          return jsonResponse(true, result.msg || '获取成功', {
            loginName: targetUser,
            todoCount: result.data,
            userId,
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

        const formData: EKPRequest = {
          fdTemplateId: templateId,
          docSubject: String(data.docSubject || '新申请'),
          docContent: String(data.docContent || ''),
          formValues: (data.formValues as Record<string, unknown>) || {},
        };

        const result = await client.addReview(formData);
        
        if (result.success) {
          return jsonResponse(true, result.msg || '提交成功', {
            docId: result.data,
          });
        }
        return jsonResponse(false, result.msg || '提交失败');
      }

      case 'approveReview': {
        if (!data?.taskId) {
          return jsonResponse(false, '请提供任务ID');
        }

        const result = await client.approveReview({
          fdId: String(data.taskId),
          formValues: JSON.stringify({
            action: data.approveAction || 'approve',
            comment: data.comment || '',
          }),
        });

        if (result.success) {
          return jsonResponse(true, result.msg || '审批成功');
        }
        return jsonResponse(false, result.msg || '审批失败');
      }

      case 'updateReview': {
        // updateReview 方法暂未实现
        return jsonResponse(false, '更新审批功能暂未实现');
      }

      default:
        return jsonResponse(false, `不支持的操作: ${action}`);
    }

  } catch (error) {
    console.error('EKP API Error:', error);
    return jsonResponse(false, `服务器错误：${error instanceof Error ? error.message : '未知错误'}`);
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('[EKP API GET] 开始检查EKP配置');
    const dbConfig = await getEKPConfigFromDB();
    
    if (!dbConfig) {
      console.log('[EKP API GET] 未找到配置');
      return jsonResponse(false, 'EKP系统未配置', { configured: false });
    }
    
    console.log('[EKP API GET] 找到配置');
    return jsonResponse(true, 'EKP系统已配置', { 
      configured: true,
      baseUrl: dbConfig.baseUrl,
      username: dbConfig.username ? '***' : '',
    });
  } catch (error) {
    console.error('[EKP API GET] 检查配置失败:', error);
    return jsonResponse(false, `检查失败：${error instanceof Error ? error.message : '未知错误'}`);
  }
}
