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
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Play,
} from 'lucide-react';
import { TaskExecution, TaskStatus, TASK_STATUS_LABELS, TASK_TYPE_LABELS } from '@/lib/scheduler/types';

export default function SchedulerHistoryPage() {
  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [taskFilter, setTaskFilter] = useState<string>('all');
  const [uniqueTasks, setUniqueTasks] = useState<Array<{ id: string; name: string }>>([]);

  // 加载执行历史
  const loadExecutions = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/scheduler/executions', window.location.origin);
      url.searchParams.set('limit', '100');
      if (statusFilter !== 'all') {
        url.searchParams.set('status', statusFilter);
      }
      
      const response = await fetch(url.toString());
      const data = await response.json();
      if (data.success) {
        setExecutions(data.data);
        
        // 提取唯一任务列表
        const taskMap = new Map<string, string>();
        data.data.forEach((exec: TaskExecution) => {
          taskMap.set(exec.taskId, exec.taskName);
        });
        setUniqueTasks(Array.from(taskMap.entries()).map(([id, name]) => ({ id, name })));
      }
    } catch (error) {
      console.error('加载执行历史失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExecutions();
    
    // 定时刷新
    const interval = setInterval(loadExecutions, 10000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  // 过滤执行记录
  const filteredExecutions = taskFilter === 'all'
    ? executions
    : executions.filter(e => e.taskId === taskFilter);

  const getStatusIcon = (status: TaskStatus) => {
    const icons: Record<TaskStatus, React.ReactNode> = {
      [TaskStatus.PENDING]: <Clock className="w-4 h-4 text-muted-foreground" />,
      [TaskStatus.RUNNING]: <Loader2 className="w-4 h-4 animate-spin text-blue-500" />,
      [TaskStatus.SUCCESS]: <CheckCircle className="w-4 h-4 text-green-500" />,
      [TaskStatus.FAILED]: <XCircle className="w-4 h-4 text-red-500" />,
      [TaskStatus.CANCELLED]: <XCircle className="w-4 h-4 text-yellow-500" />,
      [TaskStatus.PAUSED]: <Clock className="w-4 h-4 text-yellow-500" />,
    };
    return icons[status] || <Clock className="w-4 h-4" />;
  };

  const getStatusVariant = (status: TaskStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const variants: Record<TaskStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      [TaskStatus.PENDING]: 'secondary',
      [TaskStatus.RUNNING]: 'default',
      [TaskStatus.SUCCESS]: 'secondary',
      [TaskStatus.FAILED]: 'destructive',
      [TaskStatus.CANCELLED]: 'outline',
      [TaskStatus.PAUSED]: 'outline',
    };
    return variants[status] || 'default';
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}分${remainingSeconds}秒`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}小时${remainingMinutes}分`;
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">执行历史</h1>
          <p className="text-muted-foreground mt-1">查看定时任务的执行记录</p>
        </div>
        <Button variant="outline" onClick={loadExecutions} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
          刷新
        </Button>
      </div>

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
                  <SelectItem value="running">运行中</SelectItem>
                  <SelectItem value="success">成功</SelectItem>
                  <SelectItem value="failed">失败</SelectItem>
                  <SelectItem value="pending">等待执行</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-64">
              <Select value={taskFilter} onValueChange={setTaskFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="任务筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部任务</SelectItem>
                  {uniqueTasks.map(task => (
                    <SelectItem key={task.id} value={task.id}>{task.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 执行列表 */}
      <Card>
        <CardHeader>
          <CardTitle>执行记录 ({filteredExecutions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>任务名称</TableHead>
                <TableHead>任务类型</TableHead>
                <TableHead>触发方式</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>开始时间</TableHead>
                <TableHead>耗时</TableHead>
                <TableHead>结果/错误</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredExecutions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    暂无执行记录
                  </TableCell>
                </TableRow>
              ) : (
                filteredExecutions.map(exec => (
                  <TableRow key={exec.id}>
                    <TableCell className="font-medium">{exec.taskName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {TASK_TYPE_LABELS[exec.taskType as keyof typeof TASK_TYPE_LABELS] || exec.taskType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {exec.triggeredBy === 'schedule' ? '定时' : exec.triggeredBy === 'manual' ? '手动' : 'API'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(exec.status)}
                        <Badge variant={getStatusVariant(exec.status)}>
                          {TASK_STATUS_LABELS[exec.status]}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(exec.startedAt).toLocaleString('zh-CN')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{formatDuration(exec.durationSeconds)}</span>
                    </TableCell>
                    <TableCell>
                      {exec.result?.success ? (
                        <div className="text-sm text-green-600 max-w-xs truncate" title={exec.result.message}>
                          {exec.result.message || '执行成功'}
                        </div>
                      ) : exec.error ? (
                        <div className="text-sm text-red-600 max-w-xs truncate" title={exec.error.message}>
                          {exec.error.message}
                        </div>
                      ) : exec.status === TaskStatus.RUNNING ? (
                        <span className="text-sm text-blue-600">执行中...</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
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
