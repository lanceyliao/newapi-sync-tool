/**
 * 模型映射模块
 */
import { state, setOps } from '../../core/state.js';
import { $ } from '../../ui/dom.js';
import { notifications } from '../../ui/notifications.js';
import { rulesManager } from '../../rules/index.js';
import { STORAGE_KEYS } from '../../core/constants.js';

// Smart name matching rules. Avoid the `g` flag to prevent lastIndex issues.
const SMART_MATCH_PREFIX_RULES = [
  /^\s*\[[^\]]+\]\s*/u,
  /^\s*\u3010[^\u3011]+\u3011\s*/u,
  /^\s*\([^)]*\)\s*/u,
  /^\s*\uFF08[^\uFF09]+\uFF09\s*/u,
  /^\s*<[^>]+>\s*/u
];
const SMART_MATCH_SUFFIX_RULES = {
  channel: [
    /(?:-|_)\[?\u6e20\u9053[_\s]?\d+\]?$/i,
    /(?:-|_|\s+)?\[[^\]]+\]$/u,
    /(?:-|_|\s+)?\u3010[^\u3011]+\u3011$/u,
    /(?:-|_|\s+)?\([^)]*\)$/u,
    /(?:-|_|\s+)?\uFF08[^\uFF09]+\uFF09$/u,
    /(?:-|_|\s+)?<[^>]+>$/u
  ],
  date: [
    /(?:-|_)(?:20\d{2})(?:\d{2})(?:\d{2})$/i,
    /(?:-|_)(?:20\d{2})[-_.]\d{2}[-_.]\d{2}$/i
  ],
  version: [
    /(?:-|_|\s+)(?:v|ver|version)\d+(?:\.\d+){0,3}$/i,
    /(?:-|_|\s+)(?:instruct|instruction|chat|assistant|next|thinking|reasoning|reasoner|base|sft|dpo|rlhf|it)(?:-|_|\s+)(?:a\d+(?:\.\d+)?b|\d+(?:\.\d+)?b|\d+(?:\.\d+)?t|\d+(?:\.\d+)?k)$/i,
    /(?:-|_|\s+)(?:instruct|instruction|chat|assistant|next|thinking|reasoning|reasoner|base|sft|dpo|rlhf|it)$/i,
    /(?:-|_|\s+)(?:a\d+(?:\.\d+)?b|\d+(?:\.\d+)?b|\d+(?:\.\d+)?t|\d+(?:\.\d+)?k)$/i
  ],
  stage: [/(?:-|_|\s+)(preview|beta|alpha|test|rc\d*|experimental|exp|latest|stable)$/i],
  provider: [
    /(?:-|_|\s+)(official|internal|public|private|dev|test)$/i,
    /(?:-|_|\s+)[\u4e00-\u9fa5]{1,6}$/u
  ]
};
const SMART_MATCH_DATE_BEFORE_STAGE_RULES = [
  /(?:-|_|\s+)(20\d{2}\d{2}\d{2})(?:-|_|\s+)(preview|beta|alpha|test|rc\d*|experimental|exp|latest|stable|instruct|instruction|chat|assistant|next|thinking|reasoning|reasoner|base|sft|dpo|rlhf|it)$/i,
  /(?:-|_|\s+)(20\d{2})[-_.]\d{2}[-_.]\d{2}(?:-|_|\s+)(preview|beta|alpha|test|rc\d*|experimental|exp|latest|stable|instruct|instruction|chat|assistant|next|thinking|reasoning|reasoner|base|sft|dpo|rlhf|it)$/i
];

// 注意：移除了 DEFAULT_MERGE_RULES，因为模型合并功能已被简化
// 如需合并功能，用户可通过自定义规则实现

let currentMappingFilter = 'all';
let currentMappingSearch = '';
const selectedMappingSources = new Set();
let mappingSelectionBound = false;
let lastAutoSmartMatchSignature = '';
let editingRuleId = null;

const getMappingStatsFromState = () => {
  const models = state.selectedModels;
  syncSelectedMappingSources();
  let changedCount = 0;

  for (const source of models) {
    const target = state.mappings[source] || source;
    if (source !== target) {
      changedCount++;
    }
  }

  return {
    total: models.length,
    changed: changedCount,
    unchanged: models.length - changedCount
  };
};

const updateMappingStats = (visibleCount) => {
  const statsEl = $('previewStats');
  if (!statsEl) return;

  const { total, changed, unchanged } = getMappingStatsFromState();
  const displayCount = typeof visibleCount === 'number' ? visibleCount : total;

  if (currentMappingFilter === 'all' && !currentMappingSearch) {
    statsEl.textContent = `共 ${total} 个映射，已修改 ${changed}，未修改 ${unchanged}`;
    return;
  }

  const filterLabels = {
    changed: '已修改',
    unchanged: '未修改',
    all: '全部'
  };
  const parts = [];

  if (currentMappingFilter !== 'all') {
    parts.push(`筛选 ${filterLabels[currentMappingFilter] || currentMappingFilter}`);
  }
  if (currentMappingSearch) {
    parts.push(`匹配 "${currentMappingSearch}"`);
  }

  const suffix = parts.length ? `（${parts.join('，')}）` : '';
  statsEl.textContent = `共 ${displayCount} 个映射${suffix}`;
};

const syncSelectedMappingSources = () => {
  if (state.selectedModels.length === 0) {
    selectedMappingSources.clear();
    return;
  }

  for (const source of Array.from(selectedMappingSources)) {
    if (!state.selectedModels.includes(source)) {
      selectedMappingSources.delete(source);
    }
  }
};

const getVisibleMappingCheckboxes = () => {
  const rows = Array.from(document.querySelectorAll('#mappingTableBody tr'));
  return rows
    .filter(row => row.style.display !== 'none')
    .map(row => row.querySelector('.mapping-select'))
    .filter(Boolean);
};

