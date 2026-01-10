/**
 * 统一 API 定义
 * 后端所有 API 端点在此集中定义
 *
 * 注意事项：
 * - GET 请求使用 query 参数
 * - POST 请求使用 body 参数
 */

// 配置相关
export const CONFIG = {
  GET: '/api/config',
  POST: '/api/config'
};

// 连接测试
export const TEST_CONNECTION = '/api/test-connection';

// 渠道相关
export const CHANNELS = '/api/channels';           // POST - 获取渠道列表
export const CHANNEL_MODELS = '/api/channel-models'; // POST - 获取渠道模型
export const CHANNEL_DETAIL = '/api/channel-detail'; // POST - 获取渠道详情

// 全局模型
export const GLOBAL_MODELS = '/api/global-models';

// 同步相关
export const SYNC_MODELS = '/api/sync-models';

// Checkpoint
export const CHECKPOINT = {
  CREATE: '/api/checkpoint/create',
  RESTORE: '/api/checkpoint/restore',
  LATEST: '/api/checkpoint/latest'
};

// 一键更新
export const ONE_CLICK_UPDATE = '/api/one-click-update';
export const PREVIEW_ONE_CLICK_UPDATE = '/api/preview-one-click-update';
export const ONE_CLICK_UPDATE_JOB = {
  START: '/api/one-click-update-job',
  STATUS: (jobId) => `/api/one-click-update-job/${encodeURIComponent(jobId)}`,
  CANCEL: (jobId) => `/api/one-click-update-job/${encodeURIComponent(jobId)}/cancel`
};

// 调试
export const DEBUG_API = '/api/debug-api';

// 健康检查
export const HEALTH = '/api/health';
export const STATUS = '/api/status';

// 统一导出
export const API_ENDPOINTS = {
  CONFIG,
  TEST_CONNECTION,
  CHANNELS,
  CHANNEL_MODELS,
  CHANNEL_DETAIL,
  GLOBAL_MODELS,
  SYNC_MODELS,
  CHECKPOINT,
  ONE_CLICK_UPDATE,
  PREVIEW_ONE_CLICK_UPDATE,
  ONE_CLICK_UPDATE_JOB,
  DEBUG_API,
  HEALTH,
  STATUS
};

// API 响应类型定义
export const API_RESPONSE = {
  SUCCESS: 'success',
  ERROR: 'message'
};

export default API_ENDPOINTS;
