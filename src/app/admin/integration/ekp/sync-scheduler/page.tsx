'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Clock,
  Calendar,
  RefreshCw,
  Settings,
  Info
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface SchedulerConfig {
  incremental: {
    enabled: boolean;
    interval: number;
    startTime: string;
  };
  full: {
    enabled: boolean;
    interval: number;
    startTime: string;
    dayOfMonth: number;
  };
  monitor: {
    enabled: boolean;
    interval: number;
    startTime: string;
  };
}

interface SchedulerStatus {
  isRunning: boolean;
  incrementalTaskRunning: boolean;
  fullSyncTaskRunning: boolean;
  monitorTaskRunning: boolean;
  incrementalRetryCount: number;
  fullSyncRetryCount: number;
}

export default function SyncSchedulerPage() {
  const [config, setConfig] = useState<SchedulerConfig | null>(null);
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 加载数据
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [configRes, statusRes] = await Promise.all([
        fetch('/api/admin/sync-scheduler/config'),
        fetch('/api/admin/sync-system?action=scheduler-status')
      ]);

      const [configData, statusData] = await Promise.all([
        configRes.json(),
        statusRes.json()
      ]);

      if (configData.success) {
        setConfig(configData.data);
      }
      if (statusData.success) {
        setStatus(statusData.data);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (taskType: keyof SchedulerConfig, newConfig: any) => {
    if (!config) return;

    setSaving(true);
    try {
      const response = await fetch('/api/admin/sync-scheduler/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskType,
          config: newConfig
        })
      });

      const result = await response.json();
      if (result.success) {
        setConfig(result.data);
        await loadData();
      }
    } catch (error) {
      console.error('更新配置失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleTask = (taskType: keyof SchedulerConfig) => {
    if (!config) return;
    updateConfig(taskType, {
      ...config[taskType],
      enabled: !config[taskType].enabled
    });
  };

  const updateInterval = (taskType: keyof SchedulerConfig, value: number) => {
    if (!config) return;
    updateConfig(taskType, {
      ...config[taskType],
      interval: value
    });
  };

  const updateStartTime = (taskType: keyof SchedulerConfig, value: string) => {
    if (!config) return;
    updateConfig(taskType, {
      ...config[taskType],
      startTime: value
    });
  };

  const updateDayOfMonth = (taskType: keyof SchedulerConfig, value: number) => {
    if (!config) return;
    updateConfig(taskType, {
      ...config[taskType],
      dayOfMonth: value
    });
  };

  const getCronExpression = (taskType: keyof SchedulerConfig) => {
    if (!config) return '';

    const taskConfig = config[taskType];
    if (taskType === 'incremental') {
      // 每 N 分钟: */{interval} * * * *
      return `*/${taskConfig.interval} * * * *`;
    } else if (taskType === 'full') {
      // 每月N号X点: 0 {hour} {day} * *
      const hour = parseInt(taskConfig.startTime.split(':')[0], 10);
      const day = (taskConfig as any).dayOfMonth || 1;
      return `0 ${hour} ${day} * *`;
    } else if (taskType === 'monitor') {
      // 每 N 分钟: */{interval} * * * *
      return `*/${taskConfig.interval} * * * *`;
    }
    return '';
  };

  const getNextRunTime = (taskType: keyof SchedulerConfig) => {
    // 简化的下次执行时间计算
    if (!config || !config[taskType].enabled) return '-';

    const taskConfig = config[taskType];
    if (taskType === 'full') {
      const day = (taskConfig as any).dayOfMonth || 1;
      return `每月${day}号 ${taskConfig.startTime}`;
    } else if (taskType === 'incremental' || taskType === 'monitor') {
      return `每${taskConfig.interval}分钟执行一次`;
    }
    return '-';
  };

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">定时任务配置</h1>
          <p className="text-muted-foreground mt-2">配置组织架构同步的定时任务</p>
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

      {/* 调度器状态 */}
      <Card>
        <CardHeader>
          <CardTitle>调度器状态</CardTitle>
          <CardDescription>定时任务调度器的运行状态</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${status?.isRunning ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="text-sm font-medium">调度器状态</span>
              </div>
              <p className="text-xs text-muted-foreground ml-5">
                {status?.isRunning ? '运行中' : '已停止'}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${status?.incrementalTaskRunning ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="text-sm font-medium">增量同步任务</span>
              </div>
              <p className="text-xs text-muted-foreground ml-5">
                {status?.incrementalTaskRunning ? '运行中' : '已停止'}
                {status && status.incrementalRetryCount > 0 && ` (重试: ${status.incrementalRetryCount})`}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${status?.fullSyncTaskRunning ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="text-sm font-medium">全量同步任务</span>
              </div>
              <p className="text-xs text-muted-foreground ml-5">
                {status?.fullSyncTaskRunning ? '运行中' : '已停止'}
                {status && status.fullSyncRetryCount > 0 && ` (重试: ${status.fullSyncRetryCount})`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>提示</AlertTitle>
        <AlertDescription>
          修改定时任务配置后，需要重启调度器才能生效。建议在业务低峰期修改配置。
        </AlertDescription>
      </Alert>

      {/* 增量同步任务 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                增量同步任务
              </CardTitle>
              <CardDescription>
                定时从EKP系统获取增量变更数据并同步
              </CardDescription>
            </div>
            <Switch
              checked={config.incremental.enabled}
              onCheckedChange={() => toggleTask('incremental')}
              disabled={saving}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>执行频率（分钟）</Label>
              <Select
                value={config.incremental.interval.toString()}
                onValueChange={(value) => updateInterval('incremental', parseInt(value, 10))}
                disabled={saving || !config.incremental.enabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 分钟</SelectItem>
                  <SelectItem value="15">15 分钟</SelectItem>
                  <SelectItem value="30">30 分钟</SelectItem>
                  <SelectItem value="60">60 分钟</SelectItem>
                  <SelectItem value="120">120 分钟</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                每隔 {config.incremental.interval} 分钟执行一次
              </p>
            </div>

            <div className="space-y-2">
              <Label>Cron 表达式</Label>
              <Input
                value={getCronExpression('incremental')}
                readOnly
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                下次执行: {getNextRunTime('incremental')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 全量同步任务 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                全量同步任务
              </CardTitle>
              <CardDescription>
                定期从EKP系统获取全部组织架构数据
              </CardDescription>
            </div>
            <Switch
              checked={config.full.enabled}
              onCheckedChange={() => toggleTask('full')}
              disabled={saving}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>执行时间</Label>
              <Input
                type="time"
                value={config.full.startTime}
                onChange={(e) => updateStartTime('full', e.target.value)}
                disabled={saving || !config.full.enabled}
              />
              <p className="text-xs text-muted-foreground">
                每天的执行时间点
              </p>
            </div>

            <div className="space-y-2">
              <Label>每月执行日期</Label>
              <Select
                value={(config.full as any).dayOfMonth?.toString() || '1'}
                onValueChange={(value) => updateDayOfMonth('full', parseInt(value, 10))}
                disabled={saving || !config.full.enabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {i + 1}号
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                每月{(config.full as any).dayOfMonth || 1}号执行
              </p>
            </div>

            <div className="space-y-2">
              <Label>Cron 表达式</Label>
              <Input
                value={getCronExpression('full')}
                readOnly
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                下次执行: {getNextRunTime('full')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 监控任务 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                监控任务
              </CardTitle>
              <CardDescription>
                定时检查同步系统的健康状态和告警
              </CardDescription>
            </div>
            <Switch
              checked={config.monitor.enabled}
              onCheckedChange={() => toggleTask('monitor')}
              disabled={saving}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>检查频率（分钟）</Label>
              <Select
                value={config.monitor.interval.toString()}
                onValueChange={(value) => updateInterval('monitor', parseInt(value, 10))}
                disabled={saving || !config.monitor.enabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 分钟</SelectItem>
                  <SelectItem value="5">5 分钟</SelectItem>
                  <SelectItem value="10">10 分钟</SelectItem>
                  <SelectItem value="15">15 分钟</SelectItem>
                  <SelectItem value="30">30 分钟</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                每隔 {config.monitor.interval} 分钟检查一次
              </p>
            </div>

            <div className="space-y-2">
              <Label>Cron 表达式</Label>
              <Input
                value={getCronExpression('monitor')}
                readOnly
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                下次执行: {getNextRunTime('monitor')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex gap-4">
        <Button
          onClick={async () => {
            try {
              const response = await fetch('/api/admin/sync-system', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'restart' })
              });
              const result = await response.json();
              if (result.success) {
                alert('调度器已重启，新配置已生效');
                await loadData();
              } else {
                alert('重启失败: ' + result.message);
              }
            } catch (error) {
              alert('重启失败');
            }
          }}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          重启调度器（应用新配置）
        </Button>

        <Button
          variant="outline"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新状态
        </Button>
      </div>
    </div>
  );
}
