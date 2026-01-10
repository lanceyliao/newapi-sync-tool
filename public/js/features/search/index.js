/**
 * 搜索功能模块
 */
import { state, modelCache } from '../../core/state.js';
import { getChannelModels } from '../../api/channels.js';
import { STORAGE_KEYS, SEARCH_CONFIG } from '../../core/constants.js';
import { $ } from '../../ui/dom.js';
import { notifications } from '../../ui/notifications.js';

const toModelArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value
      .split(/[,;|\n]/)
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }
  if (value && typeof value === 'object') {
    if (Array.isArray(value.data)) return value.data;
    if (Array.isArray(value.models)) return value.models;
    if (Array.isArray(value.items)) return value.items;
    if (Array.isArray(value.list)) return value.list;
  }
  return [];
};

const normalizeModels = (value) => {
  const list = toModelArray(value);
  const normalized = list
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

const getModelsForSearch = async (channel) => {
  const channelId = channel?.id;
  if (channelId == null) return [];

  const cached = modelCache.get(channelId);
  if (cached) return cached;

  const modelsResult = await getChannelModels(state.config, channelId);
  if (modelsResult && modelsResult.success) {
    const normalized = normalizeModels(modelsResult.data);
    modelCache.set(channelId, normalized);
    return normalized;
  }

  return normalizeModels(modelsResult?.data);
};

/**
 * 全局搜索
 */
export const globalSearch = async (searchTerm) => {
  const normalizedTerm = String(searchTerm ?? '').trim();
  if (!normalizedTerm) {
    notifications.warning('请输入搜索关键词');
    return [];
  }

  const searchInput = $('globalSearchInput');
  if (searchInput) searchInput.value = normalizedTerm;

  // 保存搜索历史
  saveSearchHistory(normalizedTerm);

  // 显示加载状态
  const resultsContainer = $('globalSearchResults');
  if (resultsContainer) {
    resultsContainer.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i> 搜索中...</div>';
  }

  const results = [];
  const searchLower = normalizedTerm.toLowerCase();

  try {
    // 并发搜索（限制并发数）
    const batchSize = SEARCH_CONFIG.batchSize;
    for (let i = 0; i < state.channels.length; i += batchSize) {
      const batch = state.channels.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (channel) => {
          try {
            const models = await getModelsForSearch(channel);
            if (models.length > 0) {
              const matched = models.filter(m => m.toLowerCase().includes(searchLower));

              if (matched.length > 0) {
                return {
                  channelId: channel.id,
                  channelName: channel.name,
                  models: matched
                };
              }
            }
          } catch (error) {
            console.warn(`搜索渠道 ${channel.name} 失败:`, error.message);
          }
          return null;
        })
      );

      results.push(...batchResults.filter(r => r !== null));
    }

    // 渲染结果
    renderSearchResults(results);

    const totalCount = results.reduce((sum, r) => sum + r.models.length, 0);
    notifications.success(`找到 ${totalCount} 个匹配的模型`);

    state.globalSearchResults = results;
    return results;
  } catch (error) {
    console.error('搜索失败:', error);
    notifications.error(`搜索失败: ${error.message}`);
    return [];
  }
};

/**
 * 深度搜索（搜索所有渠道的所有模型）
 */
export const deepSearch = async (searchTerm) => {
  const normalizedTerm = String(searchTerm ?? '').trim();
  if (!normalizedTerm) {
    notifications.warning('请输入搜索关键词');
    return [];
  }

  const resultsContainer = $('globalSearchResults');
  if (resultsContainer) {
    resultsContainer.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i> 正在进行深度搜索...</div>';
  }

  // 深度搜索：搜索所有模型的每个字符
  const allModels = new Set();
  const results = [];
  const searchLower = normalizedTerm.toLowerCase();

  try {
    const batchSize = SEARCH_CONFIG.batchSize;
    for (let i = 0; i < state.channels.length; i += batchSize) {
      const batch = state.channels.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (channel) => {
          try {
            return await getModelsForSearch(channel);
          } catch (error) {
            console.warn(`获取渠道 ${channel.name} 模型失败:`, error.message);
            return [];
          }
        })
      );

      batchResults.forEach((models) => {
        if (!Array.isArray(models)) return;
        models.forEach(model => allModels.add(model));
      });
    }

    // 模糊匹配
    const matched = Array.from(allModels).filter(model => {
      // 包含匹配
      if (model.toLowerCase().includes(searchLower)) return true;

      // 字符子串匹配（深度搜索）
      const modelChars = model.toLowerCase().split('');
      const searchChars = searchLower.split('');
      let charMatch = 0;
      for (const char of searchChars) {
        if (modelChars.includes(char)) {
          charMatch++;
        }
      }
      return charMatch >= Math.min(searchChars.length * 0.5, 2);
    });

    renderSearchResults([{
      channelName: '深度搜索结果',
      models: matched
    }]);

    notifications.success(`深度搜索找到 ${matched.length} 个匹配`);
    return matched;
  } catch (error) {
    console.error('深度搜索失败:', error);
    notifications.error(`深度搜索失败: ${error.message}`);
    return [];
  }
};

/**
 * 渲染搜索结果
 */
