'use client';

import { useState, useEffect } from 'react';
import {
  Building2,
  FileText,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  User,
  ChevronRight,
  MessageSquare,
  Zap,
} from 'lucide-react';
import { useEKPIntegration, LEAVE_TYPE_MAP, EXPENSE_TYPE_MAP } from '@/hooks/use-ekp-integration';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

// ============================================
// 请假申请表单
// ============================================

function LeaveRequestForm({
  onSubmit,
  isLoading,
}: {
  onSubmit: (data: {
    leaveType: string;
    startDate: string;
    endDate: string;
    duration: number;
    reason: string;
    contactPhone?: string;
  }) => Promise<void>;
  isLoading: boolean;
}) {
  const [leaveType, setLeaveType] = useState('年假');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [duration, setDuration] = useState(1);
  const [reason, setReason] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const calculateDuration = () => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setDuration(diffDays);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      leaveType,
      startDate,
      endDate,
      duration,
      reason,
      contactPhone,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>请假类型</Label>
          <Select value={leaveType} onValueChange={setLeaveType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LEAVE_TYPE_MAP).map(([name]) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>请假时长（天）</Label>
          <Input
            type="number"
            min="0.5"
            step="0.5"
            value={duration}
            onChange={(e) => setDuration(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>开始日期</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              calculateDuration();
            }}
          />
        </div>

        <div className="space-y-2">
          <Label>结束日期</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              calculateDuration();
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>请假原因</Label>
        <Textarea
          placeholder="请输入请假原因..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>联系方式（可选）</Label>
        <Input
          type="tel"
          placeholder="紧急联系电话"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading || !startDate || !endDate}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            提交中...
          </>
        ) : (
          <>
            <FileText className="mr-2 h-4 w-4" />
            提交请假申请
          </>
        )}
      </Button>
    </form>
  );
}

// ============================================
// 报销申请表单
// ============================================

function ExpenseRequestForm({
  onSubmit,
  isLoading,
}: {
  onSubmit: (data: {
    expenseType: string;
    amount: number;
    description: string;
    expenseDate: string;
    projectName?: string;
  }) => Promise<void>;
  isLoading: boolean;
}) {
  const [expenseType, setExpenseType] = useState('差旅');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [projectName, setProjectName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      expenseType,
      amount: parseFloat(amount),
      description,
      expenseDate,
      projectName,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>费用类型</Label>
          <Select value={expenseType} onValueChange={setExpenseType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(EXPENSE_TYPE_MAP).map(([name]) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>金额（元）</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>发生日期</Label>
        <Input
          type="date"
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>所属项目（可选）</Label>
        <Input
          placeholder="请输入项目名称"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>费用说明</Label>
        <Textarea
          placeholder="请详细描述费用用途..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading || !amount || !expenseDate}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            提交中...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            提交报销申请
          </>
        )}
      </Button>
    </form>
  );
}

// ============================================
// 申请记录卡片
// ============================================

