/**
 * 任务执行历史 API
 * 获取任务执行记录和历史
 */

import { NextRequest, NextResponse } from 'next/server';
import { taskRepository } from '@/lib/scheduler/task-repository';

/**
 * GET /api/scheduler/executions
 * 获取执行历史
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get('taskId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');

    // 获取指定任务的执行历史
    if (taskId) {
      const executions = await taskRepository.getExecutionHistory(taskId, limit);

      // 如果指定了状态过滤
      const filteredExecutions = status
        ? executions.filter(e => e.status === status)
        : executions;

      return NextResponse.json({
        success: true,
        data: filteredExecutions,
      });
    }

    // 获取所有最近的执行记录
    const executions = await taskRepository.getRecentExecutions(limit);

    // 如果指定了状态过滤
    const filteredExecutions = status
      ? executions.filter(e => e.status === status)
      : executions;

    return NextResponse.json({
      success: true,
      data: filteredExecutions,
    });
  } catch (error) {
    console.error('[API:Scheduler:Executions] 获取执行历史失败:', error);
    return NextResponse.json(
      { success: false, error: '获取执行历史失败' },
      { status: 500 }
    );
  }
}
