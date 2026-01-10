/**
 * 渠道 API 模块
 * 基于 api/index.js 中的 request 函数
 */
import { getChannels as fetchChannels, getChannelModels as fetchChannelModels } from './index.js';

/**
 * 获取渠道列表
 */
export const getChannels = async (config) => {
  return fetchChannels();
};

/**
 * 获取渠道模型列表
 */
export const getChannelModels = async (config, channelId, options = {}) => {
  return fetchChannelModels(channelId, options);
};

/**
 * 获取渠道详情
 */
export const getChannelDetail = async (config, channelId) => {
  // 使用主模块的 getChannelDetail
  const { getChannelDetail: fetchDetail } = await import('./index.js');
  return fetchDetail(channelId);
};

/**
 * 获取所有渠道的模型（批量）
 */
export const getAllChannelsModels = async (config, channels, maxConcurrency = 3) => {
  const results = new Map();

  const executeBatch = async (batch) => {
    const promises = batch.map(async (channel) => {
      try {
        const models = await fetchChannelModels(channel.id);
        results.set(channel.id, { success: true, data: models });
      } catch (error) {
        results.set(channel.id, { success: false, error: error.message });
      }
    });
    await Promise.all(promises);
  };

  for (let i = 0; i < channels.length; i += maxConcurrency) {
    const batch = channels.slice(i, i + maxConcurrency);
    await executeBatch(batch);
  }

  return results;
};

export default {
  getChannels,
  getChannelModels,
  getChannelDetail,
  getAllChannelsModels
};
