'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Link2,
  Bot,
  Globe,
  Webhook,
  Plus,
  Settings,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Loader2,
  Database,
  Users,
  Bell,
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'connected' | 'disconnected' | 'pending';
  type: 'erp' | 'im' | 'ai' | 'custom';
  features: string[];
  lastActivity?: string;
  managePath: string;
}

interface Activity {
  id: string;
  type: 'sync' | 'alert' | 'config' | 'test';
  title: string;
  description: string;
  system: string;
  time: string;
  status: 'success' | 'failed' | 'info';
}

export default function IntegrationOverviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    connected: 0,
    pending: 0,
    failed: 0,
  });

  // 模拟数据，实际应从API获取
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);

  useEffect(() => {
    // 模拟加载数据
    setTimeout(() => {
      setIntegrations([
        {
          id: 'ekp',
          name: '蓝凌EKP',
          description: '企业协同办公平台',
          icon: <Building2 className="w-8 h-8" />,
          status: 'connected',
          type: 'erp',
          features: ['组织架构同步', '待办查询', '审批流程', '接口管理'],
          lastActivity: '10分钟前',
          managePath: '/admin/integration/ekp',
        },
        {
          id: 'dingtalk',
          name: '钉钉',
          description: '企业通讯与协作平台',
          icon: <Link2 className="w-8 h-8" />,
          status: 'pending',
          type: 'im',
          features: ['组织架构同步', '消息推送', '考勤对接'],
          managePath: '/admin/integration/dingtalk',
        },
        {
          id: 'wechat',
          name: '企业微信',
          description: '企业级通讯与管理工具',
          icon: <Globe className="w-8 h-8" />,
          status: 'disconnected',
          type: 'im',
          features: ['组织架构同步', '消息推送'],
          managePath: '/admin/integration/wechat',
        },
      ]);

      setRecentActivities([
        {
          id: '1',
          type: 'sync',
          title: 'EKP组织架构同步完成',
          description: '新增12条, 更新5条, 删除0条',
          system: '蓝凌EKP',
          time: '10分钟前',
          status: 'success',
        },
        {
          id: '2',
          type: 'alert',
          title: '同步延迟告警',
          description: 'EKP同步任务超过30分钟未完成',
          system: '蓝凌EKP',
          time: '1小时前',
          status: 'failed',
        },
        {
          id: '3',
          type: 'config',
          title: 'EKP连接配置已更新',
          description: '更新了API地址和认证信息',
          system: '蓝凌EKP',
          time: '2小时前',
          status: 'info',
        },
        {
          id: '4',
          type: 'test',
          title: 'EKP接口测试成功',
          description: '待办查询接口调用正常',
          system: '蓝凌EKP',
          time: '3小时前',
          status: 'success',
        },
      ]);

      setStats({
        total: 3,
        connected: 1,
        pending: 1,
        failed: 1,
      });

      setLoading(false);
    }, 500);
  }, []);

  const getStatusBadge = (status: Integration['status']) => {
    const config = {
      connected: { variant: 'default' as const, label: '已连接', className: 'bg-green-100 text-green-800' },
      disconnected: { variant: 'secondary' as const, label: '未连接', className: 'bg-gray-100 text-gray-800' },
      pending: { variant: 'outline' as const, label: '待配置', className: 'bg-yellow-100 text-yellow-800' },
    };
    const c = config[status];
    return (
      <Badge className={c.className}>
        {status === 'connected' && <CheckCircle className="w-3 h-3 mr-1" />}
        {status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
        {status === 'disconnected' && <AlertCircle className="w-3 h-3 mr-1" />}
        {c.label}
      </Badge>
    );
  };

  const getActivityIcon = (type: Activity['type']) => {
    const icons = {
      sync: <RefreshCw className="w-4 h-4" />,
      alert: <Bell className="w-4 h-4" />,
      config: <Settings className="w-4 h-4" />,
      test: <CheckCircle className="w-4 h-4" />,
    };
    return icons[type];
  };

  const getActivityStatusColor = (status: Activity['status']) => {
    const colors = {
      success: 'text-green-500',
      failed: 'text-red-500',
      info: 'text-blue-500',
    };
    return colors[status];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">集成概览</h1>
          <p className="text-muted-foreground mt-1">管理第三方系统集成和配置</p>
        </div>
        <Button variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          新增集成
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">已集成系统</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">已连接</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.connected}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">待配置</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">未连接</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 已集成系统 */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">已集成系统</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {integrations.map(integration => (
              <Card 
                key={integration.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(integration.managePath)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        integration.status === 'connected' ? 'bg-green-100 text-green-600' :
                        integration.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {integration.icon}
                      </div>
                      <div>
                        <CardTitle className="text-base">{integration.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{integration.description}</p>
                      </div>
                    </div>
                    {getStatusBadge(integration.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1">
                      {integration.features.map((feature, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                    {integration.lastActivity && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">最后活动</span>
                        <span>{integration.lastActivity}</span>
                      </div>
                    )}
                    <Button variant="outline" size="sm" className="w-full">
                      管理
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* 新增集成卡片 */}
            <Card className="border-dashed cursor-pointer hover:border-primary transition-colors">
              <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-foreground">
                <Plus className="w-8 h-8 mb-2" />
                <span>新增集成</span>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 最近活动 */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">最近活动</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {recentActivities.map(activity => (
                  <div key={activity.id} className="flex gap-3 pb-4 border-b last:border-0 last:pb-0">
                    <div className={`mt-0.5 ${getActivityStatusColor(activity.status)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{activity.title}</span>
                        <span className="text-xs text-muted-foreground">{activity.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{activity.description}</p>
                      <Badge variant="outline" className="text-xs mt-1">{activity.system}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 快速入口 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/admin/scheduler/tasks')}>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-sm">定时任务</CardTitle>
              <p className="text-xs text-muted-foreground">管理定时任务</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/admin/monitor/alerts')}>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-sm">监控告警</CardTitle>
              <p className="text-xs text-muted-foreground">查看告警信息</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/admin/integration/llm')}>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-sm">AI服务配置</CardTitle>
              <p className="text-xs text-muted-foreground">配置大模型</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/admin/organization/structure')}>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-sm">组织架构</CardTitle>
              <p className="text-xs text-muted-foreground">管理组织结构</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
