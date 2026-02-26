/**
 * 统一 API 模块
 * 集中管理所有 API 请求
 */
import { state } from '../core/state.js';
import { API_ENDPOINTS } from './endpoints.js';

// 通用请求函数
export async function request(endpoint, data = null, method = 'POST') {
  const normalizedMethod = String(method || 'POST').toUpperCase();
  const opts = {
    method: normalizedMethod,
    headers: { 'Content-Type': 'application/json' }
  };

  // 合并配置和数据（GET 默认不附带配置，避免泄露敏感信息）
  const requestData = normalizedMethod === 'GET'
    ? (data || null)
    : (data ? { ...state.config, ...data } : state.config);

  let url = endpoint;
  if (normalizedMethod === 'GET') {
    if (requestData && Object.keys(requestData).length > 0) {
      const params = new URLSearchParams(requestData);
      const query = params.toString();
      if (query) {
        url = endpoint.includes('?') ? `${endpoint}&${query}` : `${endpoint}?${query}`;
      }
    }
  } else {
    opts.body = JSON.stringify(requestData || {});
  }

  const res = await fetch(url, opts);
  const rawText = await res.text();

  if (!rawText || !rawText.trim()) {
    return {
      success: false,
      message: '服务端返回空响应体',
      error: 'EMPTY_RESPONSE_BODY',
      status: res.status,
      statusText: res.statusText
    };
  }

  try {
    return JSON.parse(rawText);
  } catch (error) {
    return {
      success: false,
      message: '服务端返回了非 JSON 响应',
      error: 'INVALID_JSON_RESPONSE',
      status: res.status,
      statusText: res.statusText,
      raw: rawText
    };
  }
}

// ==================== 配置相关 ====================
export const loadConfig = async () => request(API_ENDPOINTS.CONFIG.GET, null, 'GET');
export const saveConfig = async (config) => request(API_ENDPOINTS.CONFIG.POST, config);

// ==================== 连接测试 ====================
export const testConnection = async (quickTest = true) =>
  request(API_ENDPOINTS.TEST_CONNECTION, { quickTest });

// ==================== 渠道相关 ====================
export const getChannels = async () => request(API_ENDPOINTS.CHANNELS);
export const getChannelModels = async (channelId, options = {}) =>
  request(API_ENDPOINTS.CHANNEL_MODELS, { channelId, ...options });
export const getChannelDetail = async (channelId) =>
  request(API_ENDPOINTS.CHANNEL_DETAIL, { channelId });

// ==================== 模型相关 ====================
export const getGlobalModels = async () => request(API_ENDPOINTS.GLOBAL_MODELS);

// ==================== 同步相关 ====================
export const syncModels = async (modelMapping, mode = 'append', channelIds = null) =>
  request(API_ENDPOINTS.SYNC_MODELS, {
    modelMapping,
    modelUpdateMode: mode,
    channelIds
  });

// ==================== 检查点相关 ====================
export const createCheckpoint = async (channelIds = null, options = {}) =>
  request(API_ENDPOINTS.CHECKPOINT.CREATE, {
    channelIds,
    ...options
  });

export const restoreCheckpoint = async (checkpointId = null, options = {}) =>
  request(API_ENDPOINTS.CHECKPOINT.RESTORE, {
    checkpointId,
    ...options
  });

// ==================== 一键更新 ====================
export const previewOneClickUpdate = async (channelIds = null) =>
  request(API_ENDPOINTS.PREVIEW_ONE_CLICK_UPDATE, { channelIds });

export const executeOneClickUpdate = async (channelIds = null, dryRun = false) =>
  request(API_ENDPOINTS.ONE_CLICK_UPDATE, { channelIds, dryRun });

export const oneClickUpdate = async (channelIds = null, dryRun = true) =>
  request(API_ENDPOINTS.ONE_CLICK_UPDATE, { channelIds, dryRun });

// ==================== 一键更新（Job 模式） ====================
export const startOneClickUpdateJob = async (channelIds = null, dryRun = true, options = {}) =>
  request(API_ENDPOINTS.ONE_CLICK_UPDATE_JOB.START, {
    channelIds,
    dryRun,
    options,
    rules: options.rules || null  // 传递用户规则
  });

export const startOneClickUpdateJobFromPreview = async (channelIds = null, previewJobId, options = {}, selectedMappings = null) =>
  request(API_ENDPOINTS.ONE_CLICK_UPDATE_JOB.START, {
    channelIds,
    dryRun: false,
    fromPreviewJobId: previewJobId,
    options,
    rules: options.rules || null,  // 传递用户规则
    selectedMappings  // 传递选中的映射
  });

export const getOneClickUpdateJob = async (jobId, cursor = 0) =>
  request(API_ENDPOINTS.ONE_CLICK_UPDATE_JOB.STATUS(jobId), { cursor }, 'GET');

export const cancelOneClickUpdateJob = async (jobId) =>
  request(API_ENDPOINTS.ONE_CLICK_UPDATE_JOB.CANCEL(jobId), null, 'POST');

// ==================== 调试相关 ====================
export const debugAPI = async () => request(API_ENDPOINTS.DEBUG_API);

// ==================== 健康检查 ====================
export const healthCheck = async () => request(API_ENDPOINTS.HEALTH, null, 'GET');
export const getStatus = async () => request(API_ENDPOINTS.STATUS, null, 'GET');
