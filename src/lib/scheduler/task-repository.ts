/**
 * 全局定时任务 Repository
 * 管理定时任务定义和执行记录
 */

import { dbManager } from '../database/manager';
import {
  ScheduledTask,
  TaskExecution,
  TaskStats,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskType,
  TaskGroup,
  TaskStatus,
  ScheduleType,
} from './types';

/**
 * 定时任务 Repository
 */
export class TaskRepository {
  /**
   * 初始化定时任务表
   */
  async initTables(): Promise<void> {
    // 1. 创建定时任务定义表
    await dbManager.query(`
      CREATE TABLE IF NOT EXISTS scheduled_tasks (
        id VARCHAR(36) PRIMARY KEY COMMENT '任务ID',
        name VARCHAR(200) NOT NULL COMMENT '任务名称',
        description VARCHAR(500) COMMENT '任务描述',
        type ENUM('org_sync', 'data_backup', 'cache_cleanup', 'report_generation', 'custom') NOT NULL COMMENT '任务类型',
        \`group\` ENUM('system', 'integration', 'business', 'custom') NOT NULL COMMENT '任务分组',
        enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
        schedule_type ENUM('interval', 'cron', 'once') NOT NULL COMMENT '调度类型',
        cron_expression VARCHAR(100) COMMENT 'Cron表达式',
        interval_minutes INT COMMENT '间隔分钟数',
        interval_hours INT COMMENT '间隔小时数',
        related_system VARCHAR(100) COMMENT '关联系统',
        handler_type ENUM('api', 'script', 'function') NOT NULL COMMENT '处理器类型',
        handler_path VARCHAR(500) NOT NULL COMMENT '处理器路径',
        handler_params JSON COMMENT '处理器参数',
        max_retries INT DEFAULT 0 COMMENT '最大重试次数',
        retry_interval_seconds INT DEFAULT 60 COMMENT '重试间隔秒数',
        timeout_seconds INT DEFAULT 300 COMMENT '超时秒数',
        max_concurrent INT DEFAULT 1 COMMENT '最大并发数',
        max_executions_per_day INT COMMENT '每日最大执行次数',
        metadata JSON COMMENT '元数据',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        created_by VARCHAR(36) COMMENT '创建人',
        UNIQUE KEY uk_name (name),
        INDEX idx_type (type),
        INDEX idx_group (\`group\`),
        INDEX idx_enabled (enabled),
        INDEX idx_related_system (related_system)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='定时任务定义表'
    `);

    // 2. 创建任务执行记录表
    await dbManager.query(`
      CREATE TABLE IF NOT EXISTS task_executions (
        id VARCHAR(36) PRIMARY KEY COMMENT '执行ID',
        task_id VARCHAR(36) NOT NULL COMMENT '任务ID',
        task_name VARCHAR(200) NOT NULL COMMENT '任务名称',
        task_type VARCHAR(50) NOT NULL COMMENT '任务类型',
        status ENUM('pending', 'running', 'success', 'failed', 'cancelled', 'paused') NOT NULL COMMENT '状态',
        triggered_by ENUM('schedule', 'manual', 'api') NOT NULL COMMENT '触发方式',
        started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '开始时间',
        completed_at TIMESTAMP NULL COMMENT '完成时间',
        duration_seconds INT COMMENT '耗时秒数',
        result_message TEXT COMMENT '结果消息',
        result_data JSON COMMENT '结果数据',
        error_code VARCHAR(50) COMMENT '错误码',
        error_message TEXT COMMENT '错误消息',
        error_stack TEXT COMMENT '错误堆栈',
        parameters JSON COMMENT '执行参数',
        logs TEXT COMMENT '执行日志',
        INDEX idx_task_id (task_id),
        INDEX idx_status (status),
        INDEX idx_started_at (started_at),
        INDEX idx_triggered_by (triggered_by),
        INDEX idx_task_type (task_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务执行记录表'
    `);

    console.log('[TaskRepository] 定时任务表初始化完成');
  }

