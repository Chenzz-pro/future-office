/**
 * 全局定时任务管理 API
 * 提供定时任务的 CRUD 和执行管理
 */

import { NextRequest, NextResponse } from 'next/server';
import { taskScheduler } from '@/lib/scheduler/task-scheduler';
import { taskRepository } from '@/lib/scheduler/task-repository';
import {
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskType,
  TaskGroup,
  TaskStatus,
} from '@/lib/scheduler/types';

/**
 * GET /api/scheduler/tasks
 * 获取任务列表或单个任务
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get('id');
    const type = searchParams.get('type') as TaskType | null;
    const group = searchParams.get('group') as TaskGroup | null;
    const enabled = searchParams.get('enabled');
    const relatedSystem = searchParams.get('relatedSystem');

    // 获取单个任务
    if (taskId) {
      const task = await taskRepository.getTaskById(taskId);
      if (!task) {
        return NextResponse.json(
          { success: false, error: '任务不存在' },
          { status: 404 }
        );
      }

      // 获取任务统计
      const stats = await taskRepository.getTaskStats(taskId);

      return NextResponse.json({
        success: true,
        data: { ...task, stats },
      });
    }

    // 获取任务列表
    const filters: {
      type?: TaskType;
      group?: TaskGroup;
      enabled?: boolean;
      relatedSystem?: string;
    } = {};

    if (type) filters.type = type;
    if (group) filters.group = group;
    if (enabled !== null) filters.enabled = enabled === 'true';
    if (relatedSystem) filters.relatedSystem = relatedSystem;

    const tasks = await taskRepository.getAllTasks(filters);

    // 为每个任务添加统计信息
    const tasksWithStats = await Promise.all(
      tasks.map(async task => {
        const stats = await taskRepository.getTaskStats(task.id);
        return { ...task, stats };
      })
    );

    return NextResponse.json({
      success: true,
      data: tasksWithStats,
    });
  } catch (error) {
    console.error('[API:Scheduler:Tasks] 获取任务失败:', error);
    return NextResponse.json(
      { success: false, error: '获取任务失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scheduler/tasks
 * 创建新任务 / 手动触发任务
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // 手动触发任务
    if (action === 'trigger') {
      const { taskId, parameters } = body;

      if (!taskId) {
        return NextResponse.json(
          { success: false, error: '缺少任务ID' },
          { status: 400 }
        );
      }

      const execution = await taskScheduler.triggerTask({
        taskId,
        parameters,
        triggeredBy: 'manual',
      });

      return NextResponse.json({
        success: true,
        message: '任务已触发',
        data: execution,
      });
    }

    // 创建新任务
    const taskRequest: CreateTaskRequest = {
      name: body.name,
      description: body.description,
      type: body.type,
      group: body.group,
      enabled: body.enabled ?? true,
      scheduleType: body.scheduleType,
      cronExpression: body.cronExpression,
      intervalMinutes: body.intervalMinutes,
      intervalHours: body.intervalHours,
      relatedSystem: body.relatedSystem,
      handlerConfig: body.handlerConfig,
      retryConfig: body.retryConfig,
      timeoutSeconds: body.timeoutSeconds,
      executionLimit: body.executionLimit,
      metadata: body.metadata,
    };

    // 验证必填字段
    if (!taskRequest.name || !taskRequest.type || !taskRequest.group || !taskRequest.scheduleType) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段' },
        { status: 400 }
      );
    }

    if (!taskRequest.handlerConfig?.handlerType || !taskRequest.handlerConfig?.handlerPath) {
      return NextResponse.json(
        { success: false, error: '缺少处理器配置' },
        { status: 400 }
      );
    }

    // 验证调度配置
    if (taskRequest.scheduleType === 'cron' && !taskRequest.cronExpression) {
      return NextResponse.json(
        { success: false, error: 'Cron调度需要提供cronExpression' },
        { status: 400 }
      );
    }

    if (taskRequest.scheduleType === 'interval' && !taskRequest.intervalMinutes && !taskRequest.intervalHours) {
      return NextResponse.json(
        { success: false, error: '间隔调度需要提供intervalMinutes或intervalHours' },
        { status: 400 }
      );
    }

    // 创建任务
    const task = await taskRepository.createTask(taskRequest);

    if (!task) {
      return NextResponse.json(
        { success: false, error: '创建任务失败' },
        { status: 500 }
      );
    }

    // 如果任务启用，启动调度
    if (task.enabled) {
      await taskScheduler.startTask(task);
    }

    return NextResponse.json({
      success: true,
      message: '任务创建成功',
      data: task,
    });
  } catch (error) {
    console.error('[API:Scheduler:Tasks] 创建任务失败:', error);
    return NextResponse.json(
      { success: false, error: '创建任务失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/scheduler/tasks
 * 更新任务
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少任务ID' },
        { status: 400 }
      );
    }

    // 检查任务是否存在
    const existingTask = await taskRepository.getTaskById(id);
    if (!existingTask) {
      return NextResponse.json(
        { success: false, error: '任务不存在' },
        { status: 404 }
      );
    }

    // 更新任务
    const updateRequest: UpdateTaskRequest = {
      id,
      ...updateData,
    };

    const updatedTask = await taskRepository.updateTask(updateRequest);

    // 如果启用的状态改变，更新调度
    if (updateData.enabled !== undefined && updateData.enabled !== existingTask.enabled) {
      if (updateData.enabled) {
        await taskScheduler.startTask(updatedTask!);
      } else {
        await taskScheduler.stopTask(id);
      }
    }

    return NextResponse.json({
      success: true,
      message: '任务更新成功',
      data: updatedTask,
    });
  } catch (error) {
    console.error('[API:Scheduler:Tasks] 更新任务失败:', error);
    return NextResponse.json(
      { success: false, error: '更新任务失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/scheduler/tasks
 * 删除任务
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get('id');

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: '缺少任务ID' },
        { status: 400 }
      );
    }

    // 停止任务调度
    await taskScheduler.stopTask(taskId);

    // 删除任务
    const deleted = await taskRepository.deleteTask(taskId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: '任务不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '任务删除成功',
    });
  } catch (error) {
    console.error('[API:Scheduler:Tasks] 删除任务失败:', error);
    return NextResponse.json(
      { success: false, error: '删除任务失败' },
      { status: 500 }
    );
  }
}
