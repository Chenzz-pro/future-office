'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Play,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  TrendingUp,
  Users,
  Building,
  Settings,
  AlertTriangle,
  XCircle
} from 'lucide-react';

interface SyncStatus {
  isRunning: boolean;
  runningSync: any;
  lastSync: any;
}

interface SyncSystemStatus {
  initialized: boolean;
  initializing: boolean;
  schedulerRunning: boolean;
  monitorRunning: boolean;
  schedulerStatus: {
    isRunning: boolean;
    incrementalTaskRunning: boolean;
    fullSyncTaskRunning: boolean;
    monitorTaskRunning: boolean;
    incrementalRetryCount: number;
    fullSyncRetryCount: number;
  };
  monitorStatus: {
    isRunning: boolean;
    alertCount: number;
    historyCount: number;
    config: any;
  };
}

interface SyncLog {
  id: string;
  sync_type: string;
  sync_mode: string;
  status: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  total_count: number;
  org_count: number;
  dept_count: number;
  post_count: number;
  group_count: number;
  person_count: number;
  insert_count: number;
  update_count: number;
  delete_count: number;
  error_count: number;
  error_message: string | null;
  triggered_by: string;
  operator_name: string | null;
}

interface Alert {
  id: string;
  level: string;
  type: string;
  message: string;
  createdAt: string;
  sent: boolean;
}

