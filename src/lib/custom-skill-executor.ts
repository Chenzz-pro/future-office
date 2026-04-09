/**
 * 自定义技能执行器
 * 
 * 负责执行自定义技能，包括构建请求、发送请求、解析响应
 */

import {
  CustomSkill,
  SkillExecutionResult,
  getFullApiUrl,
  buildHeaders,
  buildRequestBody,
} from '@/types/custom-skill';

// ============================================
// 响应解析
// ============================================

/**
 * 从对象中获取嵌套字段的值
 * @example getFieldValue({ a: { b: 1 } }, 'a.b') // 1
 */
function getFieldValue(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  
  return current;
}

/**
 * 解析 API 响应
 */
function parseResponse(
  response: unknown,
  parsing: CustomSkill['responseParsing']
): SkillExecutionResult {
  // 检查成功标识
  const successValue = getFieldValue(response, parsing.successField);
  const isSuccess = String(successValue) === parsing.successValue;
  
  if (!isSuccess) {
    const message = String(getFieldValue(response, parsing.messageField) || '请求失败');
    return {
      success: false,
      data: null,
      message,
      rawResponse: response,
    };
  }
  
  // 获取数据字段
  let data = getFieldValue(response, parsing.dataField);
  
  // 如果数据是 JSON 字符串，需要二次解析
  if (parsing.dataIsJson && typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      // 解析失败，保持原值
    }
  }
  
  // 提取数量字段
  let count: number | undefined;
  if (parsing.countField && data && typeof data === 'object') {
    count = Number(getFieldValue(data, parsing.countField)) || undefined;
  }
  
  // 构建消息
  let message = '执行成功';
  if (count !== undefined) {
    message = `执行成功，共 ${count} 条`;
  }
  
  return {
    success: true,
    data: count !== undefined ? { count, details: data } : data,
    message,
    rawResponse: response,
  };
}

// ============================================
// 技能执行
// ============================================

/**
 * 执行自定义技能
 */
export async function executeSkill(
  skill: CustomSkill,
  params: Record<string, unknown>
): Promise<SkillExecutionResult> {
  let url = getFullApiUrl(skill);
  const headers = buildHeaders(skill);
  const timeout = skill.apiConfig.timeout || 10000;
  
  try {
    let response: Response;
    
    // 处理EKP待办服务的多操作
    const action = params.action as string | undefined;
    if (action && skill.subSkills) {
      // 动态构建API路径：baseUrl + /{action}
      const baseUrl = skill.apiConfig.baseUrl.replace(/\/+$/, '');
      const servicePath = skill.apiConfig.path.replace(/\/+$/, '');
      url = `${baseUrl}${servicePath}/${action}`;
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    if (skill.apiConfig.method === 'GET') {
      // GET 请求：将参数拼接到 URL
      const urlObj = new URL(url);
      for (const [key, value] of Object.entries(params)) {
        urlObj.searchParams.append(key, String(value));
      }
      response = await fetch(urlObj.toString(), {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
    } else {
      // POST/PUT/DELETE 请求
      const body = buildRequestBody(skill, params);
      response = await fetch(url, {
        method: skill.apiConfig.method,
        headers,
        body,
        signal: controller.signal,
      });
    }
    
    clearTimeout(timeoutId);
    
    // 处理 HTTP 错误
    if (response.status === 302) {
      return {
        success: false,
        data: null,
        message: '认证失败：用户名或密码错误',
      };
    }
    
    if (response.status === 401) {
      return {
        success: false,
        data: null,
        message: '认证失败：请检查认证信息',
      };
    }
    
    if (response.status === 403) {
      return {
        success: false,
        data: null,
        message: '权限不足：请检查用户权限',
      };
    }
    
    if (response.status === 404) {
      return {
        success: false,
        data: null,
        message: '服务不存在：请检查接口路径',
      };
    }
    
    if (response.status === 415) {
      return {
        success: false,
        data: null,
        message: '请求格式错误：服务器不支持当前的 Content-Type',
      };
    }
    
    if (response.status >= 500) {
      return {
        success: false,
        data: null,
        message: `服务器错误：HTTP ${response.status}`,
      };
    }
    
    // 解析响应
    const text = await response.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      // 非 JSON 响应
      if (text.includes('<!doctype') || text.includes('<html')) {
        return {
          success: false,
          data: null,
          message: '认证失败：服务器返回了登录页面',
        };
      }
      return {
        success: false,
        data: text,
        message: '响应格式错误：非 JSON 响应',
        rawResponse: text,
      };
    }
    
    return parseResponse(json, skill.responseParsing);
    
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        return {
          success: false,
          data: null,
          message: '请求超时：服务器响应时间过长',
        };
      }
      if (err.message.includes('fetch failed') || err.message.includes('ENOTFOUND')) {
        return {
          success: false,
          data: null,
          message: '网络错误：无法连接到服务器',
        };
      }
    }
    return {
      success: false,
      data: null,
      message: `执行失败：${err instanceof Error ? err.message : '未知错误'}`,
    };
  }
}

// ============================================
// 技能测试
// ============================================

/**
 * 测试技能配置是否正确
 */
export async function testSkill(skill: CustomSkill): Promise<SkillExecutionResult> {
  // 使用默认参数测试
  const testParams: Record<string, unknown> = {};
  
  // 处理EKP待办服务 - 默认使用getTodoCount操作
  if (skill.subSkills && skill.subSkills.length > 0) {
    const defaultAction = skill.subSkills.find(s => s.action === 'getTodoCount') || skill.subSkills[0];
    testParams.action = defaultAction.action;
    
    // 为默认操作的必填参数设置测试值
    for (const param of defaultAction.params) {
      if (param.defaultValue !== undefined) {
        testParams[param.name] = param.defaultValue;
      } else if (param.required) {
        // 对于必填参数，使用认证信息中的用户名或默认值
        if ((param.name === 'target' || param.name === 'targets' || param.name === 'loginName') && skill.authConfig.type === 'basic') {
          testParams[param.name] = `{"LoginName":"${skill.authConfig.username}"}`;
        } else {
          testParams[param.name] = 'test_value';
        }
      }
    }
    return executeSkill(skill, testParams);
  }
  
  // 处理普通技能
  for (const param of skill.requestParams) {
    if (param.defaultValue !== undefined) {
      testParams[param.name] = param.defaultValue;
    } else if (param.required) {
      // 对于必填参数，尝试使用认证信息中的用户名
      if (param.name === 'loginName' && skill.authConfig.type === 'basic') {
        testParams[param.name] = skill.authConfig.username;
      } else {
        return {
          success: false,
          data: null,
          message: `缺少必填参数：${param.label}`,
        };
      }
    }
  }
  
  return executeSkill(skill, testParams);
}
