/**
 * 同步 API 模块
 * 基于 api/index.js 中的函数
 */
import {
  syncModels as fetchSyncModels,
  createCheckpoint as fetchCreateCheckpoint,
  restoreCheckpoint as fetchRestoreCheckpoint,
  previewOneClickUpdate as fetchPreviewUpdate,
  executeOneClickUpdate as fetchExecuteUpdate,
  startOneClickUpdateJob as fetchStartOneClickUpdateJob,
  startOneClickUpdateJobFromPreview as fetchStartOneClickUpdateJobFromPreview,
  getOneClickUpdateJob as fetchGetOneClickUpdateJob,
  cancelOneClickUpdateJob as fetchCancelOneClickUpdateJob
} from './index.js';

/**
 * 同步模型映射
 */
export const syncModels = async (config, modelMapping, mode = 'append', channelIds = null) => {
  return fetchSyncModels(modelMapping, mode, channelIds);
};

/**
 * 创建检查点
 */
export const createCheckpoint = async (channelIds = null, options = {}) => {
  return fetchCreateCheckpoint(channelIds, options);
};

/**
 * 回退检查点
 */
export const restoreCheckpoint = async (checkpointId = null, options = {}) => {
  return fetchRestoreCheckpoint(checkpointId, options);
};

/**
 * 一键更新（预览）
 */
export const previewOneClickUpdate = async (channelIds = null) => {
  return fetchPreviewUpdate(channelIds);
};

/**
 * 一键更新（执行）
 */
export const executeOneClickUpdate = async (channelIds = null, dryRun = false) => {
  return fetchExecuteUpdate(channelIds, dryRun);
};

/**
 * 一键更新（Job 模式）：启动任务
 */
export const startOneClickUpdateJob = async (channelIds = null, dryRun = true, options = {}) => {
  return fetchStartOneClickUpdateJob(channelIds, dryRun, options);
};

/**
 * 一键更新（Job 模式）：基于预览结果执行（复用预览结果）
 */
export const startOneClickUpdateJobFromPreview = async (channelIds = null, previewJobId, options = {}, selectedMappings = null) => {
  return fetchStartOneClickUpdateJobFromPreview(channelIds, previewJobId, options, selectedMappings);
};

/**
 * 一键更新（Job 模式）：查询任务
 */
export const getOneClickUpdateJob = async (jobId, cursor = 0) => {
  return fetchGetOneClickUpdateJob(jobId, cursor);
};

/**
 * 一键更新（Job 模式）：取消任务
 */
export const cancelOneClickUpdateJob = async (jobId) => {
  return fetchCancelOneClickUpdateJob(jobId);
};

/**
 * 批量同步多个渠道
 */
export const batchSync = async (config, channelMappings, onProgress) => {
  const results = {
    success: 0,
    failed: 0,
    unchanged: 0,
    errors: []
  };

  const total = channelMappings.length;

  for (let i = 0; i < channelMappings.length; i++) {
    const { channelId, models, mapping } = channelMappings[i];

    if (onProgress) {
      onProgress({
        current: i + 1,
        total,
        percent: Math.round(((i + 1) / total) * 100),
        channelId
      });
    }

    try {
      const result = await fetchSyncModels(mapping, 'append', [channelId]);
      if (result.success) {
        if (result.stats) {
          results.success += result.stats.success || 0;
          results.failed += result.stats.failed || 0;
          results.unchanged += result.stats.unchanged || 0;
        } else {
          results.success++;
        }
      } else {
        results.failed++;
        results.errors.push({ channelId, error: result.message });
      }
    } catch (error) {
      results.failed++;
      results.errors.push({ channelId, error: error.message });
    }
  }

  return results;
};

export default {
  syncModels,
  previewOneClickUpdate,
  executeOneClickUpdate,
  startOneClickUpdateJob,
  startOneClickUpdateJobFromPreview,
  getOneClickUpdateJob,
  cancelOneClickUpdateJob,
  createCheckpoint,
  restoreCheckpoint,
  batchSync
};
