import { NextRequest, NextResponse } from 'next/server';
import { ekpInterfaceRegistry } from '@/lib/ekp-interface-registry';
import { dbManager } from '@/lib/database/manager';

// POST /api/admin/ekp-interfaces/test - 测试接口
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { interfaceCode, params } = body;

    if (!interfaceCode) {
      return NextResponse.json(
        { success: false, error: '缺少参数 interfaceCode' },
        { status: 400 }
      );
    }

    // 获取接口配置
    const interfaceConfig = await ekpInterfaceRegistry.get(interfaceCode);
    if (!interfaceConfig) {
      return NextResponse.json(
        { success: false, error: '接口不存在' },
        { status: 404 }
      );
    }

    // 获取EKP配置
    const ekpConfigQuery = `
      SELECT ekp_address, username, password, config
      FROM ekp_configs
      WHERE user_id = '00000000-0000-0000-0000-000000000000'
      LIMIT 1
    `;
    const configResult = await dbManager.query(ekpConfigQuery);

    if (configResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '未找到EKP配置，请先配置EKP连接信息' },
        { status: 400 }
      );
    }

    const configRow = configResult.rows[0] as any;
    const extraConfig = typeof configRow.config === 'string'
      ? JSON.parse(configRow.config)
      : (configRow.config || {});

    const ekpConfig = {
      baseUrl: configRow.ekp_address,
      username: configRow.username,
      password: configRow.password,
      apiPath: extraConfig.apiPath || '/api/sys-notify/sysNotifyTodoRestService/getTodo',
      serviceId: extraConfig.serviceId || 'approval-agent',
    };

    // 构建请求URL
    const url = `${ekpConfig.baseUrl}${interfaceConfig.path}`;

    // 构建请求体
    const requestBody = buildRequestBody(interfaceConfig.request, params || {});

    // 发送请求
    const auth = btoa(`${ekpConfig.username}:${ekpConfig.password}`);
    const response = await fetch(url, {
      method: interfaceConfig.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: interfaceConfig.method !== 'GET' ? JSON.stringify(requestBody) : undefined,
    });

    const responseData = await response.json();

    // 解析响应
    const result = parseResponse(interfaceConfig.response, responseData);

    return NextResponse.json({
      success: response.ok,
      statusCode: response.status,
      data: responseData,
      parsed: result,
      request: {
        url,
        method: interfaceConfig.method,
        body: requestBody,
      },
    });
  } catch (error) {
    console.error('测试接口失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}

// 构建请求体
function buildRequestBody(template: Record<string, unknown>, params: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(template)) {
    if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
      const paramKey = value.slice(1, -1);
      result[key] = params[paramKey];
    } else {
      result[key] = value;
    }
  }

  // 合并额外参数
  for (const [key, value] of Object.entries(params)) {
    if (!(key in result)) {
      result[key] = value;
    }
  }

  return result;
}

// 解析响应
function parseResponse(parser: Record<string, unknown>, response: any): any {
  try {
    // 简单的响应解析
    if (parser.successPath) {
      // 这里可以根据实际需求实现更复杂的解析逻辑
      const isSuccess = eval(parser.successPath as string);
      return {
        success: isSuccess,
        data: parser.dataPath ? getValueByPath(response, parser.dataPath as string) : response,
      };
    }

    return response;
  } catch (error) {
    console.error('解析响应失败:', error);
    return response;
  }
}

// 根据路径获取值
function getValueByPath(obj: any, path: string): any {
  const keys = path.split('.');
  let result = obj;

  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      return null;
    }
  }

  return result;
}
