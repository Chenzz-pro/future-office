'use client';

import { useState, useCallback, useEffect } from 'react';

// ============================================
// 蓝凌EKP 配置类型定义
// ============================================

export interface EKPConfig {
  /** EKP系统访问地址，如 https://ekp.company.com */
  baseUrl: string;
  /** OAuth App Key */
  appKey: string;
  /** OAuth App Secret */
  appSecret: string;
  /** 授权模式：oauth2 | basic */
  authMode: 'oauth2' | 'basic';
  /** 表单模板ID - 请假申请 */
  leaveFormId: string;
  /** 表单模板ID - 报销申请 */
  expenseFormId: string;
  /** 是否启用 */
  enabled: boolean;
}

export interface EKPToken {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  obtained_at: number;
  /** 认证模式 */
  authMode?: 'oauth2' | 'basic';
}

export interface LeaveRequest {
  /** 请假类型：事假|病假|年假|婚假|产假|其他 */
  leaveType: string;
  /** 开始日期 YYYY-MM-DD */
  startDate: string;
  /** 结束日期 YYYY-MM-DD */
  endDate: string;
  /** 请假时长（天） */
  duration: number;
  /** 请假原因 */
  reason: string;
  /** 审批人ID（可选，自动匹配） */
  approverId?: string;
  /** 联系人电话 */
  contactPhone?: string;
}

export interface LeaveFormResult {
  /** 流程实例ID */
  processId: string;
  /** 表单数据ID */
  dataId: string;
  /** 流程任务ID */
  taskId: string;
  /** 当前审批节点 */
  currentNode: string;
  /** 下一审批人 */
  nextApprover: string;
  /** 创建时间 */
  createdAt: string;
  /** 状态：pending|approved|rejected */
  status: 'pending' | 'approved' | 'rejected';
}

export interface ExpenseRequest {
  /** 费用类型：差旅|交通|餐饮|办公|其他 */
  expenseType: string;
  /** 费用金额 */
  amount: number;
  /** 费用明细描述 */
  description: string;
  /** 发生日期 */
  expenseDate: string;
  /** 所属项目（可选） */
  projectName?: string;
}