const updateMappingSelectionControls = () => {
  const deleteBtn = $('deleteSelectedMappingsBtn');
  if (deleteBtn) {
    deleteBtn.disabled = selectedMappingSources.size === 0;
  }

  const selectAll = $('mappingSelectAll');
  if (!selectAll) return;

  const visibleCheckboxes = getVisibleMappingCheckboxes();
  if (visibleCheckboxes.length === 0) {
    selectAll.checked = false;
    selectAll.indeterminate = false;
    selectAll.disabled = true;
    return;
  }

  selectAll.disabled = false;
  const checkedCount = visibleCheckboxes.filter(cb => cb.checked).length;
  selectAll.checked = checkedCount > 0 && checkedCount === visibleCheckboxes.length;
  selectAll.indeterminate = checkedCount > 0 && checkedCount < visibleCheckboxes.length;
};

const setMappingSelection = (checkbox, selected) => {
  const source = checkbox.dataset.source;
  if (!source) return;

  checkbox.checked = selected;
  if (selected) {
    selectedMappingSources.add(source);
  } else {
    selectedMappingSources.delete(source);
  }

  const row = checkbox.closest('tr');
  if (row) {
    row.classList.toggle('selected', selected);
  }
};

const bindMappingSelectionEvents = () => {
  const checkboxes = document.querySelectorAll('#mappingTableBody .mapping-select');
  checkboxes.forEach(cb => {
    const row = cb.closest('tr');
    if (row) {
      row.classList.toggle('selected', cb.checked);
    }
    cb.addEventListener('change', () => {
      setMappingSelection(cb, cb.checked);
      updateMappingSelectionControls();
    });
  });

  const selectAll = $('mappingSelectAll');
  if (selectAll && !mappingSelectionBound) {
    selectAll.addEventListener('change', () => {
      const visibleCheckboxes = getVisibleMappingCheckboxes();
      visibleCheckboxes.forEach(cb => setMappingSelection(cb, selectAll.checked));
      updateMappingSelectionControls();
    });
    mappingSelectionBound = true;
  }
};

const applyMappingFilters = () => {
  const rows = document.querySelectorAll('#mappingTableBody tr');
  const keyword = (currentMappingSearch || '').trim().toLowerCase();
  let visibleCount = 0;

  rows.forEach(row => {
    const source = row.dataset.source;
    const target = state.mappings[source] || source;
    const matchesFilter = currentMappingFilter === 'all'
      || (currentMappingFilter === 'changed' && source !== target)
      || (currentMappingFilter === 'unchanged' && source === target);
    const matchesSearch = !keyword
      || source.toLowerCase().includes(keyword)
      || target.toLowerCase().includes(keyword);
    const show = matchesFilter && matchesSearch;
    row.style.display = show ? '' : 'none';
    if (show) visibleCount++;
  });

  updateMappingStats(visibleCount);
  updateMappingSelectionControls();
};

const setFilterButtonActive = (filterType) => {
  document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filterType);
  });
};

const findMappingRow = (source) => {
  if (!source) return null;
  const rows = document.querySelectorAll('#mappingTableBody tr');
  for (const row of rows) {
    if (row.dataset.source === source) {
      return row;
    }
  }
  return null;
};

const scrollToMappingRow = (source) => {
  if (!source) return false;

  let row = findMappingRow(source);
  if (!row) {
    return false;
  }

  if (row.style.display === 'none') {
    currentMappingFilter = 'all';
    currentMappingSearch = source;
    const searchInput = $('mappingSearchInput');
    if (searchInput) searchInput.value = source;
    setFilterButtonActive('all');
    applyMappingFilters();
    row = findMappingRow(source);
    if (row) {
      notifications.info('已切换筛选以定位该映射');
    }
  }

  if (!row) {
    return false;
  }

  row.classList.remove('highlight');
  void row.offsetWidth;
  row.classList.add('highlight');
  row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return true;
};

const updateMappingRowState = (source, target) => {
  const row = findMappingRow(source);
  if (!row) return;
  const input = row.querySelector('.mapping-input');
  if (input && input.value !== target) {
    input.value = target;
  }
  row.classList.toggle('changed', source !== target);
};

const normalizeSmartMatchOptions = (options = {}) => {
  return {
    keepDate: Boolean(options.smartMatchKeepDate),
    keepVersion: Boolean(options.smartMatchKeepVersion),
    keepNamespace: Boolean(options.smartMatchKeepNamespace),
    formatName: Boolean(options.smartMatchFormatName)
  };
};

const stripRules = (value, rules) => {
  let result = value;
  let updated = true;
  while (updated) {
    updated = false;
    for (const rule of rules) {
      if (rule.test(result)) {
        result = result.replace(rule, '');
        updated = true;
      }
    }
  }
  return result;
};

const stripSuffixChain = (value, ruleGroups) => {
  let result = value;
  let updated = true;
  while (updated) {
    updated = false;
    for (const rules of ruleGroups) {
      const next = trimModelName(stripRules(result, rules));
      if (next !== result) {
        result = next;
        updated = true;
      }
    }
  }
  return result;
};

