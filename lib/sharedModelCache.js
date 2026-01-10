const crypto = require('crypto');

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 500;

const cache = new Map();

const normalizeBaseUrl = (baseUrl) => String(baseUrl || '').replace(/\/+$/, '');

const hashToken = (token) => {
  const clean = String(token || '').trim();
  if (!clean) return '';
  return crypto.createHash('sha256').update(clean).digest('hex').slice(0, 12);
};

const buildKey = (context) => {
  if (!context) return '';
  const baseUrl = normalizeBaseUrl(context.baseUrl);
  const userId = context.userId != null ? String(context.userId) : '';
  const authHeaderType = context.authHeaderType != null ? String(context.authHeaderType) : 'NEW_API';
  const channelId = context.channelId != null ? String(context.channelId) : '';
  const tokenHash = hashToken(context.token);
  return [baseUrl, userId, authHeaderType, channelId, tokenHash].join('|');
};

const normalizeModels = (models) => {
  if (!Array.isArray(models)) return [];
  const normalized = models
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (typeof item === 'number') return String(item);
      if (item && typeof item === 'object') {
        const candidate = item.model ?? item.name ?? item.id ?? item.value;
        if (candidate == null) return '';
        return String(candidate).trim();
      }
      return '';
    })
    .filter(item => item && item.length > 0);

  return Array.from(new Set(normalized));
};

const pruneCache = () => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.timestamp > DEFAULT_TTL_MS) {
      cache.delete(key);
    }
  }

  while (cache.size > MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
};

const getProviderModels = (context) => {
  const key = buildKey(context);
  if (!key) return null;
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > DEFAULT_TTL_MS) {
    cache.delete(key);
    return null;
  }
  entry.lastAccess = Date.now();
  return entry.data;
};

const setProviderModels = (context, models) => {
  const key = buildKey(context);
  if (!key) return null;
  const normalized = normalizeModels(models);
  if (normalized.length === 0) return null;

  cache.set(key, {
    data: normalized,
    timestamp: Date.now(),
    lastAccess: Date.now()
  });

  pruneCache();
  return normalized;
};

const deleteProviderModels = (context) => {
  const key = buildKey(context);
  if (!key) return;
  cache.delete(key);
};

module.exports = {
  getProviderModels,
  setProviderModels,
  deleteProviderModels
};