export interface ExpenseFormResult {
  processId: string;
  dataId: string;
  taskId: string;
  currentNode: string;
  nextApprover: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

// ============================================
// 常量定义
// ============================================

const EKP_CONFIG_KEY = 'ekp_config';
const EKP_TOKEN_KEY = 'ekp_token';

// 请假类型映射
export const LEAVE_TYPE_MAP: Record<string, string> = {
  '事假': 'PERSONAL',
  '病假': 'SICK',
  '年假': 'ANNUAL',
  '婚假': 'MARRIAGE',
  '产假': 'MATERNITY',
  '陪产假': 'PATERNITY',
  '丧假': 'FUNERAL',
  '其他': 'OTHER',
};

// 费用类型映射
export const EXPENSE_TYPE_MAP: Record<string, string> = {
  '差旅': 'TRAVEL',
  '交通': 'TRANSPORT',
  '餐饮': 'MEAL',
  '办公': 'OFFICE',
  '招待': 'ENTERTAINMENT',
  '其他': 'OTHER',
};

// ============================================
// 默认配置
// ============================================

const DEFAULT_CONFIG: EKPConfig = {
  baseUrl: '',
  appKey: '',
  appSecret: '',
  authMode: 'oauth2',
  leaveFormId: 'LT_LEAVE_PERSONAL',
  expenseFormId: 'LT_EXPENSE',
  enabled: false,
};

// ============================================
// 工具函数：Base64 编码
// ============================================

function base64Encode(str: string): string {
  if (typeof window !== 'undefined') {
    return btoa(str);
  }
  // Node.js 环境
  return Buffer.from(str).toString('base64');
}

// ============================================
// Hook 实现
// ============================================

export function useEKPIntegration() {
  const [config, setConfig] = useState<EKPConfig>(DEFAULT_CONFIG);
  const [token, setToken] = useState<EKPToken | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载保存的配置
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedConfig = localStorage.getItem(EKP_CONFIG_KEY);
      const savedToken = localStorage.getItem(EKP_TOKEN_KEY);

      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
      if (savedToken) {
        const parsedToken = JSON.parse(savedToken);
        // 检查token是否过期（Basic Auth 模式下永不过期）
        if (parsedToken.authMode === 'basic' || parsedToken.obtained_at + parsedToken.expires_in * 1000 > Date.now()) {
          setToken(parsedToken);
          setIsConnected(true);
        }
      }
    }
  }, []);

  // 保存配置
  const saveConfig = useCallback((newConfig: EKPConfig) => {
    setConfig(newConfig);
    if (typeof window !== 'undefined') {
      localStorage.setItem(EKP_CONFIG_KEY, JSON.stringify(newConfig));
    }
  }, []);

  // 获取访问令牌（支持 OAuth2 和 Basic Auth）
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (!config.enabled || !config.baseUrl || !config.appKey) {
      setError('EKP配置不完整，请先配置连接信息');
      return null;
    }

    // Basic Auth 模式：直接返回 base64 编码的凭证
    if (config.authMode === 'basic') {
      const credentials = base64Encode(`${config.appKey}:${config.appSecret}`);
      setIsConnected(true);
      return credentials;
    }

    // OAuth2 模式：检查现有 token 是否有效
    if (token && token.authMode === 'oauth2' && Date.now() < token.obtained_at + token.expires_in * 1000 - 60000) {
      return token.access_token;
    }

    setIsLoading(true);
    setError(null);

    try {
      const tokenUrl = `${config.baseUrl}/api/oauth2/token`;

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: config.appKey,
          client_secret: config.appSecret,
          scope: 'form:create form:read process:start process:read',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error_description || `认证失败: ${response.status}`);
      }

      const data = await response.json();
      const newToken: EKPToken = {
        ...data,
        obtained_at: Date.now(),
        authMode: 'oauth2',
      };

      setToken(newToken);
      setIsConnected(true);

      if (typeof window !== 'undefined') {
        localStorage.setItem(EKP_TOKEN_KEY, JSON.stringify(newToken));
      }

      return newToken.access_token;
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取访问令牌失败';
      setError(message);
      setIsConnected(false);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [config, token]);

  // 构建认证头（根据认证模式返回正确的 Authorization 头）
  const buildAuthHeader = useCallback((credentials: string): string => {
    if (config.authMode === 'basic') {
      return `Basic ${credentials}`;
    }
    return `Bearer ${credentials}`;
  }, [config.authMode]);

  // 测试连接
  const testConnection = useCallback(async (testConfig?: EKPConfig): Promise<boolean> => {
    const targetConfig = testConfig || config;

    if (!targetConfig.enabled || !targetConfig.baseUrl) {
      setError('EKP地址未配置');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 简单测试：尝试访问EKP的用户信息接口
      const testUrl = `${targetConfig.baseUrl}/api/user/info`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // 如果配置了认证信息
      if (targetConfig.appKey && targetConfig.appSecret) {
        if (targetConfig.authMode === 'basic') {
          // Basic Auth 模式
          const credentials = base64Encode(`${targetConfig.appKey}:${targetConfig.appSecret}`);
          headers['Authorization'] = `Basic ${credentials}`;
        } else {
          // OAuth2 模式
          const tokenUrl = `${targetConfig.baseUrl}/api/oauth2/token`;
          const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              grant_type: 'client_credentials',
              client_id: targetConfig.appKey,
              client_secret: targetConfig.appSecret,
            }),
          });

          if (!response.ok) {
            throw new Error('OAuth认证失败，请检查 App Key 和 App Secret');
          }

          const data = await response.json();
          headers['Authorization'] = `Bearer ${data.access_token}`;
        }
      }

      const response = await fetch(testUrl, {
        method: 'GET',
        headers,
      });

      // 如果返回401/403，可能是认证问题，但至少说明服务可达
      if (response.status === 401 || response.status === 403) {
        setIsConnected(true);
        return true;
      }

      if (!response.ok) {
        throw new Error(`连接测试失败: HTTP ${response.status}`);
      }

      setIsConnected(true);
      if (testConfig) {
        saveConfig(testConfig);
      }
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : '连接测试失败';
      setError(message);
      setIsConnected(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [config, saveConfig]);

  // 创建请假表单
  const createLeaveForm = useCallback(async (leaveData: LeaveRequest): Promise<LeaveFormResult | null> => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = `${config.baseUrl}/api/form/data/create`;

      // 构建表单数据（蓝凌EKP格式）
      const formData = {
        formId: config.leaveFormId,
        data: {
          // 请假类型映射
          leave_type: LEAVE_TYPE_MAP[leaveData.leaveType] || leaveData.leaveType,
          start_date: leaveData.startDate,
          end_date: leaveData.endDate,
          duration: leaveData.duration,
          reason: leaveData.reason,
          contact_phone: leaveData.contactPhone || '',
          // 申请人信息（从token中获取）
          applicant_name: '当前用户',
          applicant_dept: '当前部门',
        },
        // 启动流程选项
        startProcess: true,
        // 可选：指定审批人
        approverId: leaveData.approverId,
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': buildAuthHeader(accessToken),
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `创建表单失败: ${response.status}`);
      }

      const result = await response.json();

      return {
        processId: result.processId || result.id || '',
        dataId: result.dataId || result.id || '',
        taskId: result.taskId || '',
        currentNode: result.currentNode || '审批中',
        nextApprover: result.nextApprover || '待指定',
        createdAt: new Date().toISOString(),
        status: 'pending',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : '创建请假表单失败';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [config, getAccessToken]);

  // 创建报销表单
  const createExpenseForm = useCallback(async (expenseData: ExpenseRequest): Promise<ExpenseFormResult | null> => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = `${config.baseUrl}/api/form/data/create`;

      const formData = {
        formId: config.expenseFormId,
        data: {
          expense_type: EXPENSE_TYPE_MAP[expenseData.expenseType] || expenseData.expenseType,
          amount: expenseData.amount,
          description: expenseData.description,
          expense_date: expenseData.expenseDate,
          project_name: expenseData.projectName || '',
        },
        startProcess: true,
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': buildAuthHeader(accessToken),
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `创建表单失败: ${response.status}`);
      }

      const result = await response.json();

      return {
        processId: result.processId || result.id || '',
        dataId: result.dataId || result.id || '',
        taskId: result.taskId || '',
        currentNode: result.currentNode || '审批中',
        nextApprover: result.nextApprover || '待指定',
        createdAt: new Date().toISOString(),
        status: 'pending',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : '创建报销表单失败';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [config, getAccessToken, buildAuthHeader]);

  // 查询请假记录
  const queryLeaveRecords = useCallback(async (filters?: {
    status?: 'pending' | 'approved' | 'rejected';
    startDate?: string;
    endDate?: string;
  }): Promise<LeaveFormResult[]> => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return [];
    }

    try {
      const params = new URLSearchParams();
      params.append('formId', config.leaveFormId);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);

      const apiUrl = `${config.baseUrl}/api/form/data/list?${params.toString()}`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': buildAuthHeader(accessToken),
        },
      });

      if (!response.ok) {
        throw new Error(`查询失败: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (err) {
      console.error('查询请假记录失败:', err);
      return [];
    }
  }, [config, getAccessToken, buildAuthHeader]);

  // 清除连接
  const disconnect = useCallback(() => {
    setToken(null);
    setIsConnected(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(EKP_TOKEN_KEY);
    }
  }, []);

  return {
    // 状态
    config,
    token,
    isLoading,
    isConnected,
    error,
    // 配置方法
    saveConfig,
    // 连接方法
    testConnection,
    disconnect,
    // 业务方法
    createLeaveForm,
    createExpenseForm,
    queryLeaveRecords,
    // 工具方法
    getAccessToken,
  };
}

// ============================================
// 意图识别工具函数
// ============================================

export interface ParsedLeaveIntent {
  /** 是否识别为请假意图 */
  isLeaveIntent: boolean;
  /** 请假类型 */
  leaveType?: string;
  /** 开始日期 */
  startDate?: string;
  /** 结束日期 */
  endDate?: string;
  /** 请假时长（天） */
  duration?: number;
  /** 请假原因 */
  reason?: string;
}

/**
 * 从用户输入中识别请假意图
 * 适用于接入AI对话时的意图解析
 */
export function parseLeaveIntent(userInput: string): ParsedLeaveIntent {
  const result: ParsedLeaveIntent = { isLeaveIntent: false };

  // 检测关键词
  const leaveKeywords = ['请假', '休息', '休假', '离开'];
  const hasLeaveKeyword = leaveKeywords.some(k => userInput.includes(k));

  if (!hasLeaveKeyword) {
    return result;
  }

  result.isLeaveIntent = true;

  // 识别请假类型
  const leaveTypes = ['事假', '病假', '年假', '婚假', '产假', '陪产假', '丧假'];
  for (const type of leaveTypes) {
    if (userInput.includes(type)) {
      result.leaveType = type;
      break;
    }
  }
  // 默认年假
  result.leaveType = result.leaveType || '年假';

  // 识别日期 - 简化版，实际需要更复杂的NLP
  const datePatterns = [
    /(\d{1,2})月(\d{1,2})日/,
    /(\d{4})-(\d{1,2})-(\d{1,2})/,
    /(\d{4})\/(\d{1,2})\/(\d{1,2})/,
  ];

  const today = new Date();

  // 识别"下周一"等相对日期
  if (userInput.includes('下周一')) {
    const nextMonday = new Date(today);
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    result.startDate = nextMonday.toISOString().split('T')[0];
    result.endDate = result.startDate;
  } else if (userInput.includes('下周五')) {
    const nextFriday = new Date(today);
    const dayOfWeek = today.getDay();
    const daysUntilFriday = dayOfWeek === 0 ? 5 : 5 + (7 - dayOfWeek);
    nextFriday.setDate(today.getDate() + daysUntilFriday);
    result.endDate = nextFriday.toISOString().split('T')[0];
  }

  // 识别时长
  const durationMatch = userInput.match(/(\d+)\s*(天|日|周|半天|小时)/);
  if (durationMatch) {
    const value = parseInt(durationMatch[1], 10);
    const unit = durationMatch[2];
    if (unit === '天' || unit === '日') {
      result.duration = value;
    } else if (unit === '周') {
      result.duration = value * 7;
    } else if (unit === '半天') {
      result.duration = 0.5;
    } else if (unit === '小时') {
      result.duration = value / 8; // 按8小时工作制折算
    }
  }

  // 提取请假原因
  const reasonKeywords = ['因为', '由于', '原因', '需要'];
  for (const keyword of reasonKeywords) {
    const index = userInput.indexOf(keyword);
    if (index !== -1) {
      result.reason = userInput.substring(index + keyword.length).trim();
      break;
    }
  }

  return result;
}