export default function OrgSyncPage() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [systemStatus, setSystemStatus] = useState<SyncSystemStatus | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedLog, setSelectedLog] = useState<SyncLog | null>(null);
  const [selectedLogDetails, setSelectedLogDetails] = useState<any[]>([]);
  const [isFullSyncDialogOpen, setIsFullSyncDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingType, setSyncingType] = useState<'full' | 'incremental' | null>(null);
  const [stats, setStats] = useState({
    totalSyncs: 0,
    successRate: 0,
    avgDuration: 0,
    lastSyncTime: null as string | null
  });

  // 加载数据
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // 每30秒刷新一次
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 并行加载所有数据
      const [statusRes, systemRes, logsRes, alertsRes] = await Promise.all([
        fetch('/api/org-sync?action=status'),
        fetch('/api/admin/sync-system?action=status'),
        fetch('/api/org-sync/logs?page=1&pageSize=20'),
        fetch('/api/admin/sync-system?action=alerts')
      ]);

      const [status, system, logs, alertData] = await Promise.all([
        statusRes.json(),
        systemRes.json(),
        logsRes.json(),
        alertsRes.json()
      ]);

      if (status.success) {
        setSyncStatus(status.data);
      }
      if (system.success) {
        setSystemStatus(system.data);
      }
      if (logs.success) {
        setSyncLogs(logs.data.list || []);
        calculateStats(logs.data.list || []);
      }
      if (alertData.success) {
        setAlerts(alertData.data || []);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (logs: SyncLog[]) => {
    const completedLogs = logs.filter(log => log.status === 'completed');
    const totalSyncs = completedLogs.length;
    const successCount = completedLogs.filter(log => log.error_count === 0).length;
    const successRate = totalSyncs > 0 ? Math.round((successCount / totalSyncs) * 100) : 0;
    const avgDuration = totalSyncs > 0
      ? Math.round(completedLogs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0) / totalSyncs)
      : 0;
    const lastSyncTime = logs.length > 0 ? logs[0].start_time : null;

    setStats({
      totalSyncs,
      successRate,
      avgDuration,
      lastSyncTime
    });
  };

  const triggerSync = async (syncType: 'full' | 'incremental') => {
    setSyncing(true);
    setSyncingType(syncType);
    try {
      const response = await fetch('/api/org-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          syncType,
          operatorId: 'admin',
          operatorName: '管理员'
        })
      });

      const result = await response.json();
      if (result.success) {
        // 等待一段时间后刷新数据
        setTimeout(loadData, 2000);
      }
    } catch (error) {
      console.error('触发同步失败:', error);
    } finally {
      setSyncing(false);
      setSyncingType(null);
    }
  };

  const viewLogDetails = async (logId: string) => {
    try {
      const response = await fetch(`/api/org-sync/logs/${logId}?details=true`);
      const result = await response.json();
      if (result.success) {
        setSelectedLogDetails(result.data);
        setSelectedLog(syncLogs.find(log => log.id === logId) || null);
      }
    } catch (error) {
      console.error('获取日志详情失败:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; icon: any }> = {
      running: { variant: 'secondary', label: '运行中', icon: Activity },
      completed: { variant: 'default', label: '已完成', icon: CheckCircle },
      failed: { variant: 'destructive', label: '失败', icon: XCircle },
      cancelled: { variant: 'outline', label: '已取消', icon: Clock }
    };
    const config = statusMap[status] || { variant: 'outline', label: status, icon: AlertCircle };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getSyncTypeLabel = (type: string) => {
    return type === 'full' ? '全量同步' : '增量同步';
  };

  const getAlertLevelBadge = (level: string) => {
    const levelMap: Record<string, { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
      info: { variant: 'default', label: '信息' },
      warning: { variant: 'secondary', label: '警告' },
      error: { variant: 'destructive', label: '错误' },
      critical: { variant: 'destructive', label: '严重' }
    };
    const config = levelMap[level] || { variant: 'outline', label: level };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
    return `${Math.floor(seconds / 3600)}小时${Math.floor((seconds % 3600) / 60)}分`;
  };

  const formatTime = (time: string) => {
    return new Date(time).toLocaleString('zh-CN');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">组织架构同步管理</h1>
          <p className="text-muted-foreground mt-2">管理蓝凌EKP组织架构同步任务</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => loadData()}
            variant="outline"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 同步状态卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">总同步次数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSyncs}</div>
            <div className="text-xs text-muted-foreground mt-1">历史总计</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">成功率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.successRate}%</div>
            <div className="text-xs text-muted-foreground mt-1">
              {syncLogs.filter(log => log.status === 'completed' && log.error_count === 0).length}/{syncLogs.filter(log => log.status === 'completed').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">平均耗时</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(stats.avgDuration)}</div>
            <div className="text-xs text-muted-foreground mt-1">每次同步</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">上次同步时间</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {stats.lastSyncTime ? new Date(stats.lastSyncTime).toLocaleDateString('zh-CN') : '-'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.lastSyncTime ? formatTime(stats.lastSyncTime) : '从未同步'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 系统状态 */}
      <Card>
        <CardHeader>
          <CardTitle>系统状态</CardTitle>
          <CardDescription>同步系统运行状态</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${systemStatus?.initialized ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="text-sm font-medium">初始化状态</span>
              </div>
              <p className="text-xs text-muted-foreground ml-5">
                {systemStatus?.initialized ? '已初始化' : '未初始化'}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${systemStatus?.schedulerRunning ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="text-sm font-medium">定时任务</span>
              </div>
              <p className="text-xs text-muted-foreground ml-5">
                {systemStatus?.schedulerRunning ? '运行中' : '已停止'}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${systemStatus?.monitorRunning ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="text-sm font-medium">监控服务</span>
              </div>
              <p className="text-xs text-muted-foreground ml-5">
                {systemStatus?.monitorRunning ? '运行中' : '已停止'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 告警信息 */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>告警信息</CardTitle>
            <CardDescription>当前活跃的告警</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <Alert key={alert.id} variant={alert.level === 'critical' ? 'destructive' : 'default'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="flex items-center gap-2">
                    {getAlertLevelBadge(alert.level)}
                    <span>{alert.message}</span>
                  </AlertTitle>
                  <AlertDescription>
                    时间: {new Date(alert.createdAt).toLocaleString('zh-CN')}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="sync">
        <TabsList>
          <TabsTrigger value="sync">同步操作</TabsTrigger>
          <TabsTrigger value="logs">同步历史</TabsTrigger>
          <TabsTrigger value="monitor">监控告警</TabsTrigger>
        </TabsList>

        <TabsContent value="sync" className="space-y-4">
          {/* 当前同步状态 */}
          {syncStatus?.isRunning && syncStatus?.runningSync && (
            <Alert>
              <Activity className="h-4 w-4 animate-pulse" />
              <AlertTitle>同步任务正在运行</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1">
                  <p><strong>同步类型:</strong> {getSyncTypeLabel(syncStatus.runningSync.sync_type)}</p>
                  <p><strong>开始时间:</strong> {formatTime(syncStatus.runningSync.start_time)}</p>
                  <p><strong>已运行:</strong> {formatDuration(Math.floor((new Date().getTime() - new Date(syncStatus.runningSync.start_time).getTime()) / 1000))}</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* 同步操作按钮 */}
          <Card>
            <CardHeader>
              <CardTitle>手动触发同步</CardTitle>
              <CardDescription>手动触发全量同步或增量同步</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button
                  onClick={() => triggerSync('incremental')}
                  disabled={syncing || syncStatus?.isRunning}
                  className="flex-1"
                >
                  <Play className="w-4 h-4 mr-2" />
                  增量同步
                </Button>
                <Button
                  onClick={() => setIsFullSyncDialogOpen(true)}
                  disabled={syncing || syncStatus?.isRunning}
                  variant="outline"
                  className="flex-1"
                >
                  <Play className="w-4 h-4 mr-2" />
                  全量同步
                </Button>
              </div>
              {syncing && (
                <div className="text-sm text-muted-foreground text-center">
                  正在执行{syncingType === 'full' ? '全量' : '增量'}同步...
                </div>
              )}
            </CardContent>
          </Card>

          {/* 定时任务配置 */}
          {systemStatus?.schedulerStatus && (
            <Card>
              <CardHeader>
                <CardTitle>定时任务状态</CardTitle>
                <CardDescription>当前定时任务的配置和运行状态</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">增量同步任务</span>
                    <Badge variant={systemStatus.schedulerStatus.incrementalTaskRunning ? 'default' : 'secondary'}>
                      {systemStatus.schedulerStatus.incrementalTaskRunning ? '运行中' : '已停止'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground ml-4">
                    每30分钟执行一次（重试次数: {systemStatus.schedulerStatus.incrementalRetryCount}）
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">全量同步任务</span>
                    <Badge variant={systemStatus.schedulerStatus.fullSyncTaskRunning ? 'default' : 'secondary'}>
                      {systemStatus.schedulerStatus.fullSyncTaskRunning ? '运行中' : '已停止'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground ml-4">
                    每月1号凌晨2点执行（重试次数: {systemStatus.schedulerStatus.fullSyncRetryCount}）
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">监控任务</span>
                    <Badge variant={systemStatus.schedulerStatus.monitorTaskRunning ? 'default' : 'secondary'}>
                      {systemStatus.schedulerStatus.monitorTaskRunning ? '运行中' : '已停止'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground ml-4">
                    每5分钟检查一次同步状态
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>同步历史</CardTitle>
              <CardDescription>最近的同步记录</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>同步类型</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>开始时间</TableHead>
                      <TableHead>耗时</TableHead>
                      <TableHead>处理数据</TableHead>
                      <TableHead>增/改/删</TableHead>
                      <TableHead>操作人</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{getSyncTypeLabel(log.sync_type)}</TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell>{formatTime(log.start_time)}</TableCell>
                        <TableCell>{formatDuration(log.duration_seconds)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2 text-xs">
                            <span title="机构">🏢{log.org_count}</span>
                            <span title="部门">🏢{log.dept_count}</span>
                            <span title="岗位">👤{log.post_count}</span>
                            <span title="人员">👥{log.person_count}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 text-xs">
                            <span className="text-green-600">+{log.insert_count}</span>
                            <span className="text-blue-600">~{log.update_count}</span>
                            <span className="text-red-600">-{log.delete_count}</span>
                          </div>
                        </TableCell>
                        <TableCell>{log.operator_name || log.triggered_by}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewLogDetails(log.id)}
                          >
                            详情
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>监控告警</CardTitle>
              <CardDescription>系统监控和告警信息</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alerts.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    <p>暂无告警信息</p>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <Alert key={alert.id} variant={alert.level === 'critical' ? 'destructive' : 'default'}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle className="flex items-center gap-2">
                        {getAlertLevelBadge(alert.level)}
                        <span>{alert.message}</span>
                      </AlertTitle>
                      <AlertDescription>
                        <div className="mt-2 space-y-1">
                          <p>时间: {new Date(alert.createdAt).toLocaleString('zh-CN')}</p>
                          <p>类型: {alert.type}</p>
                          {alert.sent && <p className="text-green-600">✓ 已发送通知</p>}
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 同步日志详情对话框 */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>同步日志详情</DialogTitle>
            <DialogDescription>
              {selectedLog && `ID: ${selectedLog.id}`}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">同步类型</label>
                  <p className="text-sm text-muted-foreground">{getSyncTypeLabel(selectedLog.sync_type)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">状态</label>
                  <p>{getStatusBadge(selectedLog.status)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">开始时间</label>
                  <p className="text-sm text-muted-foreground">{formatTime(selectedLog.start_time)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">结束时间</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedLog.end_time ? formatTime(selectedLog.end_time) : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">耗时</label>
                  <p className="text-sm text-muted-foreground">{formatDuration(selectedLog.duration_seconds)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">操作人</label>
                  <p className="text-sm text-muted-foreground">{selectedLog.operator_name || selectedLog.triggered_by}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">数据统计</label>
                <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedLog.total_count}</div>
                    <div className="text-xs text-muted-foreground">总数据</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{selectedLog.insert_count}</div>
                    <div className="text-xs text-muted-foreground">新增</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{selectedLog.update_count}</div>
                    <div className="text-xs text-muted-foreground">更新</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{selectedLog.delete_count}</div>
                    <div className="text-xs text-muted-foreground">删除</div>
                  </div>
                </div>
              </div>

              {selectedLog.error_message && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>错误信息</AlertTitle>
                  <AlertDescription>{selectedLog.error_message}</AlertDescription>
                </Alert>
              )}

              {selectedLogDetails.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">同步明细（前20条）</label>
                  <div className="max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>类型</TableHead>
                          <TableHead>EKP ID</TableHead>
                          <TableHead>名称</TableHead>
                          <TableHead>操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedLogDetails.slice(0, 20).map((detail) => (
                          <TableRow key={detail.id}>
                            <TableCell>{detail.data_type}</TableCell>
                            <TableCell className="font-mono text-xs">{detail.ekp_id}</TableCell>
                            <TableCell>{detail.ekp_name || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={
                                detail.action === 'insert' ? 'default' :
                                detail.action === 'update' ? 'secondary' :
                                detail.action === 'delete' ? 'destructive' :
                                detail.action === 'error' ? 'destructive' : 'outline'
                              }>
                                {detail.action}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 全量同步确认对话框 */}
      <Dialog open={isFullSyncDialogOpen} onOpenChange={setIsFullSyncDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认全量同步</DialogTitle>
            <DialogDescription>
              全量同步会对比EKP系统和本地系统的所有组织架构数据，可能需要较长时间。
              是否继续？
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsFullSyncDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={() => {
                setIsFullSyncDialogOpen(false);
                triggerSync('full');
              }}
            >
              确认同步
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