const trimModelName = (value) => {
  return value
    .replace(/^[\s"'`]+|[\s"'`]+$/g, '')
    .replace(/^[\s._-]+|[\s._-]+$/g, '');
};

const stripNamespacePrefix = (value) => {
  if (!value.includes('/')) return value;
  const parts = value.split('/').filter(Boolean);
  if (parts.length <= 1) return value;
  return parts[parts.length - 1];
};

const isShortDateSuffix = (digits) => {
  if (digits.length !== 4) return false;
  const first = Number.parseInt(digits.slice(0, 2), 10);
  const second = Number.parseInt(digits.slice(2), 10);
  if (Number.isNaN(first) || Number.isNaN(second)) return false;
  const isYYMM = second >= 1 && second <= 12;
  const isMMDD = first >= 1 && first <= 12 && second >= 1 && second <= 31;
  return isYYMM || isMMDD;
};

const stripShortDateBeforeStage = (value) => {
  return value.replace(
    /(?:-|_|\s+)(\d{4})(?:-|_|\s+)(preview|beta|alpha|test|rc\d*|experimental|exp|latest|stable|instruct|instruction|chat|assistant|next|thinking|reasoning|reasoner|base|sft|dpo|rlhf|it)$/i,
    (match, digits, stage) => (isShortDateSuffix(digits) ? `-${stage}` : match)
  );
};

const stripNumericSuffix = (value, settings) => {
  const match = value.match(/(?:-|_|\s+)(\d{3,4})$/);
  if (!match) return value;

  const digits = match[1];
  const hasShortDate = digits.length === 4 && isShortDateSuffix(digits);

  if (!settings.keepDate && hasShortDate) {
    return value.slice(0, -match[0].length);
  }

  if (!settings.keepVersion) {
    if (digits.length === 3) {
      return value.slice(0, -match[0].length);
    }
    if (digits.length === 4 && (!settings.keepDate || !hasShortDate)) {
      return value.slice(0, -match[0].length);
    }
  }

  return value;
};

const formatClaudeName = (value) => {
  if (!value) return value;
  const raw = String(value).trim();
  const prefix = 'claude';
  const variantPattern = '(haiku|sonnet|opus)';
  const versionPattern = '(\\d+)(?:[-_.](\\d+))?';
  const byVersion = new RegExp(`^${prefix}(?:-|_|\\s+)${versionPattern}(?:-|_|\\s+)${variantPattern}$`, 'i');
  const byVariant = new RegExp(`^${prefix}(?:-|_|\\s+)${variantPattern}(?:-|_|\\s+)${versionPattern}$`, 'i');

  let match = raw.match(byVersion);
  if (match) {
    const major = match[1];
    const minor = match[2];
    const variant = match[3];
    const version = minor ? `${major}.${minor}` : major;
    return `claude-${variant.toLowerCase()}-${version}`;
  }

  match = raw.match(byVariant);
  if (match) {
    const variant = match[1];
    const major = match[2];
    const minor = match[3];
    const version = minor ? `${major}.${minor}` : major;
    return `claude-${variant.toLowerCase()}-${version}`;
  }

  return value;
};

const formatCanonicalModelName = (value) => {
  let result = value;
  const claudeFormatted = formatClaudeName(result);
  if (claudeFormatted !== result) {
    return claudeFormatted;
  }
  return result;
};

const collapseSeparators = (value) => {
  return value
    .replace(/-{2,}/g, '-')
    .replace(/_{2,}/g, '_')
    .replace(/\s{2,}/g, ' ');
};

const stripLeadingIdentifiers = (value) => {
  let result = value.replace(/^@+/, '');
  result = result.replace(/^[a-zA-Z0-9._-]{2,32}[:|]/, '');
  return result;
};

const getSmartMatchSignature = (models) => {
  return Array.isArray(models) ? [...models].sort().join('|') : '';
};

const shouldAutoApplySmartMatch = (models, options) => {
  if (!options || !options.smartNameMatching) return false;
  if (!Array.isArray(models) || models.length === 0) return false;
  const hasCustomMapping = models.some(model => {
    const target = state.mappings[model] || model;
    return target !== model;
  });
  if (hasCustomMapping) return false;
  const signature = getSmartMatchSignature(models);
  if (!signature || signature === lastAutoSmartMatchSignature) return false;
  return true;
};

// 获取映射选项设置
const getMappingOptions = () => {
  const smartNameMatchingEl = $('smartNameMatching');
  const autoChannelSuffixEl = $('autoChannelSuffix');
  const enableCustomRulesEl = $('enableCustomRules');
  const smartMatchKeepDateEl = $('smartMatchKeepDate');
  const smartMatchKeepVersionEl = $('smartMatchKeepVersion');
  const smartMatchKeepNamespaceEl = $('smartMatchKeepNamespace');
  const smartMatchFormatNameEl = $('smartMatchFormatName');

  const smartNameMatching = smartNameMatchingEl ? smartNameMatchingEl.checked : true;
  const autoChannelSuffix = autoChannelSuffixEl ? autoChannelSuffixEl.checked : false;
  const enableCustomRules = enableCustomRulesEl ? enableCustomRulesEl.checked : false;
  const smartMatchKeepDate = smartMatchKeepDateEl ? smartMatchKeepDateEl.checked : false;
  const smartMatchKeepVersion = smartMatchKeepVersionEl ? smartMatchKeepVersionEl.checked : false;
  const smartMatchKeepNamespace = smartMatchKeepNamespaceEl ? smartMatchKeepNamespaceEl.checked : false;
  const smartMatchFormatName = smartMatchFormatNameEl ? smartMatchFormatNameEl.checked : false;

  return {
    smartNameMatching,
    autoChannelSuffix,
    enableCustomRules,
    smartMatchKeepDate,
    smartMatchKeepVersion,
    smartMatchKeepNamespace,
    smartMatchFormatName
  };
};

/**
 * 应用智能名称匹配
 */
export const applySmartNameMatching = (modelName, options = {}) => {
  // 首先应用用户自定义的规则
  let result = rulesManager.applyNameMatchRules(modelName);

  // 如果结果没变，应用默认规则
  if (result === modelName) {
    const settings = normalizeSmartMatchOptions(options);
    result = trimModelName(String(modelName || '').trim());
    if (!result) return modelName;

    result = trimModelName(stripRules(result, SMART_MATCH_PREFIX_RULES));
    if (!settings.keepNamespace) {
      result = trimModelName(stripNamespacePrefix(result));
    }
    result = trimModelName(stripLeadingIdentifiers(result));

    result = trimModelName(stripRules(result, SMART_MATCH_SUFFIX_RULES.channel));

    if (!settings.keepDate) {
      result = trimModelName(stripShortDateBeforeStage(result));
      for (const rule of SMART_MATCH_DATE_BEFORE_STAGE_RULES) {
        if (rule.test(result)) {
          result = result.replace(rule, '-$2');
        }
      }
      result = trimModelName(stripRules(result, SMART_MATCH_SUFFIX_RULES.date));
    }

    if (!settings.keepVersion) {
      result = stripSuffixChain(result, [
        SMART_MATCH_SUFFIX_RULES.stage,
        SMART_MATCH_SUFFIX_RULES.version,
        SMART_MATCH_SUFFIX_RULES.provider
      ]);
    }

    if (!settings.keepDate) {
      result = trimModelName(stripRules(result, SMART_MATCH_SUFFIX_RULES.date));
    }

    if (settings.formatName) {
      result = trimModelName(formatCanonicalModelName(result));
    }

    result = trimModelName(stripNumericSuffix(result, settings));
    result = trimModelName(collapseSeparators(result));
  }

  return result || modelName;
};

/**
 * 应用智能模型合并
 */
export const applySmartMerge = (models) => {
  let result = [...models];

  // 首先应用用户自定义合并规则
  result = rulesManager.applyMergeRules(result);

  // 应用默认合并规则
  for (const rule of DEFAULT_MERGE_RULES) {
    const hasAllModels = rule.models.every(m => result.includes(m));
    if (hasAllModels) {
      result = result.filter(m => !rule.models.includes(m));
      result.push(rule.target);
    }
  }

  return result;
};

/**
 * 应用自动渠道后缀
 * 使用实时的渠道名称，不使用硬编码
 */
export const applyAutoChannelSuffix = (modelName, channelInfo) => {
  // 获取渠道名称
  let channelName = '';

  if (typeof channelInfo === 'string') {
    channelName = channelInfo;
  } else if (channelInfo && typeof channelInfo === 'object') {
    channelName = channelInfo.name || '';
  }

  if (!channelName) {
    console.log(`⚠️ 渠道名称为空，跳过后缀添加: ${modelName}`);
    return modelName;
  }

  console.log(`🏷️ 应用渠道后缀: ${modelName} <- 渠道: ${channelName}`);

  // 清理渠道名称：移除特殊字符，只保留字母、数字、中文和连字符
  const sanitizedChannel = channelName
    .trim()
    .replace(/[^a-zA-Z0-9\u4e00-\u9fff-]/g, '-')
    .replace(/-+/g, '-')  // 多个连字符合并为一个
    .replace(/^-|-$/g, ''); // 移除开头和结尾的连字符

  if (!sanitizedChannel) {
    console.log(`⚠️ 渠道名称清理后为空，跳过后缀添加: ${modelName}`);
    return modelName;
  }

  // 检查模型名是否已经包含该渠道后缀
  const suffixPattern = new RegExp(`-${sanitizedChannel.replace(/\s+/g, '[\\s_]?')}$`, 'i');
  if (suffixPattern.test(modelName)) {
    console.log(`ℹ️ 模型名已包含渠道后缀，跳过: ${modelName}`);
    return modelName;
  }

  // 添加渠道后缀
  const result = `${modelName}-${sanitizedChannel}`;
  console.log(`✅ 添加渠道后缀: ${modelName} → ${result}`);

  return result;
};

/**
 * 应用自定义规则
 */
export const applyCustomRules = (modelName) => {
  console.log('🛠️ 应用自定义规则:', modelName);

  const result = rulesManager.applyRules(modelName);

  if (result !== modelName) {
    console.log(`✅ 规则生效: ${modelName} → ${result}`);
  } else {
    console.log(`ℹ️ 规则未改变: ${modelName}`);
  }

  return result;
};

/**
 * 渲染映射表格
 */
export const renderMappingTable = () => {
  const tbody = $('mappingTableBody');
  if (!tbody) {
    console.warn('⚠️ 未找到 mappingTableBody 元素');
    return;
  }

  // 使用 state.selectedModels 而不是 state.mappings，确保数据同步
  const models = state.selectedModels;
  const options = getMappingOptions();
  if (shouldAutoApplySmartMatch(models, options)) {
    lastAutoSmartMatchSignature = getSmartMatchSignature(models);
    generateSmartMappings();
    return;
  }

  console.log('📊 渲染映射表格:', {
    selectedModels: models.length,
    selectedModelsList: models,
    mappings: Object.keys(state.mappings).length,
    mappingsList: state.mappings
  });

  if (models.length === 0) {
    lastAutoSmartMatchSignature = '';
    tbody.innerHTML = '';
    const emptyState = $('emptyMappingState');
    if (emptyState) {
      emptyState.style.display = 'flex';
      console.log('✅ 显示空状态');
    }
    updateMappingStats(0);
    updateMappingSelectionControls();
    console.log('⚠️ 没有模型，显示空状态');
    return;
  }

  const emptyState = $('emptyMappingState');
  if (emptyState) {
    emptyState.style.display = 'none';
    console.log('✅ 隐藏空状态');
  }

  tbody.innerHTML = models.map(source => {
    const target = state.mappings[source] || source;
    const channelInfo = state.modelChannelMap[source];
    const channelLabel = channelInfo && channelInfo.name
      ? channelInfo.name
      : (channelInfo && channelInfo.id ? `渠道 ${channelInfo.id}` : '未知渠道');
    const isChanged = source !== target;
    const isSelected = selectedMappingSources.has(source);
    console.log(`📝 渲染模型: ${source} → ${target}`);
    return `
      <tr data-source="${source}" class="mapping-row ${isChanged ? 'changed' : ''} ${isSelected ? 'selected' : ''}">
        <td class="select-cell">
          <input type="checkbox" class="mapping-select" data-source="${source}" ${isSelected ? 'checked' : ''}>
        </td>
        <td class="source-model">
          <div class="model-text">${source}</div>
          <div class="model-meta">${channelLabel}</div>
        </td>
        <td class="arrow-cell">
          <i class="fas fa-arrow-right"></i>
        </td>
        <td class="target-model">
          <input type="text" value="${target}" data-source="${source}"
            class="mapping-input" onchange="window.mappingModule.updateMapping('${source}', this.value)">
        </td>
        <td class="action-cell">
          <button class="btn-icon delete-btn" onclick="window.mappingModule.deleteMapping('${source}')">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  bindMappingSelectionEvents();
  applyMappingFilters();
  console.log(`✅ 已渲染 ${models.length} 个映射`);
};

/**
 * 更新映射
 */
export const updateMapping = (source, target) => {
  if (!source || !target) {
    notifications.error('映射源和目标不能为空');
    return false;
  }

  state.mappings[source] = target;
  saveMappingsToStorage();
  updateMappingRowState(source, target);
  renderSelectedModels();
  applyMappingFilters();
  return true;
};

/**
 * 添加映射（从一键更新页面添加）
 */
export const addMapping = (source, target, channelInfo = null) => {
  if (!source || !target) {
    console.warn('添加映射失败：源或目标为空', { source, target });
    return false;
  }

  // 更新 state
  state.mappings[source] = target;

  // 如果 source 不在 selectedModels 中，添加到 selectedModels
  if (!state.selectedModels.includes(source)) {
    state.selectedModels.push(source);
  }

  if (channelInfo && (channelInfo.id != null || channelInfo.name)) {
    const existing = state.modelChannelMap[source] || {};
    state.modelChannelMap[source] = {
      id: channelInfo.id != null ? channelInfo.id : existing.id,
      name: channelInfo.name ? channelInfo.name : existing.name
    };
  }

  // 保存到 localStorage
  saveMappingsToStorage();

  // 重新渲染
  renderMappingTable();
  renderSelectedModels();

  console.log(`✅ 添加映射成功: ${source} -> ${target}`);
  return true;
};

/**
 * 保存映射到 localStorage
 */
const saveMappingsToStorage = () => {
  try {
    localStorage.setItem(STORAGE_KEYS.MODEL_MAPPINGS, JSON.stringify(state.mappings));
    localStorage.setItem('newapi-model-channel-map', JSON.stringify(state.modelChannelMap));
  } catch (error) {
    console.warn('保存映射失败:', error);
  }
};

/**
 * 删除映射
 */
export const deleteMapping = (source) => {
  if (!source) return false;

  selectedMappingSources.delete(source);
  delete state.mappings[source];
  state.selectedModels = state.selectedModels.filter(m => m !== source);
  saveMappingsToStorage();
  renderMappingTable();
  renderSelectedModels();

  notifications.success(`已删除映射: ${source}`);
  return true;
};

/**
 * 删除选中的映射
 */
export const deleteSelectedMappingsFromTable = () => {
  if (selectedMappingSources.size === 0) {
    notifications.info('请选择要删除的映射');
    return 0;
  }

  const sources = Array.from(selectedMappingSources);
  selectedMappingSources.clear();
  return deleteSelectedMappings(sources);
};

/**
 * 渲染已选模型列表
 */
export const renderSelectedModels = () => {
  const container = $('originalModelsList');
  if (!container) {
    console.warn('⚠️ 未找到 originalModelsList 容器');
    return;
  }

  const models = setOps.getModelsArray(); // 使用 setOps 确保获取最新的选中模型

  console.log('📊 renderSelectedModels 调用:', {
    模型数量: models.length,
    模型列表: models,
    selectedModels: state.selectedModels,
    mappings: state.mappings,
    modelChannelMap: state.modelChannelMap
  });

  const countEl = $('selectedModelsCountMapping');
  if (countEl) countEl.textContent = `已选模型 (${models.length})`;

  if (models.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <p>尚未添加模型</p>
        <small>从渠道管理中选择模型添加</small>
      </div>
    `;
    console.log('⚠️ 没有模型，显示空状态');
    return;
  }

  container.innerHTML = models.map(model => {
    const channelInfo = state.modelChannelMap[model];
    const channelName = (channelInfo && channelInfo.name) || '未知渠道';
    const mappedName = state.mappings[model] || model;

    console.log(`📝 渲染模型: ${model}, 渠道: ${channelName}, 映射: ${mappedName}`);

    return `
      <div class="model-chip" data-model="${model}">
        <span class="model-name" title="${model}">${model}</span>
        <span class="model-channel">${channelName}</span>
        <span class="model-mapped">→ ${mappedName}</span>
        <button class="remove-btn" data-model="${model}">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.model-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      if (e.target.closest('.remove-btn')) return;
      const model = chip.dataset.model;
      const found = scrollToMappingRow(model);
      if (!found) {
        notifications.warning('未找到该模型的映射行');
      }
    });
  });

  container.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeSelectedModel(btn.dataset.model);
    });
  });

  console.log(`✅ 已渲染 ${models.length} 个模型`);
};

/**
 * 移除已选模型
 */
export const removeSelectedModel = (model) => {
  selectedMappingSources.delete(model);
  state.selectedModels = state.selectedModels.filter(m => m !== model);
  delete state.mappings[model];
  delete state.modelChannelMap[model];
  saveMappingsToStorage();
  renderSelectedModels();
  renderMappingTable();
};

/**
 * 清空所有映射
 */
export const clearAllMappings = () => {
  selectedMappingSources.clear();
  state.selectedModels = [];
  state.mappings = {};
  state.modelChannelMap = {};
  saveMappingsToStorage();
  renderSelectedModels();
  renderMappingTable();
  notifications.success('已清空所有映射');
};

/**
 * 恢复原始映射
 */
export const restoreOriginalMappings = () => {
  selectedMappingSources.clear();
  const models = Array.isArray(state.selectedModels) ? [...state.selectedModels] : [];
  const nextMappings = {};

  for (const model of models) {
    nextMappings[model] = model;
  }

  state.mappings = nextMappings;
  saveMappingsToStorage();
  renderSelectedModels();
  renderMappingTable();
  notifications.success('已恢复原始映射');
};

/**
 * 导入映射
 */
export const importMappings = (mappingText) => {
  try {
    const mappings = JSON.parse(mappingText);

    if (typeof mappings !== 'object' || mappings === null) {
      throw new Error('映射格式无效');
    }

    let count = 0;
    for (const [source, target] of Object.entries(mappings)) {
      if (!state.selectedModels.includes(source)) {
        state.selectedModels.push(source);
      }
      state.mappings[source] = target;
      count++;
    }

    saveMappingsToStorage();
    renderSelectedModels();
    renderMappingTable();
    notifications.success(`已导入 ${count} 个映射`);

    return { success: true, count };
  } catch (error) {
    notifications.error(`导入失败: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * 导出映射
 */
export const exportMappings = () => {
  if (Object.keys(state.mappings).length === 0) {
    notifications.warning('没有可导出的映射');
    return null;
  }

  return JSON.stringify(state.mappings, null, 2);
};

/**
 * 智能生成映射
 */
export const generateSmartMappings = () => {
  const options = getMappingOptions();
  const mappings = {};

  // 获取选中的模型
  const models = setOps.getModelsArray();

  console.log('🔧 开始生成智能映射:', {
    模型数量: models.length,
    选项: options
  });

  // 生成映射
  for (const model of models) {
    let mappedModel = model;

    // 应用智能名称匹配
    if (options.smartNameMatching) {
      const beforeMatch = mappedModel;
      mappedModel = applySmartNameMatching(mappedModel, options);
      if (beforeMatch !== mappedModel) {
        console.log(`✨ 名称匹配: ${beforeMatch} → ${mappedModel}`);
      }
    }

    // 应用自定义规则
    if (options.enableCustomRules) {
      const beforeCustom = mappedModel;
      mappedModel = applyCustomRules(mappedModel);
      if (beforeCustom !== mappedModel) {
        console.log(`🛠️ 自定义规则: ${beforeCustom} → ${mappedModel}`);
      }
    }

    // 应用自动渠道后缀
    if (options.autoChannelSuffix) {
      const channelInfo = state.modelChannelMap[model];
      if (channelInfo) {
        const beforeSuffix = mappedModel;
        mappedModel = applyAutoChannelSuffix(mappedModel, channelInfo);
        if (beforeSuffix !== mappedModel) {
          console.log(`🏷️ 渠道后缀: ${beforeSuffix} → ${mappedModel}`);
        }
      } else {
        console.log(`⚠️ 未找到模型 ${model} 的渠道信息，跳过后缀添加`);
      }
    }

    mappings[model] = mappedModel;
  }

  // 更新状态 - 确保同步到 state.mappings
  Object.assign(state.mappings, mappings);

  // 确保所有模型都在 selectedModels 数组中
  for (const model of Object.keys(mappings)) {
    if (!state.selectedModels.includes(model)) {
      state.selectedModels.push(model);
    }
  }

  // 保存到 localStorage
  saveMappingsToStorage();

  // 渲染更新
  renderMappingTable();
  renderSelectedModels();

  const diffCount = Object.entries(mappings).filter(([k, v]) => k !== v).length;
  notifications.success(`已生成 ${Object.keys(mappings).length} 个映射，${diffCount} 个已优化`);

  console.log('✅ 映射生成完成:', {
    总数: Object.keys(mappings).length,
    已优化: diffCount
  });

  return mappings;
};

/**
 * 获取模型列表（用于同步）
 */
export const getMergedModels = () => {
  return setOps.getModelsArray();
};

/**
 * 切换选项时更新预览
 */
export const updatePreviewOnOptionChange = () => {
  generateSmartMappings();
};

/**
 * 获取映射选项状态
 */
export const getMappingOptionsState = () => {
  return getMappingOptions();
};

/**
 * 获取映射统计
 */
export const getMappingStats = () => {
  const entries = Object.entries(state.mappings);
  return {
    total: entries.length,
    unchanged: entries.filter(([s, t]) => s === t).length,
    redirected: entries.filter(([s, t]) => s !== t).length
  };
};

/**
 * 渲染规则列表
 */
export const renderRulesList = () => {
  const container = $('customRulesList');
  if (!container) return;

  const rules = rulesManager.customRules;

  if (rules.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-code"></i>
        <p>暂无自定义规则</p>
        <small>点击"添加规则"创建新的映射规则</small>
      </div>
    `;
    return;
  }

  const typeLabels = {
    'regex': '正则替换',
    'string': '字符串替换',
    'prefix': '前缀处理',
    'suffix': '后缀处理'
  };

  container.innerHTML = rules.map(rule => {
    const priorityValue = Number(rule.priority);
    const priorityBadge = Number.isFinite(priorityValue)
      ? `<span class="rule-priority">优先级 ${priorityValue}</span>`
      : '';
    const ruleName = rule.name || '未命名规则';

    return `
      <div class="rule-item ${rule.enabled ? '' : 'disabled'}" data-id="${rule.id}">
        <div class="rule-header">
          <span class="rule-type">${typeLabels[rule.type] || rule.type}</span>
          <div class="rule-actions">
            <button class="btn-icon edit-btn" onclick="window.mappingModule.editCustomRule(${rule.id})">
              <i class="fas fa-pen"></i>
            </button>
            <button class="btn-icon toggle-btn" onclick="window.mappingModule.toggleRule(${rule.id})">
              <i class="fas fa-${rule.enabled ? 'toggle-on' : 'toggle-off'}"></i>
            </button>
            <button class="btn-icon delete-btn" onclick="window.mappingModule.deleteCustomRule(${rule.id})">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        <div class="rule-content">
          <div class="rule-name">
            ${ruleName}
            ${priorityBadge}
          </div>
          <div class="rule-detail rule-detail-inline">
            <span class="rule-label">匹配:</span>
            <code>${rule.pattern}</code>
            <span class="rule-label">替换为:</span>
            <code>${rule.replacement}</code>
          </div>
          ${rule.condition && rule.condition !== 'all' ? `
            <div class="rule-detail">
              <span class="rule-label">条件:</span>
              <span>${rule.condition} "${rule.conditionValue || ''}"</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
};

/**
 * 切换规则启用状态
 */
export const toggleRule = (ruleId) => {
  const rule = rulesManager.customRules.find(r => r.id === ruleId);
  if (rule) {
    rule.enabled = !rule.enabled;
    rulesManager.saveRules();
    renderRulesList();
    notifications.success(`规则已${rule.enabled ? '启用' : '禁用'}`);
  }
};

/**
 * 删除自定义规则
 */
export const deleteCustomRule = (ruleId) => {
  rulesManager.deleteCustomRule(ruleId);
  renderRulesList();
  notifications.success('规则已删除');
};

/**
 * 清空所有规则
 */
export const clearAllRules = () => {
  if (confirm('确定要清空所有自定义规则吗?')) {
    rulesManager.clearAll();
    renderRulesList();
  }
};

/**
 * 编辑自定义规则
 */
export const editCustomRule = (ruleId) => {
  const rule = rulesManager.customRules.find(item => item.id === ruleId);
  if (!rule) {
    notifications.error('规则不存在');
    return;
  }

  editingRuleId = ruleId;
  const modal = $('customRuleModal');
  if (!modal) return;

  const titleEl = $('customRuleModalTitle');
  if (titleEl) titleEl.textContent = '编辑规则';

  $('customRuleName').value = rule.name || '';
  $('customRuleType').value = rule.type || 'regex';
  $('customRulePriority').value = Number.isFinite(Number(rule.priority)) ? rule.priority : '100';
  $('customRulePattern').value = rule.pattern || '';
  $('customRuleReplacement').value = rule.replacement || '';
  $('customRuleCondition').value = rule.condition || 'all';
  $('customRuleConditionValue').value = rule.conditionValue || '';
  $('customRuleTestInput').value = '';
  $('customRuleTestResult').style.display = 'none';

  const conditionValueGroup = $('conditionValueGroup');
  if (conditionValueGroup) {
    conditionValueGroup.style.display = rule.condition && rule.condition !== 'all' ? 'block' : 'none';
  }

  modal.classList.add('show');
  modal.classList.remove('active');
};

/**
 * 保存自定义规则
 */
export const saveCustomRules = () => {
  rulesManager.saveRules();
  notifications.success('规则已保存');
};

/**
 * 添加自定义规则
 */
export const addCustomRule = () => {
  // 打开自定义规则模态框
  const modal = $('customRuleModal');
  if (modal) {
    editingRuleId = null;
    const titleEl = $('customRuleModalTitle');
    if (titleEl) titleEl.textContent = '新增规则';
    // 重置表单
    $('customRuleName').value = '';
    $('customRuleType').value = 'regex';
    $('customRulePriority').value = '100';
    $('customRulePattern').value = '';
    $('customRuleReplacement').value = '';
    $('customRuleCondition').value = 'all';
    $('customRuleConditionValue').value = '';
    $('customRuleTestInput').value = '';
    $('customRuleTestResult').style.display = 'none';

    // 显示模态框
    modal.classList.add('show');
    modal.classList.remove('active');
  }
};

/**
 * 测试自定义规则
 */
export const testCustomRule = () => {
  const testInput = $('customRuleTestInput').value;
  const pattern = $('customRulePattern').value;
  const replacement = $('customRuleReplacement').value;
  const type = $('customRuleType').value;
  const condition = $('customRuleCondition').value;
  const conditionValue = $('customRuleConditionValue').value;

  if (!testInput || !pattern) {
    notifications.warning('请输入测试文本和匹配模式');
    return;
  }

  const rule = {
    type,
    pattern,
    replacement,
    condition,
    conditionValue,
    enabled: true
  };

  const result = rulesManager.applyCustomRule(testInput, rule);

  $('testOriginalName').textContent = testInput;
  $('testResultName').textContent = result;
  $('testApplied').textContent = testInput !== result ? '是' : '否';
  $('customRuleTestResult').style.display = 'block';
};

/**
 * 保存自定义规则
 */
export const saveCustomRule = () => {
  const name = $('customRuleName').value.trim();
  const type = $('customRuleType').value;
  const priorityRaw = $('customRulePriority').value;
  const priority = Number.isFinite(Number(priorityRaw)) ? Number(priorityRaw) : 100;
  const pattern = $('customRulePattern').value.trim();
  const replacement = $('customRuleReplacement').value.trim();
  const condition = $('customRuleCondition').value;
  const conditionValue = $('customRuleConditionValue').value.trim();

  if (!pattern) {
    notifications.error('请输入匹配模式');
    return;
  }

  const rule = {
    name: name || `规则 ${Date.now()}`,
    type,
    priority,
    pattern,
    replacement,
    condition,
    conditionValue,
    enabled: true
  };

  if (editingRuleId) {
    const existing = rulesManager.customRules.find(item => item.id === editingRuleId);
    if (existing) {
      Object.assign(existing, {
        ...rule,
        enabled: existing.enabled !== false,
        createdAt: existing.createdAt || new Date().toISOString()
      });
      rulesManager.saveRules();
      renderRulesList();
      notifications.success('规则已更新');
    } else {
      rulesManager.addCustomRule(rule);
      renderRulesList();
      notifications.success('规则已添加');
    }
  } else {
    rulesManager.addCustomRule(rule);
    renderRulesList();
    notifications.success('规则已添加');
  }
  editingRuleId = null;

  // 如果启用了自定义规则，自动刷新映射预览
  const enableCustomRulesEl = $('enableCustomRules');
  if (enableCustomRulesEl && enableCustomRulesEl.checked) {
    generateSmartMappings();
  }

  // 关闭模态框
  const modal = $('customRuleModal');
  if (modal) {
    modal.classList.remove('show');
    modal.classList.remove('active');
  }

};

/**
 * 应用规则模板
 */
export const applyRuleTemplate = (templateId) => {
  const result = rulesManager.applyTemplate(templateId);
  if (result && result.added > 0) {
    // 立即刷新规则列表
    renderRulesList();

    // 如果启用了自定义规则，自动刷新映射预览
    const enableCustomRulesEl = $('enableCustomRules');
    if (enableCustomRulesEl && enableCustomRulesEl.checked) {
      generateSmartMappings();
    }

    // 关闭模板模态框
    closeModal('templateModal');
  }
  return result;
};

/**
 * 获取规则模板列表
 */
export const getRuleTemplates = () => {
  return rulesManager.getTemplates();
};

/**
 * 打开规则模板选择模态框
 */
export const openTemplatesModal = () => {
  const modal = $('templateModal');
  if (modal) {
    renderTemplatesList();
    modal.classList.add('show');
  }
};

/**
 * 渲染规则模板列表
 */
export const renderTemplatesList = () => {
  const container = $('templatesList');
  if (!container) return;

  const templates = rulesManager.getTemplates();

  if (templates.length === 0) {
    container.innerHTML = '<p class="empty-text">暂无模板</p>';
    return;
  }

  container.innerHTML = templates.map(tmpl => `
    <div class="template-item" onclick="window.mappingModule.applyRuleTemplate('${tmpl.id}')">
      <div class="template-icon">
        <i class="fas fa-layer-group"></i>
      </div>
      <div class="template-info">
        <h4>${tmpl.name}</h4>
        <p>${tmpl.description}</p>
        ${tmpl.example ? `<div class="template-example"><code>${tmpl.example}</code></div>` : ''}
        <span class="template-count">${tmpl.rulesCount} 条规则</span>
      </div>
      <div class="template-action">
        <button class="btn btn-sm btn-primary">应用</button>
      </div>
    </div>
  `).join('');
};

/**
 * 过滤映射列表
 */
export const filterMappings = (filterType) => {
  currentMappingFilter = filterType || 'all';
  applyMappingFilters();
};

/**
 * 搜索映射
 */
export const searchMappings = (keyword) => {
  currentMappingSearch = (keyword || '').trim();
  applyMappingFilters();
};

/**
 * 批量更新映射
 */
export const batchUpdateMappings = (updates) => {
  let count = 0;
  for (const [source, target] of Object.entries(updates)) {
    if (state.mappings.hasOwnProperty(source)) {
      state.mappings[source] = target;
      count++;
    }
  }

  if (count > 0) {
    saveMappingsToStorage();
    renderMappingTable();
    notifications.success(`已更新 ${count} 个映射`);
  }

  return count;
};

/**
 * 删除选中的映射
 */
export const deleteSelectedMappings = (sources) => {
  let count = 0;
  for (const source of sources) {
    if (delete state.mappings[source]) {
      state.selectedModels = state.selectedModels.filter(m => m !== source);
      selectedMappingSources.delete(source);
      count++;
    }
  }

  if (count > 0) {
    saveMappingsToStorage();
    renderMappingTable();
    renderSelectedModels();
    notifications.success(`已删除 ${count} 个映射`);
  }

  return count;
};

/**
 * 导出映射到文件
 */
export const exportMappingsToFile = () => {
  const mappings = exportMappings();
  if (!mappings) return null;

  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    mappings: JSON.parse(mappings),
    description: '模型映射导出'
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `model-mappings-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);

  notifications.success('映射已导出');
  return true;
};

/**
 * 从文件导入映射
 */
export const importMappingsFromFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        let mappings = null;

        // 支持多种格式
        if (data.mappings && typeof data.mappings === 'object') {
          // 新格式: { mappings: {...} }
          mappings = data.mappings;
        } else if (typeof data === 'object' && data !== null) {
          // 旧格式: {...}
          mappings = data;
        }

        if (!mappings) {
          throw new Error('映射格式无效');
        }

        const result = importMappings(JSON.stringify(mappings));
        resolve(result);
      } catch (error) {
        notifications.error(`导入失败: ${error.message}`);
        reject(error);
      }
    };
    reader.onerror = () => {
      notifications.error('读取文件失败');
      reject(new Error('读取文件失败'));
    };
    reader.readAsText(file);
  });
};

// 默认导出 - 必须放在所有函数定义之后
export default {
  renderMappingTable,
  updateMapping,
  addMapping,
  deleteMapping,
  deleteSelectedMappingsFromTable,
  renderSelectedModels,
  removeSelectedModel,
  clearAllMappings,
  restoreOriginalMappings,
  importMappings,
  exportMappings,
  generateSmartMappings,
  getMappingStats,
  applySmartNameMatching,
  applySmartMerge,
  applyAutoChannelSuffix,
  applyCustomRules,
  getMergedModels,
  updatePreviewOnOptionChange,
  getMappingOptionsState,
  renderRulesList,
  editCustomRule,
  toggleRule,
  deleteCustomRule,
  clearAllRules,
  saveCustomRules,
  addCustomRule,
  testCustomRule,
  saveCustomRule,
  applyRuleTemplate,
  getRuleTemplates,
  openTemplatesModal,
  filterMappings,
  searchMappings,
  batchUpdateMappings,
  deleteSelectedMappings,
  exportMappingsToFile,
  importMappingsFromFile
};
