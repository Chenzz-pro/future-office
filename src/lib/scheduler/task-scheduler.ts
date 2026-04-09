/**
 * 全局定时任务调度器
 * 统一管理所有定时任务
 */

import cron, { ScheduledTask as CronTask } from 'node-cron';
import { taskRepository, TaskRepository } from './task-repository';
import {
  ScheduledTask,
  TaskExecution,
  TaskStatus,
  TriggerTaskRequest,
} from './types';

interface RunningTask {
  executionId: string;
  taskId: string;
  startedAt: Date;
  timeout?: NodeJS.Timeout;
}

export class TaskScheduler {
  private static instance: TaskScheduler;
  private cronTasks: Map<string, CronTask> = new Map();
  private runningTasks: Map<string, RunningTask> = new Map();
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): TaskScheduler {
    if (!TaskScheduler.instance) {
      TaskScheduler.instance = new TaskScheduler();
    }
    return TaskScheduler.instance;
  }

  /**
   * 初始化调度器
   */
  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('[TaskScheduler] 初始化全局定时任务调度器...');

    try {
      // 初始化表
      await taskRepository.initTables();

      // 加载并启动所有启用的任务
      const tasks = await taskRepository.getEnabledTasks();
      
      for (const task of tasks) {
        await this.startTask(task);
      }

      this.isInitialized = true;
      console.log(`[TaskScheduler] 调度器初始化完成，共 ${tasks.length} 个任务`);
    } catch (error) {
      console.error('[TaskScheduler] 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 停止调度器
   */
  stop(): void {
    console.log('[TaskScheduler] 停止调度器...');

    // 停止所有定时任务
    for (const [taskId, cronTask] of this.cronTasks) {
      cronTask.stop();
      console.log(`[TaskScheduler] 已停止任务: ${taskId}`);
    }
    this.cronTasks.clear();

    // 清理超时定时器
    for (const [, running] of this.runningTasks) {
      if (running.timeout) {
        clearTimeout(running.timeout);
      }
    }
    this.runningTasks.clear();

    this.isInitialized = false;
    console.log('[TaskScheduler] 调度器已停止');
  }

  /**
   * 启动单个任务
   */
  async startTask(task: ScheduledTask): Promise<void> {
    if (!task.enabled) {
      console.log(`[TaskScheduler] 任务 ${task.name} 未启用，跳过`);
      return;
    }

    // 如果任务已在运行，先停止
    if (this.cronTasks.has(task.id)) {
      await this.stopTask(task.id);
    }

    // 创建执行记录
    const execution = await taskRepository.createExecution({
      taskId: task.id,
      taskName: task.name,
      taskType: task.type,
      status: TaskStatus.RUNNING,
      triggeredBy: 'schedule',
      startedAt: new Date(),
    });

    // 根据调度类型创建定时任务
    let cronExpression: string;
    
    switch (task.scheduleType) {
      case 'interval':
        if (task.intervalHours && task.intervalHours > 0) {
          cronExpression = `0 */${task.intervalHours} * * *`;
        } else if (task.intervalMinutes && task.intervalMinutes > 0) {
          cronExpression = `*/${task.intervalMinutes} * * * *`;
        } else {
          console.warn(`[TaskScheduler] 任务 ${task.name} 缺少间隔配置`);
          return;
        }
        break;
      case 'cron':
        if (!task.cronExpression) {
          console.warn(`[TaskScheduler] 任务 ${task.name} 缺少Cron表达式`);
          return;
        }
        cronExpression = task.cronExpression;
        break;
      case 'once':
        console.log(`[TaskScheduler] 任务 ${task.name} 是一次性任务，不启动调度`);
        return;
      default:
        console.warn(`[TaskScheduler] 任务 ${task.name} 调度类型不支持`);
        return;
    }

    // 验证Cron表达式
    if (!cron.validate(cronExpression)) {
      console.error(`[TaskScheduler] 任务 ${task.name} 的Cron表达式无效: ${cronExpression}`);
      return;
    }

    console.log(`[TaskScheduler] 启动任务 ${task.name}，Cron: ${cronExpression}`);

    const cronTask = cron.schedule(cronExpression, async () => {
      await this.executeTask(task);
    });

    this.cronTasks.set(task.id, cronTask);
  }

  /**
   * 停止单个任务
   */
  async stopTask(taskId: string): Promise<void> {
    const cronTask = this.cronTasks.get(taskId);
    if (cronTask) {
      cronTask.stop();
      this.cronTasks.delete(taskId);
      console.log(`[TaskScheduler] 已停止任务: ${taskId}`);
    }
  }

  /**
   * 执行任务
   */
  async executeTask(task: ScheduledTask, manualParams?: Record<string, unknown>): Promise<TaskExecution> {
    // 检查并发限制
    if (task.executionLimit?.maxConcurrent) {
      const hasConcurrent = await taskRepository.hasConcurrentExecution(
        task.id,
        task.executionLimit.maxConcurrent
      );
      if (hasConcurrent && task.executionLimit.maxConcurrent <= 1) {
        console.warn(`[TaskScheduler] 任务 ${task.name} 正在运行，跳过`);
        throw new Error('任务正在运行');
      }
    }

    // 创建执行记录
    const execution = await taskRepository.createExecution({
      taskId: task.id,
      taskName: task.name,
      taskType: task.type,
      status: TaskStatus.RUNNING,
      triggeredBy: manualParams ? 'manual' : 'schedule',
      startedAt: new Date(),
      parameters: manualParams ?? task.handlerConfig.parameters,
    });

    const runningTask: RunningTask = {
      executionId: execution.id,
      taskId: task.id,
      startedAt: new Date(),
    };

    // 设置超时
    if (task.timeoutSeconds && task.timeoutSeconds > 0) {
      runningTask.timeout = setTimeout(async () => {
        await this.handleTaskTimeout(task, execution.id);
      }, task.timeoutSeconds * 1000);
    }

    this.runningTasks.set(task.id, runningTask);

    try {
      console.log(`[TaskScheduler] 执行任务 ${task.name}，执行ID: ${execution.id}`);

      // 根据处理器类型执行
      let result: { success: boolean; message?: string; data?: unknown };

      switch (task.handlerConfig.handlerType) {
        case 'api':
          result = await this.executeApiTask(task, manualParams);
          break;
        case 'function':
          result = await this.executeFunctionTask(task, manualParams);
          break;
        case 'script':
          // 脚本任务暂不支持
          result = { success: false, message: '脚本任务暂不支持' };
          break;
        default:
          result = { success: false, message: '不支持的处理器类型' };
      }

      // 更新执行记录
      const completedAt = new Date();
      const durationSeconds = Math.round((completedAt.getTime() - execution.startedAt.getTime()) / 1000);

      await taskRepository.updateExecution(execution.id, {
        status: result.success ? TaskStatus.SUCCESS : TaskStatus.FAILED,
        completedAt,
        durationSeconds,
        result: {
          success: result.success,
          message: result.message,
          data: result.data,
        },
      });

      console.log(`[TaskScheduler] 任务 ${task.name} 执行完成，状态: ${result.success ? '成功' : '失败'}`);

      return {
        ...execution,
        status: result.success ? TaskStatus.SUCCESS : TaskStatus.FAILED,
        completedAt,
        durationSeconds,
        result: {
          success: result.success,
          message: result.message,
          data: result.data,
        },
      };
    } catch (error) {
      const completedAt = new Date();
      const durationSeconds = Math.round((completedAt.getTime() - execution.startedAt.getTime()) / 1000);
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 更新执行记录
      await taskRepository.updateExecution(execution.id, {
        status: TaskStatus.FAILED,
        completedAt,
        durationSeconds,
        error: {
          code: 'EXECUTION_ERROR',
          message: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        },
      });

      console.error(`[TaskScheduler] 任务 ${task.name} 执行失败:`, error);

      return {
        ...execution,
        status: TaskStatus.FAILED,
        completedAt,
        durationSeconds,
        error: {
          code: 'EXECUTION_ERROR',
          message: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        },
      };
    } finally {
      // 清理
      const running = this.runningTasks.get(task.id);
      if (running?.timeout) {
        clearTimeout(running.timeout);
      }
      this.runningTasks.delete(task.id);
    }
  }

  /**
   * 执行API任务
   */
  private async executeApiTask(task: ScheduledTask, params?: Record<string, unknown>): Promise<{ success: boolean; message?: string; data?: unknown }> {
    try {
      // 构建URL和参数
      const url = task.handlerConfig.handlerPath;
      const requestParams = { ...task.handlerConfig.parameters, ...params };

      console.log(`[TaskScheduler] 调用API: ${url}`, requestParams);

      // 发起请求
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestParams),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          message: 'API调用成功',
          data,
        };
      } else {
        return {
          success: false,
          message: data.error || 'API调用失败',
          data,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'API调用异常',
      };
    }
  }

  /**
   * 执行函数任务
   */
  private async executeFunctionTask(task: ScheduledTask, params?: Record<string, unknown>): Promise<{ success: boolean; message?: string; data?: unknown }> {
    try {
      // 函数任务的handlerPath格式: 'sync:orgSync' 或 'backup:fullBackup'
      const [module, funcName] = task.handlerConfig.handlerPath.split(':');

      console.log(`[TaskScheduler] 执行函数: ${module}:${funcName}`);

      // 根据模块和函数名动态调用
      // 这里可以根据不同的模块实现不同的函数调用
      if (module === 'sync') {
        if (funcName === 'orgSync') {
          // 调用组织架构同步
          const { orgSyncService } = await import('../sync/org-sync.service');
          const result = await orgSyncService.fullSync({
            operatorId: 'system',
            operatorName: '定时任务',
            returnOrgType: [
              { type: 'org' },
              { type: 'dept' },
              { type: 'post' },
              { type: 'person' },
            ],
          });
          return {
            success: result.success,
            message: result.message,
            data: result,
          };
        }
      }

      return {
        success: false,
        message: `未知的函数: ${task.handlerConfig.handlerPath}`,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '函数执行异常',
      };
    }
  }

  /**
   * 处理任务超时
   */
  private async handleTaskTimeout(task: ScheduledTask, executionId: string): Promise<void> {
    console.warn(`[TaskScheduler] 任务 ${task.name} 执行超时`);

    await taskRepository.updateExecution(executionId, {
      status: TaskStatus.FAILED,
      completedAt: new Date(),
      error: {
        code: 'TIMEOUT',
        message: `任务执行超时（${task.timeoutSeconds}秒）`,
      },
    });

    // 从运行列表移除
    this.runningTasks.delete(task.id);
  }

  /**
   * 手动触发任务
   */
  async triggerTask(request: TriggerTaskRequest): Promise<TaskExecution> {
    const task = await taskRepository.getTaskById(request.taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    if (!task.enabled) {
      throw new Error('任务未启用');
    }

    return this.executeTask(task, request.parameters);
  }

  /**
   * 获取调度器状态
   */
  getStatus(): {
    isInitialized: boolean;
    totalTasks: number;
    runningTasks: number;
    scheduledTasks: number;
  } {
    return {
      isInitialized: this.isInitialized,
      totalTasks: this.cronTasks.size + this.runningTasks.size,
      runningTasks: this.runningTasks.size,
      scheduledTasks: this.cronTasks.size,
    };
  }

  /**
   * 获取运行中的任务
   */
  getRunningTasks(): Array<{ taskId: string; executionId: string; startedAt: Date }> {
    return Array.from(this.runningTasks.values()).map(r => ({
      taskId: r.taskId,
      executionId: r.executionId,
      startedAt: r.startedAt,
    }));
  }
}

export const taskScheduler = TaskScheduler.getInstance();