function ApplicationCard({
  type,
  title,
  status,
  date,
  approver,
  processId,
}: {
  type: 'leave' | 'expense';
  title: string;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  approver: string;
  processId: string;
}) {
  const statusConfig = {
    pending: { label: '审批中', color: 'text-yellow-600 bg-yellow-50', icon: Clock },
    approved: { label: '已通过', color: 'text-green-600 bg-green-50', icon: CheckCircle2 },
    rejected: { label: '已驳回', color: 'text-red-600 bg-red-50', icon: AlertCircle },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${type === 'leave' ? 'bg-blue-50' : 'bg-purple-50'}`}>
              {type === 'leave' ? (
                <Calendar className="h-4 w-4 text-blue-600" />
              ) : (
                <CreditCard className="h-4 w-4 text-purple-600" />
              )}
            </div>
            <div className="space-y-1">
              <p className="font-medium">{title}</p>
              <p className="text-xs text-muted-foreground">单号: {processId}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {date}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {approver}
                </span>
              </div>
            </div>
          </div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${config.color}`}>
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// 快速操作卡片
// ============================================

function QuickActionCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// 主组件
// ============================================

export default function EKPAgent() {
  const {
    config,
    createLeaveForm,
    createExpenseForm,
    error,
    isLoading,
  } = useEKPIntegration();

  const [activeTab, setActiveTab] = useState('quick');
  const [submitResult, setSubmitResult] = useState<{
    type: 'success' | 'error';
    message: string;
    data?: { processId: string; dataId: string };
  } | null>(null);

  const handleLeaveSubmit = async (data: {
    leaveType: string;
    startDate: string;
    endDate: string;
    duration: number;
    reason: string;
    contactPhone?: string;
  }) => {
    setSubmitResult(null);

    const result = await createLeaveForm({
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      duration: data.duration,
      reason: data.reason,
      contactPhone: data.contactPhone,
    });

    if (result) {
      setSubmitResult({
        type: 'success',
        message: `请假申请已提交成功！`,
        data: { processId: result.processId, dataId: result.dataId },
      });
      toast.success('请假申请已提交');
    } else if (error) {
      setSubmitResult({
        type: 'error',
        message: error,
      });
      toast.error(error);
    }
  };

  const handleExpenseSubmit = async (data: {
    expenseType: string;
    amount: number;
    description: string;
    expenseDate: string;
    projectName?: string;
  }) => {
    setSubmitResult(null);

    const result = await createExpenseForm({
      expenseType: data.expenseType,
      amount: data.amount,
      description: data.description,
      expenseDate: data.expenseDate,
      projectName: data.projectName,
    });

    if (result) {
      setSubmitResult({
        type: 'success',
        message: `报销申请已提交成功！`,
        data: { processId: result.processId, dataId: result.dataId },
      });
      toast.success('报销申请已提交');
    } else if (error) {
      setSubmitResult({
        type: 'error',
        message: error,
      });
      toast.error(error);
    }
  };

  // 未配置状态 - 提示用户去设置中配置
  if (!config.enabled) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">蓝凌EKP 智能助手</h2>
          <p className="text-muted-foreground mb-6">
            连接企业EKP系统，通过自然语言快速提交请假、报销等申请，自动发起审批流程
          </p>
          <p className="text-sm text-muted-foreground">
            请先在侧边栏「设置」中配置蓝凌EKP连接
          </p>
        </div>
      </div>
    );
  }

  // 已配置状态
  return (
    <div className="h-full flex flex-col">
      {/* 头部 */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">蓝凌EKP 智能助手</h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className={`w-2 h-2 rounded-full ${!!config.baseUrl ? 'bg-green-500' : 'bg-red-500'}`} />
                <span>{!!config.baseUrl ? '已连接' : '未连接'}</span>
                <span>|</span>
                <span>{config.baseUrl}</span>
                <span>|</span>
                <span>服务: {config.apiPrefix}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="quick" className="gap-2">
              <Zap className="h-4 w-4" />
              快捷申请
            </TabsTrigger>
            <TabsTrigger value="leave" className="gap-2">
              <Calendar className="h-4 w-4" />
              请假申请
            </TabsTrigger>
            <TabsTrigger value="expense" className="gap-2">
              <CreditCard className="h-4 w-4" />
              报销申请
            </TabsTrigger>
            <TabsTrigger value="records" className="gap-2">
              <FileText className="h-4 w-4" />
              申请记录
            </TabsTrigger>
          </TabsList>

          {/* 快捷申请 */}
          <TabsContent value="quick" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  自然语言申请
                </CardTitle>
                <CardDescription>
                  输入您的需求，AI将自动解析并创建申请
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    在左侧「新对话」中直接说出您的需求
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <span className="px-3 py-1 bg-primary/10 rounded-full text-xs">
                      "我想请5天年假"
                    </span>
                    <span className="px-3 py-1 bg-primary/10 rounded-full text-xs">
                      "报销200元差旅费"
                    </span>
                    <span className="px-3 py-1 bg-primary/10 rounded-full text-xs">
                      "下周一到周五请假"
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <QuickActionCard
                icon={Calendar}
                title="请假申请"
                description="年假/病假/事假"
                onClick={() => setActiveTab('leave')}
              />
              <QuickActionCard
                icon={CreditCard}
                title="报销申请"
                description="差旅/交通/餐饮"
                onClick={() => setActiveTab('expense')}
              />
            </div>

            {/* 提交结果 */}
            {submitResult && (
              <Card className={submitResult.type === 'success' ? 'border-green-500' : 'border-red-500'}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {submitResult.type === 'success' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={submitResult.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                        {submitResult.message}
                      </p>
                      {submitResult.data && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          <p>流程ID: {submitResult.data.processId}</p>
                          <p>数据ID: {submitResult.data.dataId}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 请假申请 */}
          <TabsContent value="leave">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">请假申请表单</CardTitle>
                <CardDescription>
                  填写请假信息，系统将自动提交至EKP审批流程
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LeaveRequestForm
                  onSubmit={handleLeaveSubmit}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* 报销申请 */}
          <TabsContent value="expense">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">报销申请表单</CardTitle>
                <CardDescription>
                  填写报销信息，系统将自动提交至EKP审批流程
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ExpenseRequestForm
                  onSubmit={handleExpenseSubmit}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* 申请记录 */}
          <TabsContent value="records">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">我的申请记录</CardTitle>
                    <CardDescription>查看所有已提交的请假和报销申请</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    刷新
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <ApplicationCard
                    type="leave"
                    title="年假 3天"
                    status="pending"
                    date="2024-01-15"
                    approver="张经理"
                    processId="PROC202401001"
                  />
                  <ApplicationCard
                    type="expense"
                    title="差旅费 ¥1,580.00"
                    status="approved"
                    date="2024-01-10"
                    approver="李总监"
                    processId="PROC202401002"
                  />
                  <ApplicationCard
                    type="leave"
                    title="病假 1天"
                    status="rejected"
                    date="2024-01-05"
                    approver="王主管"
                    processId="PROC202401003"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
