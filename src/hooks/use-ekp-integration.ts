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
  /** REST服务路径，如 /api/km-review/kmReviewRestService */
  apiPath: string;
  /** 服务标识 */
  serviceId: string;
  /** 请假表单模板ID */
  leaveTemplateId: string;
  /** 报销表单模板ID */
  expenseTemplateId: string;
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
  apiPath: '/api/km-review/kmReviewRestService',
  serviceId: 'kmReviewRestService',
  leaveTemplateId: '',
  expenseTemplateId: '',
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

  // 测试连接（通过后端代理，使用 REST + Basic Auth）
  const testConnection = useCallback(async (testConfig?: EKPConfig): Promise<boolean> => {
    const targetConfig = testConfig || config;

    if (!targetConfig.baseUrl) {
      setError('请输入 EKP 系统地址');
      return false;
    }

    if (!targetConfig.username || !targetConfig.password) {
      setError('请输入用户名和密码');
      return false;
    }

    if (!targetConfig.apiPath) {
      setError('请输入访问路径');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 通过后端代理发送 REST 请求
      const response = await fetch('/api/ekp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          baseUrl: targetConfig.baseUrl,
          username: targetConfig.username,
          password: targetConfig.password,
          apiPath: targetConfig.apiPath,
          serviceId: targetConfig.serviceId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIsConnected(true);
        if (testConfig) {
          saveConfig(testConfig);
        }
        return true;
      }

      setError(result.message || '连接失败');
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

  // 创建请假表单（通过 REST + Basic Auth）
  const createLeaveForm = useCallback(async (leaveData: LeaveRequest): Promise<LeaveFormResult | null> => {
    if (!config.enabled || !config.baseUrl) {
      setError('EKP配置未启用');
      return null;
    }

    if (!config.username || !config.password) {
      setError('请配置用户名和密码');
      return null;
    }

    if (!config.apiPath) {
      setError('请配置访问路径');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 构建表单数据
      const formValues = {
        fdLeaveType: LEAVE_TYPE_MAP[leaveData.leaveType] || leaveData.leaveType,
        fdStartDate: leaveData.startDate,
        fdEndDate: leaveData.endDate,
        fdDuration: String(leaveData.duration),
        fdReason: leaveData.reason,
        fdContactPhone: leaveData.contactPhone || '',
      };

      // 通过后端代理发送 REST 请求
      const response = await fetch('/api/ekp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addReview',
          baseUrl: config.baseUrl,
          username: config.username,
          password: config.password,
          apiPath: config.apiPath,
          serviceId: config.serviceId,
          templateId: config.leaveTemplateId,
          data: {
            docSubject: `${leaveData.leaveType}申请 - ${leaveData.startDate}至${leaveData.endDate}`,
            docContent: leaveData.reason,
            formValues: formValues,
          },
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || '创建失败');
      }

      return {
        processId: result.data?.processId || result.data || '',
        dataId: result.data?.dataId || '',
        taskId: '',
        currentNode: '审批中',
        nextApprover: '待指定',
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
  }, [config]);

  // 创建报销表单（通过 REST + Basic Auth）
  const createExpenseForm = useCallback(async (expenseData: ExpenseRequest): Promise<ExpenseFormResult | null> => {
    if (!config.enabled || !config.baseUrl) {
      setError('EKP配置未启用');
      return null;
    }

    if (!config.username || !config.password) {
      setError('请配置用户名和密码');
      return null;
    }

    if (!config.apiPath) {
      setError('请配置访问路径');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 构建表单数据
      const formValues = {
        fdExpenseType: EXPENSE_TYPE_MAP[expenseData.expenseType] || expenseData.expenseType,
        fdAmount: String(expenseData.amount),
        fdDescription: expenseData.description,
        fdExpenseDate: expenseData.expenseDate,
        fdProjectName: expenseData.projectName || '',
      };

      // 通过后端代理发送 REST 请求
      const response = await fetch('/api/ekp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addReview',
          baseUrl: config.baseUrl,
          username: config.username,
          password: config.password,
          apiPath: config.apiPath,
          serviceId: config.serviceId,
          templateId: config.expenseTemplateId,
          data: {
            docSubject: `${expenseData.expenseType}报销 - ¥${expenseData.amount}`,
            docContent: expenseData.description,
            formValues: formValues,
          },
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || '创建失败');
      }

      return {
        processId: result.data?.processId || result.data || '',
        dataId: result.data?.dataId || '',
        taskId: '',
        currentNode: '审批中',
        nextApprover: '待指定',
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
  }, [config]);

  // 查询请假记录（暂不支持）
  const queryLeaveRecords = useCallback(async (): Promise<LeaveFormResult[]> => {
    // TODO: 需要通过其他 SOAP 接口实现
    return [];
  }, []);

  // 清除连接
  const disconnect = useCallback(() => {
    setIsConnected(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(EKP_TOKEN_KEY);
    }
  }, []);

  return {
    config,
    isLoading,
    isConnected,
    error,
    saveConfig,
    testConnection,
    disconnect,
    createLeaveForm,
    createExpenseForm,
    queryLeaveRecords,
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
