/**
 * 同步系统启动入口
 * 在系统启动时自动初始化并启动定时任务
 */

import { syncSystemInitializer } from './sync-system-initializer';
import { syncScheduler } from './sync-scheduler';
import { syncMonitor } from './sync-monitor';

/**
 * 启动同步系统
 */
export async function startSyncSystem(): Promise<{
  success: boolean;
  message: string;
  details: {
    initSuccess: boolean;
    schedulerStarted: boolean;
    monitorStarted: boolean;
  };
}> {
  console.log('==========================================');
  console.log('启动组织架构同步系统');
  console.log('==========================================');

  try {
    // 1. 初始化同步系统
    console.log('[启动] 第1步：初始化同步系统...');
    const initResult = await syncSystemInitializer.initialize();

    if (!initResult.success) {
      console.error('[启动] 初始化失败:', initResult.message);
      return {
        success: false,
        message: `初始化失败: ${initResult.message}`,
        details: {
          initSuccess: false,
          schedulerStarted: false,
          monitorStarted: false
        }
      };
    }

    console.log('[启动] ✓ 初始化完成', initResult.details);

    // 2. 启动监控服务
    console.log('[启动] 第2步：启动监控服务...');
    await syncMonitor.start();
    console.log('[启动] ✓ 监控服务已启动');

    // 3. 启动定时任务调度器
    console.log('[启动] 第3步：启动定时任务调度器...');
    await syncScheduler.start();
    console.log('[启动] ✓ 定时任务调度器已启动');

    // 4. 显示调度器状态
    const schedulerStatus = syncScheduler.getStatus();
    console.log('[启动] 调度器状态:', schedulerStatus);

    // 5. 显示监控状态
    const monitorStatus = syncMonitor.getStatus();
    console.log('[启动] 监控状态:', monitorStatus);

    console.log('==========================================');
    console.log('✓ 组织架构同步系统启动成功');
    console.log('==========================================');

    return {
      success: true,
      message: '同步系统启动成功',
      details: {
        initSuccess: true,
        schedulerStarted: schedulerStatus.isRunning,
        monitorStarted: monitorStatus.isRunning
      }
    };
  } catch (error) {
    console.error('[启动] 同步系统启动失败:', error);
    return {
      success: false,
      message: `启动失败: ${error instanceof Error ? error.message : String(error)}`,
      details: {
        initSuccess: false,
        schedulerStarted: false,
        monitorStarted: false
      }
    };
  }
}

/**
 * 停止同步系统
 */
export async function stopSyncSystem(): Promise<void> {
  console.log('[停止] 停止组织架构同步系统...');

  // 停止定时任务调度器
  syncScheduler.stop();
  console.log('[停止] ✓ 定时任务调度器已停止');

  // 停止监控服务
  syncMonitor.stop();
  console.log('[停止] ✓ 监控服务已停止');

  console.log('[停止] ✓ 同步系统已停止');
}

/**
 * 重启同步系统
 */
export async function restartSyncSystem(): Promise<any> {
  console.log('[重启] 重启组织架构同步系统...');

  await stopSyncSystem();

  // 等待1秒
  await new Promise(resolve => setTimeout(resolve, 1000));

  return startSyncSystem();
}

/**
 * 获取同步系统状态
 */
export function getSyncSystemStatus(): {
  initialized: boolean;
  initializing: boolean;
  schedulerRunning: boolean;
  monitorRunning: boolean;
  schedulerStatus: ReturnType<typeof syncScheduler.getStatus>;
  monitorStatus: ReturnType<typeof syncMonitor.getStatus>;
} {
  const initStatus = syncSystemInitializer.getStatus();
  const schedulerStatus = syncScheduler.getStatus();
  const monitorStatus = syncMonitor.getStatus();

  return {
    initialized: initStatus.initialized,
    initializing: initStatus.initializing,
    schedulerRunning: schedulerStatus.isRunning,
    monitorRunning: monitorStatus.isRunning,
    schedulerStatus,
    monitorStatus
  };
}

/**
 * 启动脚本（用于在系统启动时调用）
 */
export async function syncSystemStartup(): Promise<void> {
  // 检查是否在生产环境
  const isProduction = process.env.COZE_PROJECT_ENV === 'PROD';

  console.log(`[启动脚本] 环境: ${isProduction ? '生产环境' : '开发环境'}`);

  // 启动同步系统
  const result = await startSyncSystem();

  if (result.success) {
    console.log('[启动脚本] ✓ 同步系统启动成功');
  } else {
    console.error('[启动脚本] ✗ 同步系统启动失败:', result.message);
    // 不抛出错误，避免影响主系统启动
  }
}