export const renderSearchResults = (results) => {
  const container = $('globalSearchResults');
  if (!container) return;

  if (!results || results.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i> 未找到匹配的模型</div>';
    return;
  }

  const totalCount = results.reduce((sum, r) => sum + r.models.length, 0);

  container.innerHTML = `
    <div class="search-summary">
      <span class="summary-text">找到 ${totalCount} 个匹配的模型，分布在 ${results.length} 个渠道</span>
    </div>
    <div class="search-results-list">
      ${results.map(result => `
        <div class="search-channel-group">
          <div class="channel-group-header">
            <i class="fas fa-server"></i>
            <span class="channel-name">${result.channelName}</span>
            <span class="models-count">${result.models.length} 个</span>
          </div>
          <div class="channel-group-models">
            ${result.models.map(model => `
              <label class="model-item">
                <input type="checkbox" data-model="${model}" data-channel="${result.channelName}" data-channel-id="${result.channelId || ''}">
                <span class="model-name">${model}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // 绑定复选框事件
  bindSearchCheckboxEvents();
};

/**
 * 绑定搜索结果复选框事件
 */
const bindSearchCheckboxEvents = () => {
  const container = $('globalSearchResults');
  if (!container) return;

  container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const item = cb.closest('.model-item');
      if (item) {
        item.classList.toggle('selected', cb.checked);
      }
    });
  });
};

/**
 * 添加搜索选中的模型到映射
 */
export const addSearchSelectionToMapping = () => {
  const globalSearchResults = $('globalSearchResults');
  const checkboxes = globalSearchResults && globalSearchResults.querySelectorAll('input[type="checkbox"]:checked');
  if (!checkboxes || checkboxes.length === 0) {
    notifications.warning('请先选择模型');
    return;
  }

  let count = 0;
  checkboxes.forEach(cb => {
    const model = cb.dataset.model;
    const channelName = cb.dataset.channel || '未知渠道';
    const channelId = cb.dataset.channelId;

    if (!state.mappings.hasOwnProperty(model)) {
      state.mappings[model] = model;
      state.modelChannelMap[model] = { id: channelId, name: channelName };
      state.selectedModels.push(model);
      count++;
    }
  });

  if (count > 0) {
    // 保存到 localStorage
    try {
      localStorage.setItem(STORAGE_KEYS.MODEL_MAPPINGS, JSON.stringify(state.mappings));
      localStorage.setItem('newapi-model-channel-map', JSON.stringify(state.modelChannelMap));
    } catch (error) {
      console.warn('保存映射失败:', error);
    }

    notifications.success(`已添加 ${count} 个模型到映射`);

    // 跳转到映射页面
    if (window.app && typeof window.app.switchPage === 'function') {
      window.app.switchPage('mapping', '模型映射');
      setTimeout(() => {
        if (window.mappingModule) {
          window.mappingModule.renderSelectedModels();
          window.mappingModule.renderMappingTable();
        }
      }, 100);
    }
  }

  // 关闭搜索弹窗
  closeSearchModal();
};

/**
 * 全选搜索结果
 */
export const selectAllSearchResults = () => {
  const container = $('globalSearchResults');
  if (!container) return;

  container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.checked = true;
    const item = cb.closest('.model-item');
    if (item) item.classList.add('selected');
  });
};

/**
 * 取消全选搜索结果
 */
export const deselectAllSearchResults = () => {
  const container = $('globalSearchResults');
  if (!container) return;

  container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
    const item = cb.closest('.model-item');
    if (item) item.classList.remove('selected');
  });
};

/**
 * 保存搜索历史
 */
export const saveSearchHistory = (searchTerm) => {
  if (!state.searchHistory) {
    state.searchHistory = [];
  }

  // 移除已存在的相同搜索词
  state.searchHistory = state.searchHistory.filter(term => term !== searchTerm);

  // 添加到开头
  state.searchHistory.unshift(searchTerm);

  // 限制历史数量
  if (state.searchHistory.length > SEARCH_CONFIG.historyMaxLength) {
    state.searchHistory = state.searchHistory.slice(0, SEARCH_CONFIG.historyMaxLength);
  }

  // 保存到本地存储
  try {
    localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(state.searchHistory));
  } catch (error) {
    console.warn('保存搜索历史失败:', error);
  }
};

/**
 * 加载搜索历史
 */
export const loadSearchHistory = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY);
    if (saved) {
      state.searchHistory = JSON.parse(saved);
    }
  } catch (error) {
    console.warn('加载搜索历史失败:', error);
    state.searchHistory = [];
  }
};

/**
 * 清空搜索历史
 */
export const clearSearchHistory = () => {
  state.searchHistory = [];
  localStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
  notifications.success('搜索历史已清除');
};

/**
 * 打开搜索弹窗
 */
export const openSearchModal = () => {
  const modal = $('globalSearchModal');
  if (modal) {
    modal.classList.add('show');
    modal.classList.remove('active');

    // 加载搜索历史
    loadSearchHistory();
    displaySearchHistory();
  }
};

/**
 * 关闭搜索弹窗
 */
export const closeSearchModal = () => {
  const modal = $('globalSearchModal');
  if (modal) {
    modal.classList.remove('show');
    modal.classList.remove('active');
  }
};

/**
 * 显示搜索历史
 */
export const displaySearchHistory = () => {
  const container = $('searchHistoryList');
  if (!container) return;

  if (!state.searchHistory || state.searchHistory.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无搜索历史</div>';
    return;
  }

  container.innerHTML = state.searchHistory.map(term => `
    <div class="history-item" onclick="window.searchModule.useHistory('${term}')">
      <i class="fas fa-history"></i>
      <span>${term}</span>
    </div>
  `).join('');
};

/**
 * 使用搜索历史中的词
 */
export const useHistory = (term) => {
  const input = $('globalSearchInput');
  if (input) input.value = term;
  globalSearch(term);
};

export default {
  globalSearch,
  deepSearch,
  renderSearchResults,
  addSearchSelectionToMapping,
  selectAllSearchResults,
  deselectAllSearchResults,
  saveSearchHistory,
  loadSearchHistory,
  clearSearchHistory,
  openSearchModal,
  closeSearchModal,
  displaySearchHistory,
  useHistory
};
