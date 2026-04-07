/**
 * EKP 审批客户端适配器
 * 用于审批Agent调用EKP审批接口
 */

import { EKPRestClient, EKPConfig, EKPResponse } from './ekp-rest-client';
import { dbManager } from './database/manager';

// 审批类型
export enum ApprovalType {
  LEAVE = 'leave',                    // 请假
  REIMBURSEMENT = 'reimbursement',    // 报销
  PURCHASE = 'purchase',              // 采购
  EXPENSE_REPORT = 'expense_report',  // 费用报销
}

// 审批表单模板
export interface ApprovalFormTemplate {
  templateId: string;
  templateName: string;
  fields: ApprovalFormField[];
}

export interface ApprovalFormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  required: boolean;
  defaultValue?: unknown;
  options?: string[];  // 用于select类型
}

// 审批表单数据
export interface ApprovalFormData {
  templateId: string;
  subject: string;
  formValues: Record<string, unknown>;
  applicantId: string;
  deptId: string;
}

// 审批流程节点
export interface ApprovalFlowNode {
  nodeId: string;
  nodeName: string;
  nodeType: 'dept_manager' | 'finance' | 'hr' | 'admin' | 'custom';
  handlerId?: string;
  handlerName?: string;
}

// 审批流程定义
export interface ApprovalFlow {
  flowId: string;
  flowName: string;
  nodes: ApprovalFlowNode[];
  allowAutoApprove: boolean;
  autoApproveAmount: number;
}

// 审批发起结果
export interface LaunchApprovalResult {
  requestId: string;
  docId: string;
  status: 'pending' | 'auto_approved' | 'rejected';
  message: string;
}

// 审批进度
export interface ApprovalProgress {
  requestId: string;
  docId: string;
  status: string;
  currentNode: ApprovalFlowNode;
  currentNodeStatus: 'pending' | 'approved' | 'rejected';
  history: ApprovalHistoryItem[];
  timeoutNodes: ApprovalFlowNode[];
}

export interface ApprovalHistoryItem {
  nodeId: string;
  nodeName: string;
  status: 'approved' | 'rejected' | 'pending';
  handlerId?: string;
  handlerName?: string;
  comment?: string;
  time: string;
}

// 审批纪要
export interface ApprovalMinutes {
  requestId: string;
  summary: string;
  content: string;
  approvedAt?: string;
  participants: string[];
}

/**
 * EKP 审批客户端
 */
