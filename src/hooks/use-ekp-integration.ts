'use client';

import { useState, useCallback, useEffect } from 'react';

// ============================================
// 蓝凌EKP 配置类型定义
// ============================================

export interface EKPConfig {
  /** EKP系统访问地址，如 https://oa.company.com */
  baseUrl: string;
  /** 认证用户名 */
  username: string;
  /** 认证密码 */
  password: string;
  /** REST服务路径前缀，如 /sys/webservice/rest 或 /km/review/ */
  apiPrefix: string;
  /** 表单模板ID - 请假申请 */
  leaveFormId: string;
  /** 表单模板ID - 报销申请 */
  expenseFormId: string;
  /** 是否启用 */
  enabled: boolean;
}

// ============================================
// 预设的REST服务路径
// ============================================

export const EKP_REST_SERVICES = {
  // 流程管理 - 用于请假、报销等审批流程（推荐）
  review: {
    name: '流程管理',
    path: '/api/km-review/',
    description: '请假、报销等审批流程',
  },
  // 日程管理
  calendar: {
    name: '日程管理',
    path: '/api/km-calendar/',
    description: '日程创建和查询',
  },
  // 旧版日程服务
  calendarOld: {
    name: '日程服务(v2)',
    path: '/km/calendar/',
    description: '日程创建和查询(v2)',
  },
  // 人事档案
  hr: {
    name: '人事档案',
    path: '/api/hr-staff/',
    description: '员工信息查询',
  },
  // 会议管理
  meeting: {
    name: '会议管理',
    path: '/api/km-meeting/',
    description: '会议预约和管理',
  },
  // 知识库
  kms: {
    name: '知识库',
    path: '/api/kms-doc/',
    description: '文档和知识库管理',
  },
  // 通用的WebService路径（旧版）
  webservice: {
    name: '通用WebService',
    path: '/sys/webservice/rest',
    description: '蓝凌标准REST服务',
  },
};

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
  username: '',
  password: '',
  apiPrefix: '/api/km-review/',
  leaveFormId: '',
  expenseFormId: '',
  enabled: false,
};

// ============================================
// 工具函数
// ============================================

function base64Encode(str: string): string {
  if (typeof window !== 'undefined') {
    return btoa(str);
  }
  return Buffer.from(str).toString('base64');
}

/**
 * 获取Basic Auth认证头
 */
function getBasicAuthHeader(username: string, password: string): string {
  return `Basic ${base64Encode(`${username}:${password}`)}`;
}

// ============================================
// Hook 实现
// ============================================

