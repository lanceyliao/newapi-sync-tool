/**
 * 模型 API 模块
 * 基于 api/index.js 中的函数
 */
import { getGlobalModels as fetchGlobalModels, getChannelModels } from './index.js';

/**
 * 获取全局模型列表
 */
export const getGlobalModels = async (config) => {
  return fetchGlobalModels();
};

/**
 * 搜索模型
 */
export const searchModels = async (config, channels, searchTerm) => {
  const results = [];

  for (const channel of channels) {
    try {
      const modelsResult = await getChannelModels(channel.id);
      if (modelsResult.success && modelsResult.data) {
        const matched = modelsResult.data.filter(m =>
          m.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (matched.length > 0) {
          results.push({
            channelId: channel.id,
            channelName: channel.name,
            models: matched
          });
        }
      }
    } catch (error) {
      console.warn(`搜索渠道 ${channel.name} 失败:`, error.message);
    }
  }

  return results;
};

export default {
  getGlobalModels,
  searchModels
};
