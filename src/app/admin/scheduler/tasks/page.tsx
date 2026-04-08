'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Play,
  Pause,
  Trash2,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  TaskType,
  TaskStatus,
  TaskGroup,
  TASK_TYPE_LABELS,
  TASK_GROUP_LABELS,
  TASK_STATUS_LABELS,
  CRON_TEMPLATES,
  ScheduledTask,
  TaskStats,
} from '@/lib/scheduler/types';

interface TaskWithStats extends ScheduledTask {
  stats?: TaskStats;
}

export default function SchedulerTasksPage() {
  const [tasks, setTasks] = useState<TaskWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithStats | null>(null);
  
  // 统计数据
  const [stats, setStats] = useState({
    totalTasks: 0,
    enabledTasks: 0,
    runningTasks: 0,
    todayExecutions: 0,
    todaySuccess: 0,
    todayFailed: 0,
  });

  // 创建/编辑表单
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: TaskType.CUSTOM,
    group: TaskGroup.CUSTOM,
    enabled: true,
    scheduleType: 'cron' as 'cron' | 'interval',
    cronExpression: '*/5 * * * *',
    intervalMinutes: 5,
    relatedSystem: '',
    handlerConfig: {
      handlerType: 'api' as 'api' | 'function' | 'script',
      handlerPath: '',
      parameters: {} as Record<string, unknown>,
    },
  });

  // 加载任务列表
  const loadTasks = async () => {
    try {
      const response = await fetch('/api/scheduler/tasks');
      const data = await response.json();
      if (data.success) {
        setTasks(data.data);
      }
    } catch (error) {
      console.error('加载任务失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载统计
  const loadStats = async () => {
    try {
      const response = await fetch('/api/scheduler/status');
      const data = await response.json();
      if (data.success) {
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('加载统计失败:', error);
    }
  };

  useEffect(() => {
    loadTasks();
    loadStats();
    
    // 定时刷新
    const interval = setInterval(() => {
      loadTasks();
      loadStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // 手动触发任务
  const handleTrigger = async (taskId: string) => {
    setActionLoading(taskId);
    try {
      const response = await fetch('/api/scheduler/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger', taskId }),
      });
      const data = await response.json();
      if (data.success) {
        alert('任务已触发执行');
        loadTasks();
        loadStats();
      } else {
        alert('触发失败: ' + data.error);
      }
    } catch (error) {
      console.error('触发任务失败:', error);
      alert('触发任务失败');
    } finally {
      setActionLoading(null);
    }
  };

  // 启用/禁用任务
  const handleToggle = async (task: TaskWithStats) => {
    setActionLoading(task.id);
    try {
      const response = await fetch('/api/scheduler/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, enabled: !task.enabled }),
      });
      const data = await response.json();
      if (data.success) {
        loadTasks();
        loadStats();
      }
    } catch (error) {
      console.error('切换任务状态失败:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // 删除任务
  const handleDelete = async (taskId: string) => {
    if (!confirm('确定要删除这个任务吗？')) return;
    
    try {
      const response = await fetch(`/api/scheduler/tasks?id=${taskId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        loadTasks();
        loadStats();
      }
    } catch (error) {
      console.error('删除任务失败:', error);
    }
  };

  // 创建/更新任务
  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        cronExpression: formData.scheduleType === 'cron' ? formData.cronExpression : undefined,
        intervalMinutes: formData.scheduleType === 'interval' ? formData.intervalMinutes : undefined,
      };

      const response = await fetch('/api/scheduler/tasks', {
        method: editingTask ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      
      if (data.success) {
        setCreateDialogOpen(false);
        setEditingTask(null);
        resetForm();
        loadTasks();
        loadStats();
      } else {
        alert('保存失败: ' + data.error);
      }
    } catch (error) {
      console.error('保存任务失败:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: TaskType.CUSTOM,
      group: TaskGroup.CUSTOM,
      enabled: true,
      scheduleType: 'cron',
      cronExpression: '*/5 * * * *',
      intervalMinutes: 5,
      relatedSystem: '',
      handlerConfig: {
        handlerType: 'api',
        handlerPath: '',
        parameters: {},
      },
    });
  };

  const openEditDialog = (task: TaskWithStats) => {
    setEditingTask(task);
    setFormData({
      name: task.name,
      description: task.description || '',
      type: task.type,
      group: task.group,
      enabled: task.enabled,
      scheduleType: task.scheduleType === 'interval' ? 'interval' : 'cron',
      cronExpression: task.cronExpression || '*/5 * * * *',
      intervalMinutes: task.intervalMinutes || 5,
      relatedSystem: task.relatedSystem || '',
      handlerConfig: {
        ...task.handlerConfig,
        parameters: task.handlerConfig.parameters || {},
      },
    });
    setCreateDialogOpen(true);
  };

  const getStatusBadge = (status: TaskStatus) => {
    const config: Record<TaskStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; color: string }> = {
      [TaskStatus.PENDING]: { variant: 'secondary', icon: <Clock className="w-3 h-3" />, color: 'text-blue-600 bg-blue-50' },
      [TaskStatus.RUNNING]: { variant: 'default', icon: <Loader2 className="w-3 h-3 animate-spin" />, color: 'text-blue-600 bg-blue-50' },
      [TaskStatus.SUCCESS]: { variant: 'secondary', icon: <CheckCircle className="w-3 h-3" />, color: 'text-green-600 bg-green-50' },
      [TaskStatus.FAILED]: { variant: 'destructive', icon: <XCircle className="w-3 h-3" />, color: 'text-red-600 bg-red-50' },
      [TaskStatus.CANCELLED]: { variant: 'outline', icon: <AlertCircle className="w-3 h-3" />, color: 'text-yellow-600 bg-yellow-50' },
      [TaskStatus.PAUSED]: { variant: 'outline', icon: <Pause className="w-3 h-3" />, color: 'text-gray-600 bg-gray-50' },
    };
    const c = config[status];
    return (
      <Badge variant={c.variant} className={`gap-1 ${c.color}`}>
        {c.icon}
        {TASK_STATUS_LABELS[status]}
      </Badge>
    );
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
          <h1 className="text-2xl font-bold">定时任务</h1>
          <p className="text-muted-foreground mt-1">管理和配置系统定时任务</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { loadTasks(); loadStats(); }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
          <Button onClick={() => { resetForm(); setCreateDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            新建任务
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">总任务数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">已启用</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.enabledTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">运行中</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.runningTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">今日执行</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayExecutions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">成功</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.todaySuccess}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">失败</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.todayFailed}</div>
          </CardContent>
        </Card>
      </div>

      {/* 任务列表 */}
      <Card>
        <CardHeader>
          <CardTitle>任务列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>任务名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>分组</TableHead>
                <TableHead>调度配置</TableHead>
                <TableHead>关联系统</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>最近执行</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    暂无任务，点击&quot;新建任务&quot;创建第一个定时任务
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map(task => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{task.name}</div>
                        {task.description && (
                          <div className="text-sm text-muted-foreground">{task.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{TASK_TYPE_LABELS[task.type]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{TASK_GROUP_LABELS[task.group]}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {task.scheduleType === 'cron' ? (
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">{task.cronExpression}</code>
                        ) : (
                          <span>
                            {task.intervalHours ? `${task.intervalHours}小时` : ''}
                            {task.intervalMinutes ? `${task.intervalMinutes}分钟` : ''}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {task.relatedSystem ? (
                        <Badge variant="outline">{task.relatedSystem}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={task.enabled}
                          onCheckedChange={() => handleToggle(task)}
                          disabled={actionLoading === task.id}
                        />
                        {task.stats?.runningTasks ? (
                          <Badge variant="default" className="gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            运行中
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {task.stats?.lastExecutionAt ? (
                        <div className="text-sm">
                          <div>{new Date(task.stats.lastExecutionAt).toLocaleString('zh-CN')}</div>
                          {task.stats.lastSuccessAt && (
                            <div className="text-xs text-green-600">成功</div>
                          )}
                          {task.stats.lastFailedAt && (
                            <div className="text-xs text-red-600">失败</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">从未执行</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleTrigger(task.id)}
                          disabled={actionLoading === task.id || !task.enabled}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(task)}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(task.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 创建/编辑对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTask ? '编辑任务' : '新建任务'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">任务名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入任务名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">任务类型 *</Label>
                <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v as TaskType })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="group">任务分组 *</Label>
                <Select value={formData.group} onValueChange={v => setFormData({ ...formData, group: v as TaskGroup })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_GROUP_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="relatedSystem">关联系统</Label>
                <Input
                  id="relatedSystem"
                  value={formData.relatedSystem}
                  onChange={e => setFormData({ ...formData, relatedSystem: e.target.value })}
                  placeholder="如: EKP, 钉钉等"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">任务描述</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="请输入任务描述"
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-4">调度配置</h4>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="scheduleCron"
                      checked={formData.scheduleType === 'cron'}
                      onChange={() => setFormData({ ...formData, scheduleType: 'cron' })}
                    />
                    <Label htmlFor="scheduleCron">Cron表达式</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="scheduleInterval"
                      checked={formData.scheduleType === 'interval'}
                      onChange={() => setFormData({ ...formData, scheduleType: 'interval' })}
                    />
                    <Label htmlFor="scheduleInterval">间隔执行</Label>
                  </div>
                </div>

                {formData.scheduleType === 'cron' ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={formData.cronExpression}
                        onChange={e => setFormData({ ...formData, cronExpression: e.target.value })}
                        placeholder="*/5 * * * *"
                        className="font-mono"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {CRON_TEMPLATES.map(template => (
                        <Badge
                          key={template.expression}
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => setFormData({ ...formData, cronExpression: template.expression })}
                        >
                          {template.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>执行间隔</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={formData.intervalMinutes}
                        onChange={e => setFormData({ ...formData, intervalMinutes: parseInt(e.target.value) || 5 })}
                        className="w-24"
                        min={1}
                      />
                      <span>分钟</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-4">执行配置</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="handlerType">处理器类型</Label>
                  <Select 
                    value={formData.handlerConfig.handlerType} 
                    onValueChange={v => setFormData({ 
                      ...formData, 
                      handlerConfig: { ...formData.handlerConfig, handlerType: v as 'api' | 'function' }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="api">API调用</SelectItem>
                      <SelectItem value="function">函数执行</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="handlerPath">处理器路径 *</Label>
                  <Input
                    id="handlerPath"
                    value={formData.handlerConfig.handlerPath}
                    onChange={e => setFormData({ 
                      ...formData, 
                      handlerConfig: { ...formData.handlerConfig, handlerPath: e.target.value }
                    })}
                    placeholder={formData.handlerConfig.handlerType === 'api' ? '/api/xxx' : 'sync:orgSync'}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={v => setFormData({ ...formData, enabled: v })}
              />
              <Label htmlFor="enabled">启用任务</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