export function useEKPIntegration() {
  const [config, setConfig] = useState<EKPConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载保存的配置
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedConfig = localStorage.getItem(EKP_CONFIG_KEY);
      if (savedConfig) {
        try {
          const parsed = JSON.parse(savedConfig);
          setConfig(parsed);
          if (parsed.enabled && parsed.username && parsed.password) {
            setIsConnected(true);
          }
        } catch {
          // ignore parse error
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

  // 构建认证头
  const getAuthHeaders = useCallback((): Record<string, string> => {
    return {
      'Authorization': getBasicAuthHeader(config.username, config.password),
      'Content-Type': 'application/json',
    };
  }, [config.username, config.password]);

  // 测试连接
  const testConnection = useCallback(async (testConfig?: EKPConfig): Promise<boolean> => {
    const targetConfig = testConfig || config;

    if (!targetConfig.enabled || !targetConfig.baseUrl) {
      setError('EKP地址未配置');
      return false;
    }

    if (!targetConfig.username || !targetConfig.password) {
      setError('请输入用户名和密码');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 测试多个可能的用户信息接口
      const testUrls = [
        `${targetConfig.baseUrl}/sys/user/getUserInfo`,
        `${targetConfig.baseUrl}/sys/user/personInfo`,
        `${targetConfig.baseUrl}/sys/organization/sysOrgElement/getUserInfo`,
        // 尝试直接访问流程服务
        `${targetConfig.baseUrl}${targetConfig.apiPrefix}`,
      ];

      const headers = {
        'Authorization': getBasicAuthHeader(targetConfig.username, targetConfig.password),
        'Content-Type': 'application/json',
      };

      let connected = false;
      let successUrl = '';

      for (const url of testUrls) {
        try {
          const response = await fetch(url, {
            method: 'GET',
            headers,
          });
          
          // 只要不是404或网络错误就算连接成功
          if (response.ok || response.status === 401 || response.status === 403) {
            connected = true;
            successUrl = url;
            break;
          }
        } catch {
          continue;
        }
      }

      if (connected) {
        setIsConnected(true);
        if (testConfig) {
          saveConfig(testConfig);
        }
        return true;
      }

      setError('无法连接到EKP系统，请检查地址和凭证');
      setIsConnected(false);
      return false;
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
    if (!config.enabled || !config.baseUrl) {
      setError('EKP配置未启用');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 蓝凌EKP流程启动REST API
      const apiUrl = `${config.baseUrl}${config.apiPrefix}kmReviewRestService`;

      const requestBody = {
        // 表单数据
        fdId: config.leaveFormId || 'LT_LEAVE_PERSONAL',
        // 请假信息
        docSubject: `${leaveData.leaveType}申请 - ${leaveData.startDate}至${leaveData.endDate}`,
        fdLeaveType: LEAVE_TYPE_MAP[leaveData.leaveType] || leaveData.leaveType,
        fdStartDate: leaveData.startDate,
        fdEndDate: leaveData.endDate,
        fdDuration: leaveData.duration,
        fdReason: leaveData.reason,
        fdContactPhone: leaveData.contactPhone || '',
        // 审批人
        approverId: leaveData.approverId || '',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`创建失败: HTTP ${response.status} ${errorText}`);
      }

      const result = await response.json().catch(() => ({}));

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
  }, [config, getAuthHeaders]);

  // 创建报销表单
  const createExpenseForm = useCallback(async (expenseData: ExpenseRequest): Promise<ExpenseFormResult | null> => {
    if (!config.enabled || !config.baseUrl) {
      setError('EKP配置未启用');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = `${config.baseUrl}${config.apiPrefix}kmReviewRestService`;

      const requestBody = {
        fdId: config.expenseFormId || 'LT_EXPENSE',
        docSubject: `${expenseData.expenseType}报销 - ¥${expenseData.amount}`,
        fdExpenseType: EXPENSE_TYPE_MAP[expenseData.expenseType] || expenseData.expenseType,
        fdAmount: expenseData.amount,
        fdDescription: expenseData.description,
        fdExpenseDate: expenseData.expenseDate,
        fdProjectName: expenseData.projectName || '',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`创建失败: HTTP ${response.status} ${errorText}`);
      }

      const result = await response.json().catch(() => ({}));

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
  }, [config, getAuthHeaders]);

  // 查询请假记录
  const queryLeaveRecords = useCallback(async (filters?: {
    status?: 'pending' | 'approved' | 'rejected';
    startDate?: string;
    endDate?: string;
  }): Promise<LeaveFormResult[]> => {
    if (!config.enabled || !config.baseUrl) {
      return [];
    }

    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);

      const apiUrl = `${config.baseUrl}${config.apiPrefix}kmReviewRestService/list?${params.toString()}`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        return [];
      }

      const result = await response.json().catch(() => ({}));
      return result.data || [];
    } catch (err) {
      console.error('查询请假记录失败:', err);
      return [];
    }
  }, [config, getAuthHeaders]);

  // 清除连接
  const disconnect = useCallback(() => {
    setIsConnected(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(EKP_TOKEN_KEY);
    }
  }, []);

  return {
    // 状态
    config,
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
    getAuthHeaders,
  };
}

// ============================================
// 意图识别工具函数
// ============================================

export interface ParsedLeaveIntent {
  isLeaveIntent: boolean;
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  duration?: number;
  reason?: string;
}

export function parseLeaveIntent(userInput: string): ParsedLeaveIntent {
  const result: ParsedLeaveIntent = { isLeaveIntent: false };

  const leaveKeywords = ['请假', '休息', '休假', '离开'];
  if (!leaveKeywords.some(k => userInput.includes(k))) {
    return result;
  }

  result.isLeaveIntent = true;

  const leaveTypes = ['事假', '病假', '年假', '婚假', '产假', '陪产假', '丧假'];
  for (const type of leaveTypes) {
    if (userInput.includes(type)) {
      result.leaveType = type;
      break;
    }
  }
  result.leaveType = result.leaveType || '年假';

  const today = new Date();

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

  const durationMatch = userInput.match(/(\d+)\s*(天|日|周|半天|小时)/);
  if (durationMatch) {
    const value = parseInt(durationMatch[1], 10);
    const unit = durationMatch[2];
    if (unit === '天' || unit === '日') result.duration = value;
    else if (unit === '周') result.duration = value * 7;
    else if (unit === '半天') result.duration = 0.5;
    else if (unit === '小时') result.duration = value / 8;
  }

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
