'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  Eye,
  Bell,
  BellOff,
} from 'lucide-react';
import {
  Alert,
  AlertLevel,
  AlertType,
  ALERT_LEVEL_LABELS,
  ALERT_TYPE_LABELS,
  ALERT_LEVEL_COLORS,
  AlertStats,
} from '@/lib/monitor/types';

export default function MonitorAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [updating, setUpdating] = useState<string | null>(null);

  // 加载告警列表
  const loadAlerts = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/monitor/alerts', window.location.origin);
      url.searchParams.set('limit', '100');
      if (statusFilter !== 'all') {
        url.searchParams.set('status', statusFilter);
      }
      if (levelFilter !== 'all') {
        url.searchParams.set('level', levelFilter);
      }
      
      const response = await fetch(url.toString());
      const data = await response.json();
      if (data.success) {
        setAlerts(data.data);
      }
    } catch (error) {
      console.error('加载告警失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载统计
  const loadStats = async () => {
    try {
      const response = await fetch('/api/monitor/alerts?action=stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('加载统计失败:', error);
    }
  };

  useEffect(() => {
    loadAlerts();
    loadStats();
    
    // 定时刷新活跃告警
    const interval = setInterval(() => {
      if (statusFilter === 'active') {
        loadAlerts();
      }
      loadStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [statusFilter, levelFilter]);

  // 更新告警状态
  const handleUpdateStatus = async (id: string, status: 'acknowledged' | 'resolved') => {
    setUpdating(id);
    try {
      const response = await fetch('/api/monitor/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateStatus', id, status }),
      });
      const data = await response.json();
      if (data.success) {
        loadAlerts();
        loadStats();
      }
    } catch (error) {
      console.error('更新状态失败:', error);
    } finally {
      setUpdating(null);
    }
  };

  const getLevelBadge = (level: AlertLevel) => {
    const colors = ALERT_LEVEL_COLORS[level];
    const variantMap: Record<string, 'default' | 'destructive' | 'outline' | 'secondary'> = {
      blue: 'default',
      red: 'destructive',
      yellow: 'outline',
      purple: 'secondary',
    };
    return (
      <Badge variant={variantMap[colors] || 'default'} className={`bg-${colors}-100 text-${colors}-800`}>
        {ALERT_LEVEL_LABELS[level]}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">告警中心</h1>
          <p className="text-muted-foreground mt-1">监控和管理系统告警</p>
        </div>
        <Button variant="outline" onClick={() => { loadAlerts(); loadStats(); }} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
          刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">活跃告警</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">已确认</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.acknowledged}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">已解决</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">总计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 过滤条件 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="active">活跃</SelectItem>
                  <SelectItem value="acknowledged">已确认</SelectItem>
                  <SelectItem value="resolved">已解决</SelectItem>
                  <SelectItem value="muted">已静默</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="级别筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部级别</SelectItem>
                  <SelectItem value="critical">严重</SelectItem>
                  <SelectItem value="error">错误</SelectItem>
                  <SelectItem value="warning">警告</SelectItem>
                  <SelectItem value="info">信息</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 告警列表 */}
      <Card>
        <CardHeader>
          <CardTitle>告警列表 ({alerts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>级别</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>告警标题</TableHead>
                <TableHead>来源</TableHead>
                <TableHead>关联系统</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : alerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    暂无告警记录
                  </TableCell>
                </TableRow>
              ) : (
                alerts.map(alert => (
                  <TableRow key={alert.id}>
                    <TableCell>{getLevelBadge(alert.level)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ALERT_TYPE_LABELS[alert.type] || alert.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{alert.title}</div>
                        {alert.message && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {alert.message}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {alert.source ? (
                        <Badge variant="secondary">{alert.source}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {alert.relatedSystem ? (
                        <Badge variant="outline">{alert.relatedSystem}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          alert.status === 'active' ? 'destructive' :
                          alert.status === 'acknowledged' ? 'outline' :
                          alert.status === 'resolved' ? 'secondary' : 'secondary'
                        }
                        className={
                          alert.status === 'active' ? 'bg-red-100 text-red-800' :
                          alert.status === 'acknowledged' ? 'bg-yellow-100 text-yellow-800' :
                          alert.status === 'resolved' ? 'bg-green-100 text-green-800' : ''
                        }
                      >
                        {alert.status === 'active' ? '活跃' :
                         alert.status === 'acknowledged' ? '已确认' :
                         alert.status === 'resolved' ? '已解决' : '已静默'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(alert.createdAt).toLocaleString('zh-CN')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {alert.status === 'active' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUpdateStatus(alert.id, 'acknowledged')}
                              disabled={updating === alert.id}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUpdateStatus(alert.id, 'resolved')}
                              disabled={updating === alert.id}
                            >
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            </Button>
                          </>
                        )}
                        {alert.status === 'acknowledged' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUpdateStatus(alert.id, 'resolved')}
                            disabled={updating === alert.id}
                          >
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
