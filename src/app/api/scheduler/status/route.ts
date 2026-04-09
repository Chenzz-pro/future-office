/**
 * 调度器状态 API
 * 获取调度器运行状态
 */

import { NextResponse } from 'next/server';
import { taskScheduler } from '@/lib/scheduler/task-scheduler';
import { taskRepository } from '@/lib/scheduler/task-repository';

/**
 * GET /api/scheduler/status
 * 获取调度器状态
 */
export async function GET() {
  try {
    const status = taskScheduler.getStatus();
    const runningTasks = taskScheduler.getRunningTasks();
    
    // 获取总体统计
    const allTasks = await taskRepository.getAllTasks();
    const enabledTasks = allTasks.filter(t => t.enabled);
    const runningCount = await taskRepository.getRunningTaskCount();

    // 获取今日执行统计
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const recentExecutions = await taskRepository.getRecentExecutions(100);
    const todayExecutions = recentExecutions.filter(e => e.startedAt >= today);

    const stats = {
      totalTasks: allTasks.length,
      enabledTasks: enabledTasks.length,
      disabledTasks: allTasks.length - enabledTasks.length,
      runningTasks: runningCount,
      todayExecutions: todayExecutions.length,
      todaySuccess: todayExecutions.filter(e => e.status === 'success').length,
      todayFailed: todayExecutions.filter(e => e.status === 'failed').length,
    };

    return NextResponse.json({
      success: true,
      data: {
        scheduler: status,
        runningTasks,
        stats,
      },
    });
  } catch (error) {
    console.error('[API:Scheduler:Status] 获取状态失败:', error);
    return NextResponse.json(
      { success: false, error: '获取调度器状态失败' },
      { status: 500 }
    );
  }
}