  /**
   * 创建定时任务
   */
  async createTask(request: CreateTaskRequest, createdBy?: string): Promise<ScheduledTask | null> {
    const id = crypto.randomUUID();

    await dbManager.query(
      `INSERT INTO scheduled_tasks (
        id, name, description, type, \`group\`, enabled, schedule_type,
        cron_expression, interval_minutes, interval_hours, related_system,
        handler_type, handler_path, handler_params,
        max_retries, retry_interval_seconds, timeout_seconds,
        max_concurrent, max_executions_per_day, metadata, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        request.name,
        request.description,
        request.type,
        request.group,
        request.enabled ?? true,
        request.scheduleType,
        request.cronExpression,
        request.intervalMinutes,
        request.intervalHours,
        request.relatedSystem,
        request.handlerConfig.handlerType,
        request.handlerConfig.handlerPath,
        request.handlerConfig.parameters ? JSON.stringify(request.handlerConfig.parameters) : null,
        request.retryConfig?.maxRetries ?? 0,
        request.retryConfig?.retryIntervalSeconds ?? 60,
        request.timeoutSeconds ?? 300,
        request.executionLimit?.maxConcurrent ?? 1,
        request.executionLimit?.maxExecutionsPerDay,
        request.metadata ? JSON.stringify(request.metadata) : null,
        createdBy,
      ]
    );

    const task = await this.getTaskById(id);
    return task ?? null;
  }

  /**
   * 更新定时任务
   */
  async updateTask(request: UpdateTaskRequest): Promise<ScheduledTask | null> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (request.name !== undefined) {
      updates.push('name = ?');
      values.push(request.name);
    }
    if (request.description !== undefined) {
      updates.push('description = ?');
      values.push(request.description);
    }
    if (request.type !== undefined) {
      updates.push('type = ?');
      values.push(request.type);
    }
    if (request.group !== undefined) {
      updates.push('`group` = ?');
      values.push(request.group);
    }
    if (request.enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(request.enabled);
    }
    if (request.scheduleType !== undefined) {
      updates.push('schedule_type = ?');
      values.push(request.scheduleType);
    }
    if (request.cronExpression !== undefined) {
      updates.push('cron_expression = ?');
      values.push(request.cronExpression);
    }
    if (request.intervalMinutes !== undefined) {
      updates.push('interval_minutes = ?');
      values.push(request.intervalMinutes);
    }
    if (request.intervalHours !== undefined) {
      updates.push('interval_hours = ?');
      values.push(request.intervalHours);
    }
    if (request.relatedSystem !== undefined) {
      updates.push('related_system = ?');
      values.push(request.relatedSystem);
    }
    if (request.handlerConfig !== undefined) {
      updates.push('handler_type = ?');
      values.push(request.handlerConfig.handlerType);
      updates.push('handler_path = ?');
      values.push(request.handlerConfig.handlerPath);
      updates.push('handler_params = ?');
      values.push(request.handlerConfig.parameters ? JSON.stringify(request.handlerConfig.parameters) : null);
    }
    if (request.retryConfig !== undefined) {
      updates.push('max_retries = ?');
      values.push(request.retryConfig.maxRetries);
      updates.push('retry_interval_seconds = ?');
      values.push(request.retryConfig.retryIntervalSeconds);
    }
    if (request.timeoutSeconds !== undefined) {
      updates.push('timeout_seconds = ?');
      values.push(request.timeoutSeconds);
    }
    if (request.executionLimit !== undefined) {
      updates.push('max_concurrent = ?');
      values.push(request.executionLimit.maxConcurrent);
      updates.push('max_executions_per_day = ?');
      values.push(request.executionLimit.maxExecutionsPerDay);
    }
    if (request.metadata !== undefined) {
      updates.push('metadata = ?');
      values.push(JSON.stringify(request.metadata));
    }

    if (updates.length === 0) {
      return this.getTaskById(request.id);
    }

    values.push(request.id);
    await dbManager.query(
      `UPDATE scheduled_tasks SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.getTaskById(request.id);
  }

  /**
   * 删除定时任务
   */
  async deleteTask(id: string): Promise<boolean> {
    const result = await dbManager.query('DELETE FROM scheduled_tasks WHERE id = ?', [id]);
    return (result.affectedRows ?? 0) > 0;
  }

  /**
   * 根据ID获取任务
   */
  async getTaskById(id: string): Promise<ScheduledTask | null> {
    const result = await dbManager.query('SELECT * FROM scheduled_tasks WHERE id = ?', [id]);
    if (result.rows.length === 0) return null;
    return this.mapRowToTask(result.rows[0]);
  }

  /**
   * 获取所有任务
   */
  async getAllTasks(filters?: {
    type?: TaskType;
    group?: TaskGroup;
    enabled?: boolean;
    relatedSystem?: string;
  }): Promise<ScheduledTask[]> {
    let sql = 'SELECT * FROM scheduled_tasks WHERE 1=1';
    const params: unknown[] = [];

    if (filters?.type) {
      sql += ' AND type = ?';
      params.push(filters.type);
    }
    if (filters?.group) {
      sql += ' AND `group` = ?';
      params.push(filters.group);
    }
    if (filters?.enabled !== undefined) {
      sql += ' AND enabled = ?';
      params.push(filters.enabled);
    }
    if (filters?.relatedSystem) {
      sql += ' AND related_system = ?';
      params.push(filters.relatedSystem);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await dbManager.query(sql, params);
    return result.rows.map(row => this.mapRowToTask(row));
  }

  /**
   * 获取启用的任务
   */
  async getEnabledTasks(): Promise<ScheduledTask[]> {
    const result = await dbManager.query('SELECT * FROM scheduled_tasks WHERE enabled = TRUE ORDER BY name');
    return result.rows.map(row => this.mapRowToTask(row));
  }

  /**
   * 创建执行记录
   */
  async createExecution(execution: Omit<TaskExecution, 'id' | 'createdAt'>): Promise<TaskExecution> {
    const id = crypto.randomUUID();

    await dbManager.query(
      `INSERT INTO task_executions (
        id, task_id, task_name, task_type, status, triggered_by,
        started_at, completed_at, duration_seconds,
        result_message, result_data, error_code, error_message, error_stack,
        parameters, logs
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        execution.taskId,
        execution.taskName,
        execution.taskType,
        execution.status,
        execution.triggeredBy,
        execution.startedAt,
        execution.completedAt,
        execution.durationSeconds,
        execution.result?.message,
        execution.result?.data ? JSON.stringify(execution.result.data) : null,
        execution.error?.code,
        execution.error?.message,
        execution.error?.stack,
        execution.parameters ? JSON.stringify(execution.parameters) : null,
        execution.logs ? execution.logs.join('\n') : null,
      ]
    );

    return { ...execution, id, createdAt: new Date() };
  }

  /**
   * 更新执行记录
   */
  async updateExecution(
    id: string,
    updates: Partial<Pick<TaskExecution, 'status' | 'completedAt' | 'durationSeconds' | 'result' | 'error' | 'logs'>>
  ): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.completedAt !== undefined) {
      fields.push('completed_at = ?');
      values.push(updates.completedAt);
    }
    if (updates.durationSeconds !== undefined) {
      fields.push('duration_seconds = ?');
      values.push(updates.durationSeconds);
    }
    if (updates.result !== undefined) {
      fields.push('result_message = ?');
      values.push(updates.result.message);
      fields.push('result_data = ?');
      values.push(updates.result.data ? JSON.stringify(updates.result.data) : null);
    }
    if (updates.error !== undefined) {
      fields.push('error_code = ?');
      values.push(updates.error.code);
      fields.push('error_message = ?');
      values.push(updates.error.message);
      fields.push('error_stack = ?');
      values.push(updates.error.stack);
    }
    if (updates.logs !== undefined) {
      fields.push('logs = ?');
      values.push(updates.logs.join('\n'));
    }

    if (fields.length > 0) {
      values.push(id);
      await dbManager.query(`UPDATE task_executions SET ${fields.join(', ')} WHERE id = ?`, values);
    }
  }

  /**
   * 获取任务执行历史
   */
  async getExecutionHistory(taskId: string, limit = 50): Promise<TaskExecution[]> {
    const result = await dbManager.query(
      'SELECT * FROM task_executions WHERE task_id = ? ORDER BY started_at DESC LIMIT ?',
      [taskId, limit]
    );
    return result.rows.map(row => this.mapRowToExecution(row));
  }

  /**
   * 获取最近执行记录
   */
  async getRecentExecutions(limit = 100): Promise<TaskExecution[]> {
    const result = await dbManager.query(
      'SELECT * FROM task_executions ORDER BY started_at DESC LIMIT ?',
      [limit]
    );
    return result.rows.map(row => this.mapRowToExecution(row));
  }

  /**
   * 获取任务统计
   */
  async getTaskStats(taskId: string): Promise<TaskStats | null> {
    const task = await this.getTaskById(taskId);
    if (!task) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 获取总体统计
    const totalResult = await dbManager.query<{ total: number; success: number; failed: number; avgDuration: number }>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        AVG(duration_seconds) as avgDuration
       FROM task_executions WHERE task_id = ?`,
      [taskId]
    );

    // 获取今日统计
    const todayResult = await dbManager.query<{ todayTotal: number; todaySuccess: number; todayFailed: number }>(
      `SELECT 
        COUNT(*) as todayTotal,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as todaySuccess,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as todayFailed
       FROM task_executions WHERE task_id = ? AND started_at >= ?`,
      [taskId, today]
    );

    // 获取最近执行时间
    const lastExecution = await dbManager.query<{ started_at: Date }>(
      'SELECT started_at FROM task_executions WHERE task_id = ? ORDER BY started_at DESC LIMIT 1',
      [taskId]
    );

    // 获取最后成功/失败时间
    const lastSuccessResult = await dbManager.query<{ started_at: Date }>(
      'SELECT started_at FROM task_executions WHERE task_id = ? AND status = ? ORDER BY started_at DESC LIMIT 1',
      [taskId, TaskStatus.SUCCESS]
    );

    const lastFailedResult = await dbManager.query<{ started_at: Date }>(
      'SELECT started_at FROM task_executions WHERE task_id = ? AND status = ? ORDER BY started_at DESC LIMIT 1',
      [taskId, TaskStatus.FAILED]
    );

    const stats = totalResult.rows[0];

    return {
      taskId,
      taskName: task.name,
      totalExecutions: stats?.total ?? 0,
      successCount: stats?.success ?? 0,
      failedCount: stats?.failed ?? 0,
      avgDurationSeconds: stats?.avgDuration ?? 0,
      lastExecutionAt: lastExecution.rows[0]?.started_at,
      lastSuccessAt: lastSuccessResult.rows[0]?.started_at,
      lastFailedAt: lastFailedResult.rows[0]?.started_at,
    };
  }

  /**
   * 获取正在运行的任务数
   */
  async getRunningTaskCount(): Promise<number> {
    const result = await dbManager.query<{ count: number }>(
      "SELECT COUNT(*) as count FROM task_executions WHERE status = 'running'"
    );
    return result.rows[0]?.count ?? 0;
  }

  /**
   * 检查是否有冲突的执行
   */
  async hasConcurrentExecution(taskId: string, maxConcurrent: number): Promise<boolean> {
    if (maxConcurrent <= 1) {
      const result = await dbManager.query<{ count: number }>(
        "SELECT COUNT(*) as count FROM task_executions WHERE task_id = ? AND status = 'running'",
        [taskId]
      );
      return (result.rows[0]?.count ?? 0) > 0;
    }
    return false;
  }

  /**
   * 将数据库行映射为 ScheduledTask
   */
  private mapRowToTask(row: unknown): ScheduledTask {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      name: r.name as string,
      description: r.description as string | undefined,
      type: r.type as TaskType,
      group: r.group as TaskGroup,
      enabled: Boolean(r.enabled),
      scheduleType: r.schedule_type as ScheduleType,
      cronExpression: r.cron_expression as string | undefined,
      intervalMinutes: r.interval_minutes as number | undefined,
      intervalHours: r.interval_hours as number | undefined,
      relatedSystem: r.related_system as string | undefined,
      handlerConfig: {
        handlerType: r.handler_type as 'api' | 'script' | 'function',
        handlerPath: r.handler_path as string,
        parameters: r.handler_params ? JSON.parse(r.handler_params as string) : undefined,
      },
      retryConfig: {
        maxRetries: r.max_retries as number,
        retryIntervalSeconds: r.retry_interval_seconds as number,
      },
      timeoutSeconds: r.timeout_seconds as number,
      executionLimit: {
        maxConcurrent: r.max_concurrent as number,
        maxExecutionsPerDay: r.max_executions_per_day as number | undefined,
      },
      metadata: r.metadata ? JSON.parse(r.metadata as string) : undefined,
      createdAt: new Date(r.created_at as string),
      updatedAt: new Date(r.updated_at as string),
      createdBy: r.created_by as string | undefined,
    };
  }

  /**
   * 将数据库行映射为 TaskExecution
   */
  private mapRowToExecution(row: unknown): TaskExecution {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      taskId: r.task_id as string,
      taskName: r.task_name as string,
      taskType: r.task_type as TaskType,
      status: r.status as TaskStatus,
      triggeredBy: r.triggered_by as 'schedule' | 'manual' | 'api',
      startedAt: new Date(r.started_at as string),
      completedAt: r.completed_at ? new Date(r.completed_at as string) : undefined,
      durationSeconds: r.duration_seconds as number | undefined,
      result: r.result_message ? {
        success: true,
        message: r.result_message as string,
        data: r.result_data ? JSON.parse(r.result_data as string) : undefined,
      } : undefined,
      error: r.error_message ? {
        code: r.error_code as string,
        message: r.error_message as string,
        stack: r.error_stack as string | undefined,
      } : undefined,
      parameters: r.parameters ? JSON.parse(r.parameters as string) : undefined,
      logs: r.logs ? (r.logs as string).split('\n') : undefined,
      createdAt: new Date(r.started_at as string),
    };
  }
}

export const taskRepository = new TaskRepository();
