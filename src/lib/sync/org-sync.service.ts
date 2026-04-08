/**
 * 组织架构同步服务
 * 核心业务逻辑：全量同步、增量同步、数据映射、对比更新
 */

import { callEKPInterface } from '../ekp-client';
import { orgElementRepository } from '../database/repositories/org-element.repository';
import { orgPersonRepository } from '../database/repositories/org-person.repository';
import { orgSyncLogRepository, SyncLogDTO } from '../database/repositories/org-sync-log.repository';
import { orgSyncDetailRepository } from '../database/repositories/org-sync-detail.repository';
import { orgSyncTokenRepository } from '../database/repositories/org-sync-token.repository';
import { orgSyncConfigRepository } from '../database/repositories/org-sync-config.repository';
import { orgSyncMapper, EKPOrgElement } from './org-sync-mapper';

export interface SyncOptions {
  syncType: 'full' | 'incremental';
  operatorId?: string;
  operatorName?: string;
  beginTimeStamp?: string;
  returnOrgType?: Array<{ type: string }>;
  orgIds?: string[];
}

export interface SyncResult {
  success: boolean;
  syncLogId: string;
  status: 'running' | 'completed' | 'failed';
  stats: {
    total: number;
    org: number;
    dept: number;
    post: number;
    group: number;
    person: number;
    insert: number;
    update: number;
    delete: number;
    error: number;
  };
  message?: string;
}

