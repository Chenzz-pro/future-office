'use client';

import { useState, useEffect } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle,
  CheckCircle,
  Info,
  AlertOctagon,
  Bell,
  Trash2,
  CheckSquare,
  RefreshCw,
  Eye
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface AlertItem {
  id: string;
  alert_type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  details: string;
  created_at: string;
  is_resolved: boolean;
  resolved_at: string | null;
  is_read: boolean;
  is_cleared: boolean;
  cleared_at: string | null;
}

interface AlertStats {
  total: number;
  critical: number;
  warning: number;
  info: number;
  byType: Array<{
    alert_type: string;
    severity: string;
    count: number;
  }>;
}

export default function SyncAlertsPage() {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [activeAlerts, setActiveAlerts] = useState<AlertItem[]>([]);
  const [historyAlerts, setHistoryAlerts] = useState<AlertItem[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [activeRes, historyRes] = await Promise.all([
        fetch('/api/admin/sync-alerts?type=active'),
        fetch('/api/admin/sync-alerts?type=history&limit=50')
      ]);

      const [activeData, historyData] = await Promise.all([
        activeRes.json(),
        historyRes.json()
      ]);

      if (activeData.success) {
        setActiveAlerts(activeData.data);
        setStats(activeData.stats);
      }
      if (historyData.success) {
        setHistoryAlerts(historyData.data);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAll = (alerts: AlertItem[]) => {
    if (selectedIds.size === alerts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(alerts.map(a => a.id)));
    }
  };

  const markAsRead = async () => {
    if (selectedIds.size === 0) return;

    try {
      const response = await fetch('/api/admin/sync-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark-read',
          ids: Array.from(selectedIds)
        })
      });

      const result = await response.json();
      if (result.success) {
        setSelectedIds(new Set());
        await loadData();
      }
    } catch (error) {
      console.error('标记失败:', error);
    }
  };

  const resolveAlerts = async () => {
    if (selectedIds.size === 0) return;

    try {
      const response = await fetch('/api/admin/sync-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve',
          ids: Array.from(selectedIds)
        })
      });

      const result = await response.json();
      if (result.success) {
        setSelectedIds(new Set());
        await loadData();
      }
    } catch (error) {
      console.error('解决失败:', error);
    }
  };

  const clearAlerts = async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(`确定要清除选中的 ${selectedIds.size} 条告警吗？`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/sync-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clear',
          ids: Array.from(selectedIds)
        })
      });

      const result = await response.json();
      if (result.success) {
        setSelectedIds(new Set());
        await loadData();
      }
    } catch (error) {
      console.error('清除失败:', error);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertOctagon className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'info':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '严重';
      case 'warning':
        return '警告';
      case 'info':
        return '信息';
      default:
        return severity;
    }
  };

  const getAlertTypeText = (type: string) => {
    const types: Record<string, string> = {
      'sync_failure': '同步失败',
      'data_anomaly': '数据异常',
      'sync_delay': '同步延迟',
      'sync_timeout': '同步超时',
      'ekp_connection_error': 'EKP连接错误'
    };
    return types[type] || type;
  };

  const renderAlertTable = (alerts: AlertItem[], isHistory: boolean = false) => {
    const currentAlerts = alerts;
    const allSelected = selectedIds.size === currentAlerts.length && currentAlerts.length > 0;

    return (
      <div className="space-y-4">
        {/* 操作按钮 */}
        {selectedIds.size > 0 && (
          <div className="flex gap-2 p-4 bg-muted rounded-lg">
            <span className="text-sm flex items-center mr-4">
              已选择 {selectedIds.size} 条告警
            </span>
            {!isHistory && (
              <>
                <Button size="sm" onClick={markAsRead}>
                  <CheckSquare className="w-4 h-4 mr-2" />
                  标记已读
                </Button>
                <Button size="sm" variant="outline" onClick={resolveAlerts}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  标记已解决
                </Button>
              </>
            )}
            <Button size="sm" variant="destructive" onClick={clearAlerts}>
              <Trash2 className="w-4 h-4 mr-2" />
              清除
            </Button>
          </div>
        )}

        {/* 告警表格 */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => toggleAll(currentAlerts)}
                    className="cursor-pointer"
                  />
                </TableHead>
                <TableHead>严重程度</TableHead>
                <TableHead>告警类型</TableHead>
                <TableHead>消息</TableHead>
                <TableHead>详情</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentAlerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    暂无告警记录
                  </TableCell>
                </TableRow>
              ) : (
                currentAlerts.map((alert) => (
                  <TableRow key={alert.id} className={!alert.is_read ? 'bg-blue-50/50' : ''}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(alert.id)}
                        onChange={() => toggleSelection(alert.id)}
                        className="cursor-pointer"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(alert.severity)}
                        <Badge className={getSeverityColor(alert.severity)}>
                          {getSeverityText(alert.severity)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{getAlertTypeText(alert.alert_type)}</TableCell>
                    <TableCell className="max-w-md truncate">
                      {alert.message}
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {alert.details}
                    </TableCell>
                    <TableCell>
                      {alert.is_resolved ? (
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          已解决
                        </Badge>
                      ) : (
                        <Badge variant="outline">未解决</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(alert.created_at).toLocaleString('zh-CN')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">监控告警</h1>
          <p className="text-muted-foreground mt-2">查看和管理同步系统的告警信息</p>
        </div>
        <Button
          onClick={loadData}
          variant="outline"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>总告警数</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-red-500" />
                严重告警
              </CardDescription>
              <CardTitle className="text-2xl text-red-600">{stats.critical}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                警告告警
              </CardDescription>
              <CardTitle className="text-2xl text-yellow-600">{stats.warning}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-500" />
                信息告警
              </CardDescription>
              <CardTitle className="text-2xl text-blue-600">{stats.info}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>告警说明</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong>同步失败</strong>: 同步过程中出现错误，可能需要手动处理</li>
            <li><strong>数据异常</strong>: 同步数据量异常增长或减少</li>
            <li><strong>同步延迟</strong>: 同步时间超过预期阈值</li>
            <li><strong>同步超时</strong>: 同步操作超时，可能需要检查网络或EKP系统状态</li>
            <li><strong>EKP连接错误</strong>: 无法连接到EKP系统，需要检查网络配置</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Tab 切换 */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="active">
            <Bell className="w-4 h-4 mr-2" />
            活跃告警
            {stats && stats.total > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">
            <Eye className="w-4 h-4 mr-2" />
            告警历史
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {renderAlertTable(activeAlerts)}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {renderAlertTable(historyAlerts, true)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
