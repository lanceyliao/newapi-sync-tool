/**
 * 常量定义
 */

// 版本信息
export const VERSION = '4.0';
export const GITHUB_REPO = 'ZiChuanShanFeng/newapi-sync-tool';

// 默认配置
export const DEFAULT_CONFIG = {
  baseUrl: '',
  token: '',
  userId: '1',
  authHeaderType: 'NEW_API',
  proxyMode: 'disabled',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  modelCacheRefreshMinutes: 5
};

// 缓存配置
export const CACHE_CONFIG = {
  maxAge: DEFAULT_CONFIG.modelCacheRefreshMinutes * 60 * 1000,
  maxSize: 100
};

// 搜索配置
export const SEARCH_CONFIG = {
  historyMaxLength: 10,
  batchSize: 10,
  debounceDelay: 300
};

// 同步配置
export const SYNC_CONFIG = {
  batchSize: 5,
  batchDelay: 500,
  progressUpdateInterval: 100
};

// 主题
export const THEME = {
  LIGHT: 'light',
  DARK: 'dark'
};

// 存储键名
export const STORAGE_KEYS = {
  CONFIG: 'newapi-config',
  CHANNEL_SELECTIONS: 'newapi-channel-selections',
  MODEL_MAPPINGS: 'newapi-model-mappings',
  SEARCH_HISTORY: 'newapi-search-history',
  RULES: 'newapi-rules',
  THEME: 'newapi-theme',
  CHECKPOINT: 'newapi-last-checkpoint'
};

// 事件名称
export const EVENTS = {
  CONFIG_LOADED: 'config:loaded',
  CONFIG_SAVED: 'config:saved',
  CHANNELS_LOADED: 'channels:loaded',
  CHANNELS_UPDATED: 'channels:updated',
  MODELS_SELECTED: 'models:selected',
  MODELS_UPDATED: 'models:updated',
  MAPPING_CHANGED: 'mapping:changed',
  SYNC_STARTED: 'sync:started',
  SYNC_PROGRESS: 'sync:progress',
  SYNC_COMPLETED: 'sync:completed',
  SEARCH_STARTED: 'search:started',
  SEARCH_COMPLETED: 'search:completed',
  THEME_CHANGED: 'theme:changed',
  ERROR: 'error'
};

export default {
  VERSION,
  GITHUB_REPO,
  DEFAULT_CONFIG,
  CACHE_CONFIG,
  SEARCH_CONFIG,
  SYNC_CONFIG,
  THEME,
  STORAGE_KEYS,
  EVENTS
};