export class EKPApprovalClient {
  private client: EKPRestClient | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // 不在构造函数中初始化，改为延迟初始化
  }

  /**
   * 确保客户端已初始化
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }

    await this.initPromise;
  }

  /**
   * 初始化EKP客户端
   */
  private async initialize(): Promise<void> {
    try {
      const config = await this.loadEKPConfig();
      if (config) {
        this.client = new EKPRestClient(config);
        console.log('[EKPApprovalClient] 初始化成功');
      } else {
        console.warn('[EKPApprovalClient] 未找到EKP配置，客户端将使用模拟模式');
      }
      this.initialized = true;
    } catch (error) {
      console.error('[EKPApprovalClient] 初始化失败:', error);
      this.initialized = true;
    }
  }

  /**
   * 从数据库加载EKP配置
   */
  private async loadEKPConfig(): Promise<EKPConfig | null> {
    try {
      const result = await dbManager.query(`
        SELECT ekp_address, username, password, auth_type, config
        FROM ekp_configs
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        console.warn('[EKPApprovalClient] 未找到EKP配置');
        return null;
      }

      const config = result.rows[0] as any;

      // 从config JSON字段中提取配置
      let extraConfig: Record<string, unknown> = {};
      if (config.config) {
        try {
          extraConfig = typeof config.config === 'string' ? JSON.parse(config.config) : config.config;
        } catch (e) {
          console.warn('[EKPApprovalClient] 解析config字段失败:', e);
          extraConfig = {};
        }
      }

      return {
        baseUrl: config.ekp_address,
        username: config.username,
        password: config.password,
        apiPath: (extraConfig.apiPath as string) || '/api/sys-notify/sysNotifyTodoRestService/getTodo',
        serviceId: (extraConfig.serviceId as string) || 'approval-agent',
        enabled: (extraConfig.enabled as boolean) !== false,
      };
    } catch (error) {
      console.error('[EKPApprovalClient] 加载EKP配置失败:', error);
      return null;
    }
  }

  /**
   * 获取审批表单模板
   */
  async getFormTemplate(approvalType: ApprovalType): Promise<ApprovalFormTemplate> {
    await this.ensureInitialized();

    // 根据审批类型返回表单模板
    const templates: Record<ApprovalType, ApprovalFormTemplate> = {
      [ApprovalType.LEAVE]: {
        templateId: 'FORM_LEAVE',
        templateName: '请假申请表',
        fields: [
          { name: 'leaveType', label: '请假类型', type: 'select', required: true, options: ['年假', '事假', '病假', '调休'] },
          { name: 'startTime', label: '开始时间', type: 'date', required: true },
          { name: 'endTime', label: '结束时间', type: 'date', required: true },
          { name: 'days', label: '请假天数', type: 'number', required: true },
          { name: 'reason', label: '请假原因', type: 'textarea', required: true },
        ],
      },
      [ApprovalType.REIMBURSEMENT]: {
        templateId: 'FORM_REIMBURSEMENT',
        templateName: '费用报销表',
        fields: [
          { name: 'expenseType', label: '费用类型', type: 'select', required: true, options: ['差旅费', '办公费', '招待费', '其他'] },
          { name: 'amount', label: '报销金额', type: 'number', required: true },
          { name: 'description', label: '费用说明', type: 'textarea', required: true },
          { name: 'receiptCount', label: '附件数量', type: 'number', required: false },
        ],
      },
      [ApprovalType.PURCHASE]: {
        templateId: 'FORM_PURCHASE',
        templateName: '采购申请表',
        fields: [
          { name: 'itemName', label: '采购物品', type: 'text', required: true },
          { name: 'quantity', label: '采购数量', type: 'number', required: true },
          { name: 'unitPrice', label: '单价', type: 'number', required: true },
          { name: 'totalAmount', label: '总金额', type: 'number', required: true },
          { name: 'reason', label: '采购原因', type: 'textarea', required: true },
        ],
      },
      [ApprovalType.EXPENSE_REPORT]: {
        templateId: 'FORM_EXPENSE_REPORT',
        templateName: '费用报销单',
        fields: [
          { name: 'reportDate', label: '报销日期', type: 'date', required: true },
          { name: 'amount', label: '报销金额', type: 'number', required: true },
          { name: 'description', label: '费用描述', type: 'textarea', required: true },
        ],
      },
    };

    const template = templates[approvalType];
    if (!template) {
      throw new Error(`不支持的审批类型: ${approvalType}`);
    }

    return template;
  }

  /**
   * 匹配审批流程
   */
  async matchFlow(approvalType: ApprovalType, amount: number, deptId: string): Promise<ApprovalFlow> {
    await this.ensureInitialized();

    // 根据类型、金额、部门动态匹配流程
    let nodes: ApprovalFlowNode[] = [];

    if (approvalType === ApprovalType.PURCHASE) {
      // 采购审批
      if (amount <= 5000) {
        nodes = [
          { nodeId: 'node1', nodeName: '部门主管', nodeType: 'dept_manager' },
          { nodeId: 'node2', nodeName: '财务审批', nodeType: 'finance' },
        ];
      } else if (amount <= 20000) {
        nodes = [
          { nodeId: 'node1', nodeName: '部门主管', nodeType: 'dept_manager' },
          { nodeId: 'node2', nodeName: '财务审批', nodeType: 'finance' },
          { nodeId: 'node3', nodeName: '分管领导', nodeType: 'admin' },
        ];
      } else {
        nodes = [
          { nodeId: 'node1', nodeName: '部门主管', nodeType: 'dept_manager' },
          { nodeId: 'node2', nodeName: '财务审批', nodeType: 'finance' },
          { nodeId: 'node3', nodeName: '分管领导', nodeType: 'admin' },
          { nodeId: 'node4', nodeName: '总经理', nodeType: 'admin' },
        ];
      }
    } else if (approvalType === ApprovalType.LEAVE) {
      // 请假审批
      nodes = [
        { nodeId: 'node1', nodeName: '部门主管', nodeType: 'dept_manager' },
      ];
    } else if (approvalType === ApprovalType.REIMBURSEMENT || approvalType === ApprovalType.EXPENSE_REPORT) {
      // 报销审批
      if (amount <= 2000) {
        nodes = [
          { nodeId: 'node1', nodeName: '部门主管', nodeType: 'dept_manager' },
        ];
      } else if (amount <= 5000) {
        nodes = [
          { nodeId: 'node1', nodeName: '部门主管', nodeType: 'dept_manager' },
          { nodeId: 'node2', nodeName: '财务审批', nodeType: 'finance' },
        ];
      } else {
        nodes = [
          { nodeId: 'node1', nodeName: '部门主管', nodeType: 'dept_manager' },
          { nodeId: 'node2', nodeName: '财务审批', nodeType: 'finance' },
          { nodeId: 'node3', nodeName: '分管领导', nodeType: 'admin' },
        ];
      }
    } else {
      // 默认流程
      nodes = [
        { nodeId: 'node1', nodeName: '部门主管', nodeType: 'dept_manager' },
      ];
    }

    return {
      flowId: `FLOW_${approvalType.toUpperCase()}_${amount}`,
      flowName: `${approvalType}审批流程`,
      nodes,
      allowAutoApprove: amount <= 5000,
      autoApproveAmount: 5000,
    };
  }

  /**
   * 发起审批
   */
  async launchApproval(
    formData: ApprovalFormData,
    flowNodes: ApprovalFlowNode[],
    userId: string
  ): Promise<LaunchApprovalResult> {
    await this.ensureInitialized();

    const requestId = `REQ_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // TODO: 调用EKP REST接口发起审批
    // 这里需要根据EKP的实际接口实现
    // 示例：await this.client.post('/api/approval/launch', { formData, flowNodes, userId });

    // 模拟返回
    return {
      requestId,
      docId: `DOC_${Date.now()}`,
      status: 'pending',
      message: '审批已发起',
    };
  }

  /**
   * 自动审批
   */
  async autoApprove(requestId: string, userId: string): Promise<{ success: boolean; status: string }> {
    await this.ensureInitialized();

    // TODO: 调用EKP REST接口自动审批
    // 这里需要根据EKP的实际接口实现
    // 示例：await this.client.post('/api/approval/approve', { requestId, userId, action: 'approve' });

    // 模拟返回
    return {
      success: true,
      status: 'auto_approved',
    };
  }

  /**
   * 查询审批进度
   */
  async getProgress(requestId: string, userId: string): Promise<ApprovalProgress> {
    await this.ensureInitialized();

    // TODO: 调用EKP REST接口查询进度
    // 这里需要根据EKP的实际接口实现
    // 示例：await this.client.get(`/api/approval/progress/${requestId}`);

    // 模拟返回
    return {
      requestId,
      docId: `DOC_${Date.now()}`,
      status: 'pending',
      currentNode: {
        nodeId: 'node1',
        nodeName: '部门主管',
        nodeType: 'dept_manager',
      },
      currentNodeStatus: 'pending',
      history: [
        {
          nodeId: 'node0',
          nodeName: '发起人',
          status: 'approved',
          handlerId: userId,
          handlerName: '申请人',
          time: new Date().toISOString(),
        },
      ],
      timeoutNodes: [],
    };
  }

  /**
   * 生成审批纪要
   */
  async generateMinutes(requestId: string): Promise<ApprovalMinutes> {
    await this.ensureInitialized();

    // TODO: 调用EKP REST接口生成纪要
    // 这里需要根据EKP的实际接口实现

    // 模拟返回
    return {
      requestId,
      summary: `审批单 ${requestId} 已完成`,
      content: `审批单 ${requestId} 于 ${new Date().toLocaleString()} 完成，审批流程正常结束。`,
      approvedAt: new Date().toISOString(),
      participants: ['申请人', '部门主管'],
    };
  }

  /**
   * 同步数据
   */
  async syncData(requestId: string, approvalType: ApprovalType): Promise<{ syncStatus: string; syncedItems: Record<string, boolean> }> {
    await this.ensureInitialized();

    // TODO: 根据审批类型同步数据到EKP
    // 例如：请假同步到考勤系统，报销同步到财务系统

    const syncedItems: Record<string, boolean> = {};
    if (approvalType === ApprovalType.LEAVE) {
      syncedItems.attendance = true;
    } else if (approvalType === ApprovalType.REIMBURSEMENT || approvalType === ApprovalType.EXPENSE_REPORT) {
      syncedItems.expense = true;
    } else if (approvalType === ApprovalType.PURCHASE) {
      syncedItems.inventory = true;
    }

    return {
      syncStatus: 'done',
      syncedItems,
    };
  }
}

// 导出单例
export const ekpApprovalClient = new EKPApprovalClient();