export class OrgSyncService {
  /**
   * 全量同步
   */
  async fullSync(options: Omit<SyncOptions, 'syncType' | 'beginTimeStamp'> = {}): Promise<SyncResult> {
    // 检查是否有正在运行的同步
    const runningSync = await orgSyncLogRepository.findRunningSync();
    if (runningSync) {
      throw new Error(`已有同步任务正在运行，请等待完成后再试。同步ID: ${runningSync.id}`);
    }

    // 创建同步日志
    const syncLogId = await orgSyncLogRepository.create({
      sync_type: 'full',
      sync_mode: 'all',
      status: 'running',
      return_org_type: options.returnOrgType as unknown as Record<string, unknown>,
      triggered_by: 'manual',
      operator_id: options.operatorId,
      operator_name: options.operatorName,
      remark: options.orgIds ? `全量同步（${options.orgIds.length}个机构）` : '全量同步'
    });

    try {
      console.log(`[全量同步] 开始同步，同步ID: ${syncLogId}，机构范围: ${options.orgIds ? `${options.orgIds.length} 个机构` : '全部'}`);

      // 调用EKP接口获取全部数据
      console.log(`[全量同步] 开始调用EKP接口 org.getElementsBaseInfo`);
      const ekpResult = await callEKPInterface<{
        returnState: number;
        message: EKPOrgElement[];
        count: number;
      }>('org.getElementsBaseInfo');

      console.log(`[全量同步] EKP接口返回:`, JSON.stringify(ekpResult));

      if (ekpResult.success && ekpResult.data?.returnState === 2) {
        let ekpData = ekpResult.data.message || [];

        console.log(`[全量同步] 从EKP获取到 ${ekpData.length} 条数据`);

        // 如果指定了机构范围，过滤数据
        if (options.orgIds && options.orgIds.length > 0) {
          ekpData = this.filterByOrgIds(ekpData, options.orgIds);
          console.log(`[全量同步] 过滤后剩余 ${ekpData.length} 条数据`);
        }

        // 数据处理
        const result = await this.processOrgData(ekpData, {
          syncLogId,
          mode: 'full'
        });

        // 更新同步日志
        await orgSyncLogRepository.update(syncLogId, {
          status: 'completed',
          end_time_stamp: new Date().toISOString(),
          total_count: result.total,
          org_count: result.org,
          dept_count: result.dept,
          post_count: result.post,
          group_count: result.group,
          person_count: result.person,
          insert_count: result.insert,
          update_count: result.update,
          delete_count: result.delete,
          error_count: result.error
        });

        console.log(`[全量同步] 同步完成，耗时 ${result.duration}s`);

        return {
          success: true,
          syncLogId,
          status: 'completed',
          stats: result
        };
      } else {
        throw new Error(ekpResult.error || 'EKP接口调用失败');
      }
    } catch (error) {
      console.error(`[全量同步] 同步失败:`, error);

      await orgSyncLogRepository.update(syncLogId, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        syncLogId,
        status: 'failed',
        stats: {
          total: 0,
          org: 0,
          dept: 0,
          post: 0,
          group: 0,
          person: 0,
          insert: 0,
          update: 0,
          delete: 0,
          error: 1
        },
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 根据机构ID范围过滤数据
   * 包含选中机构及其所有子机构
   */
  private filterByOrgIds(data: EKPOrgElement[], orgIds: string[]): EKPOrgElement[] {
    // 构建所有需要包含的ID集合
    const includeIds = new Set<string>(orgIds);

    // 递归获取所有子机构ID
    const getAllChildIds = (parentId: string) => {
      const children = data.filter(item => item.parent === parentId);
      children.forEach(child => {
        if (!includeIds.has(child.id)) {
          includeIds.add(child.id);
          getAllChildIds(child.id);
        }
      });
    };

    // 为每个选中的机构获取其所有子机构
    orgIds.forEach(orgId => {
      getAllChildIds(orgId);
    });

    // 过滤数据
    return data.filter(item => includeIds.has(item.id) || (item.parent && includeIds.has(item.parent)));
  }

  /**
   * 增量同步
   */
  async incrementalSync(options: Omit<SyncOptions, 'syncType'> = {}): Promise<SyncResult> {
    // 检查是否有正在运行的同步
    const runningSync = await orgSyncLogRepository.findRunningSync();
    if (runningSync) {
      throw new Error(`已有同步任务正在运行，请等待完成后再试。同步ID: ${runningSync.id}`);
    }

    // 获取上次同步时间戳
    let beginTimeStamp = options.beginTimeStamp;
    if (!beginTimeStamp) {
      const lastSync = await orgSyncLogRepository.getLastSuccessfulSync();
      if (!lastSync) {
        // 如果没有历史记录，执行全量同步
        console.log('[增量同步] 没有历史同步记录，切换为全量同步');
        return this.fullSync(options);
      }
      beginTimeStamp = lastSync.end_time_stamp || lastSync.start_time.toISOString();
    }

    // 创建同步日志
    const syncLogId = await orgSyncLogRepository.create({
      sync_type: 'incremental',
      sync_mode: 'time',
      status: 'running',
      begin_time_stamp: beginTimeStamp,
      return_org_type: options.returnOrgType as unknown as Record<string, unknown>,
      triggered_by: 'manual',
      operator_id: options.operatorId,
      operator_name: options.operatorName,
      remark: '增量同步'
    });

    try {
      console.log(`[增量同步] 开始同步，同步ID: ${syncLogId}，时间戳: ${beginTimeStamp}`);

      const batchSize = await orgSyncConfigRepository.getNumber('sync.batch_size', 500) || 500;
      let allData: EKPOrgElement[] = [];
      let count = batchSize;
      let hasMore = true;
      let nextTimeStamp = beginTimeStamp;

      // 分页获取增量数据
      while (hasMore && count === batchSize) {
        const ekpResult = await callEKPInterface<{
          returnState: number;
          message: EKPOrgElement[];
          count: number;
          timeStamp: string;
        }>('org.getUpdatedElements', {
          returnOrgType: JSON.stringify(options.returnOrgType || [{ type: 'org' }, { type: 'dept' }, { type: 'post' }, { type: 'person' }]),
          count: batchSize,
          beginTimeStamp: nextTimeStamp
        });

        if (ekpResult.success && ekpResult.data?.returnState === 2) {
          const batchData = ekpResult.data.message || [];
          count = ekpResult.data.count || 0;
          nextTimeStamp = ekpResult.data.timeStamp || nextTimeStamp;

          console.log(`[增量同步] 本批次获取 ${count} 条数据`);

          allData = [...allData, ...batchData];

          // 如果返回数量小于请求数量，说明已经获取完所有数据
          if (count < batchSize) {
            hasMore = false;
          }
        } else {
          throw new Error(ekpResult.error || 'EKP接口调用失败');
        }
      }

      console.log(`[增量同步] 总共获取 ${allData.length} 条增量数据`);

      if (allData.length === 0) {
        console.log('[增量同步] 没有增量数据需要同步');

        await orgSyncLogRepository.update(syncLogId, {
          status: 'completed',
          end_time_stamp: nextTimeStamp,
          next_time_stamp: nextTimeStamp,
          total_count: 0
        });

        // 更新时间戳令牌
        await orgSyncTokenRepository.setTimestampToken(nextTimeStamp);

        return {
          success: true,
          syncLogId,
          status: 'completed',
          stats: {
            total: 0,
            org: 0,
            dept: 0,
            post: 0,
            group: 0,
            person: 0,
            insert: 0,
            update: 0,
            delete: 0,
            error: 0
          },
          message: '没有增量数据需要同步'
        };
      }

      // 数据处理
      const result = await this.processOrgData(allData, {
        syncLogId,
        mode: 'incremental'
      });

      // 更新同步日志
      await orgSyncLogRepository.update(syncLogId, {
        status: 'completed',
        end_time_stamp: nextTimeStamp,
        next_time_stamp: nextTimeStamp,
        total_count: result.total,
        org_count: result.org,
        dept_count: result.dept,
        post_count: result.post,
        group_count: result.group,
        person_count: result.person,
        insert_count: result.insert,
        update_count: result.update,
        delete_count: result.delete,
        error_count: result.error
      });

      // 更新时间戳令牌
      await orgSyncTokenRepository.setTimestampToken(nextTimeStamp);

      console.log(`[增量同步] 同步完成，耗时 ${result.duration}s`);

      return {
        success: true,
        syncLogId,
        status: 'completed',
        stats: result
      };
    } catch (error) {
      console.error(`[增量同步] 同步失败:`, error);

      await orgSyncLogRepository.update(syncLogId, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        syncLogId,
        status: 'failed',
        stats: {
          total: 0,
          org: 0,
          dept: 0,
          post: 0,
          group: 0,
          person: 0,
          insert: 0,
          update: 0,
          delete: 0,
          error: 1
        },
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 处理组织数据（核心方法）
   */
  private async processOrgData(ekpData: EKPOrgElement[], options: {
    syncLogId: string;
    mode: 'full' | 'incremental';
  }): Promise<{
    total: number;
    org: number;
    dept: number;
    post: number;
    group: number;
    person: number;
    insert: number;
    update: number;
    delete: number;
    error: number;
    duration: number;
  }> {
    const startTime = Date.now();
    const totalItems = ekpData.length;

    // 数据清洗
    const filteredData = await orgSyncMapper.filterData(ekpData);
    console.log(`[数据处理] 数据清洗后剩余 ${filteredData.length} 条`);

    // 统计各类型数量
    const typeStats = orgSyncMapper.getStatsByType(filteredData);

    // 分离组织和人员数据
    const elements = filteredData.filter(item => item.type !== 'person');
    const persons = filteredData.filter(item => item.type === 'person');

    let insertCount = 0;
    let updateCount = 0;
    let deleteCount = 0;
    let errorCount = 0;

    const details: any[] = [];

    try {
      // 处理组织元素（分批处理）
      const batchSize = await orgSyncConfigRepository.getNumber('sync.batch_size', 500) || 500;
      let processedCount = 0;

      for (let i = 0; i < elements.length; i += batchSize) {
        // 检查是否已取消
        const currentLog = await orgSyncLogRepository.findById(options.syncLogId);
        if (currentLog?.status === 'cancelled') {
          console.log('[数据处理] 同步已取消，停止处理');
          throw new Error('同步已取消');
        }

        const batch = elements.slice(i, i + batchSize);
        const batchResult = await this.processElementsBatch(batch, options.syncLogId);
        insertCount += batchResult.insert;
        updateCount += batchResult.update;
        deleteCount += batchResult.delete;
        errorCount += batchResult.error;
        details.push(...batchResult.details);

        // 更新进度
        processedCount += batch.length;
        await this.updateProgress(options.syncLogId, processedCount, totalItems, insertCount, updateCount, deleteCount, errorCount);
      }

      // 处理人员（分批处理）
      for (let i = 0; i < persons.length; i += batchSize) {
        // 检查是否已取消
        const currentLog = await orgSyncLogRepository.findById(options.syncLogId);
        if (currentLog?.status === 'cancelled') {
          console.log('[数据处理] 同步已取消，停止处理');
          throw new Error('同步已取消');
        }

        const batch = persons.slice(i, i + batchSize);
        const batchResult = await this.processPersonsBatch(batch, options.syncLogId);
        insertCount += batchResult.insert;
        updateCount += batchResult.update;
        deleteCount += batchResult.delete;
        errorCount += batchResult.error;
        details.push(...batchResult.details);

        // 更新进度
        processedCount += batch.length;
        await this.updateProgress(options.syncLogId, processedCount, totalItems, insertCount, updateCount, deleteCount, errorCount);
      }

      // 保存同步明细
      if (details.length > 0) {
        await orgSyncDetailRepository.batchInsert(details);
      }

      // 全量同步时处理软删除
      if (options.mode === 'full') {
        const deleteResult = await this.processSoftDelete(filteredData, options.syncLogId);
        deleteCount += deleteResult.count;
        details.push(...deleteResult.details);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      return {
        total: filteredData.length,
        org: typeStats.org,
        dept: typeStats.dept,
        post: typeStats.post,
        group: typeStats.group,
        person: typeStats.person,
        insert: insertCount,
        update: updateCount,
        delete: deleteCount,
        error: errorCount,
        duration: parseFloat(duration)
      };
    } catch (error) {
      console.error('[数据处理] 处理失败:', error);
      throw error;
    }
  }

  /**
   * 更新同步进度
   */
  private async updateProgress(
    syncLogId: string,
    processedCount: number,
    totalCount: number,
    insertCount: number,
    updateCount: number,
    deleteCount: number,
    errorCount: number
  ): Promise<void> {
    try {
      const progress = Math.round((processedCount / totalCount) * 100);
      await orgSyncLogRepository.update(syncLogId, {
        total_count: totalCount,
        insert_count: insertCount,
        update_count: updateCount,
        delete_count: deleteCount,
        error_count: errorCount
        // 可以添加一个 remark 字段来显示进度信息
        // remark: `进度: ${progress}% (${processedCount}/${totalCount})`
      });
      console.log(`[进度更新] ${progress}% (${processedCount}/${totalCount})`);
    } catch (error) {
      console.error('[进度更新] 更新失败:', error);
    }
  }

  /**
   * 批量处理组织元素
   */
  private async processElementsBatch(batch: EKPOrgElement[], syncLogId: string): Promise<{
    insert: number;
    update: number;
    delete: number;
    error: number;
    details: any[];
  }> {
    let insertCount = 0;
    let updateCount = 0;
    let errorCount = 0;
    const details: any[] = [];

    for (const item of batch) {
      try {
        const mapped = await orgSyncMapper.mapToOrgElement(item);
        const existing = await orgElementRepository.findById(item.id);

        if (existing) {
          // 更新
          await orgElementRepository.update(item.id, mapped);
          updateCount++;
          details.push({
            sync_log_id: syncLogId,
            data_type: item.type,
            action: 'update',
            ekp_id: item.id,
            ekp_name: item.name,
            local_id: existing.fd_id,
            old_data: existing,
            new_data: mapped
          });
        } else {
          // 新增
          await orgElementRepository.create(mapped);
          insertCount++;
          details.push({
            sync_log_id: syncLogId,
            data_type: item.type,
            action: 'insert',
            ekp_id: item.id,
            ekp_name: item.name,
            new_data: mapped
          });
        }
      } catch (error) {
        console.error(`[处理组织元素] 处理失败，ID: ${item.id}`, error);
        errorCount++;
        details.push({
          sync_log_id: syncLogId,
          data_type: item.type,
          action: 'error',
          ekp_id: item.id,
          ekp_name: item.name,
          error_message: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return { insert: insertCount, update: updateCount, delete: 0, error: errorCount, details };
  }

  /**
   * 批量处理人员
   */
  private async processPersonsBatch(batch: EKPOrgElement[], syncLogId: string): Promise<{
    insert: number;
    update: number;
    delete: number;
    error: number;
    details: any[];
  }> {
    let insertCount = 0;
    let updateCount = 0;
    let errorCount = 0;
    const details: any[] = [];

    for (const item of batch) {
      try {
        const mapped = await orgSyncMapper.mapToOrgPerson(item);
        const existing = await orgPersonRepository.findById(item.id);

        if (existing) {
          // 更新
          await orgPersonRepository.update(item.id, mapped);
          updateCount++;
          details.push({
            sync_log_id: syncLogId,
            data_type: 'person',
            action: 'update',
            ekp_id: item.id,
            ekp_name: item.name,
            local_id: existing.fd_id,
            old_data: existing,
            new_data: mapped
          });
        } else {
          // 新增
          await orgPersonRepository.create(mapped);
          insertCount++;
          details.push({
            sync_log_id: syncLogId,
            data_type: 'person',
            action: 'insert',
            ekp_id: item.id,
            ekp_name: item.name,
            new_data: mapped
          });
        }
      } catch (error) {
        console.error(`[处理人员] 处理失败，ID: ${item.id}`, error);
        errorCount++;
        details.push({
          sync_log_id: syncLogId,
          data_type: 'person',
          action: 'error',
          ekp_id: item.id,
          ekp_name: item.name,
          error_message: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return { insert: insertCount, update: updateCount, delete: 0, error: errorCount, details };
  }

  /**
   * 处理软删除（全量同步）
   */
  private async processSoftDelete(ekpData: EKPOrgElement[], syncLogId: string): Promise<{
    count: number;
    details: any[];
  }> {
    // 获取EKP中的所有ID
    const ekpIds = new Set(ekpData.map(item => item.id));

    let deleteCount = 0;
    const details: any[] = [];

    // 获取本地所有组织元素
    const localElements = await orgElementRepository.findList({});
    for (const element of localElements) {
      if (!ekpIds.has(element.fd_id)) {
        // 软删除
        await orgElementRepository.update(element.fd_id, { fd_is_available: false });
        deleteCount++;
        details.push({
          sync_log_id: syncLogId,
          data_type: this.getOrgTypeByValue(element.fd_org_type),
          action: 'delete',
          ekp_id: element.fd_id,
          ekp_name: element.fd_name,
          local_id: element.fd_id,
          new_data: { fd_is_available: false }
        });
      }
    }

    // 获取本地所有人员
    const localPersons = await orgPersonRepository.findList({});
    for (const person of localPersons.data) {
      if (!ekpIds.has(person.fd_id)) {
        // 软删除
        await orgPersonRepository.update(person.fd_id, { fd_is_login_enabled: false });
        deleteCount++;
        details.push({
          sync_log_id: syncLogId,
          data_type: 'person',
          action: 'delete',
          ekp_id: person.fd_id,
          ekp_name: person.fd_name,
          local_id: person.fd_id,
          new_data: { fd_is_login_enabled: false }
        });
      }
    }

    return { count: deleteCount, details };
  }

  /**
   * 根据值获取组织类型字符串
   */
  private getOrgTypeByValue(value: number): string {
    const typeMap: Record<number, string> = {
      1: 'org',
      2: 'dept',
      3: 'post',
      4: 'group'
    };
    return typeMap[value] || 'unknown';
  }
}

// 导出单例
export const orgSyncService = new OrgSyncService();
