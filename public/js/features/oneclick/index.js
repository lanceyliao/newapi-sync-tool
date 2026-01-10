/**
 * 一键更新模块（Job 模式 + 实时进度）
 */
import { state, setOps } from '../../core/state.js';
import {
  startOneClickUpdateJob,
  startOneClickUpdateJobFromPreview,
  getOneClickUpdateJob,
  cancelOneClickUpdateJob,
  createCheckpoint,
  restoreCheckpoint
} from '../../api/sync.js';
import { $ } from '../../ui/dom.js';
import { addLog } from '../../ui/dom.js';
import { notifications } from '../../ui/notifications.js';
import { progress } from '../../ui/progress.js';
import { rulesManager } from '../../rules/index.js';
import { getLastCheckpoint, setLastCheckpoint } from '../../core/checkpoint.js';

let activeJobId = null;
let activeJobCursor = 0;
let pollTimer = null;
let lastPreviewJobId = null;
let previewMappings = []; // 存储预览结果，用于选择和执行
let selectedMappingIds = new Set(); // 存储选中的映射ID
let isRestoring = false;

const updateRollbackButton = () => {
  const btn = $('rollbackOneClickBtn');
  if (!btn) return;
  const checkpoint = getLastCheckpoint();
  const hasCheckpoint = Boolean(checkpoint && checkpoint.id);
  btn.disabled = !hasCheckpoint || Boolean(activeJobId) || isRestoring;
  if (hasCheckpoint) {
    const timeText = checkpoint.createdAt
      ? new Date(checkpoint.createdAt).toLocaleString('zh-CN')
      : '';
    btn.title = timeText ? `检查点 ${checkpoint.id} (${timeText})` : `检查点 ${checkpoint.id}`;
  } else {
    btn.title = '暂无可回退的检查点';
  }
};

const formatCheckpointWarning = (checkpointResult) => {
  const failed = Number(checkpointResult?.failed || 0);
  if (failed > 0) {
    return `注意：${failed} 个渠道未写入检查点`;
  }
  return '';
};

/**
 * 获取当前用户规则
 */
const getUserRules = () => {
  return {
    nameMatch: rulesManager.nameMatchRules || [],
    merge: rulesManager.mergeRules || [],
    custom: rulesManager.customRules || []
  };
};

const getOneClickOptions = () => {
  const concurrency = Number($('oneClickConcurrency')?.value || 4);
  const onlyEnabled = Boolean($('oneClickOnlyEnabled')?.checked);
  const forceRefresh = Boolean($('oneClickForceRefresh')?.checked);
  const includeUpgrades = Boolean($('oneClickIncludeUpgrades')?.checked);
  const debug = Boolean($('oneClickVerboseLog')?.checked);
  const updateMode = document.querySelector('input[name="oneClickUpdateMode"]:checked')?.value || 'replace';

  // 获取用户规则
  const rules = getUserRules();
  const totalRules = rules.nameMatch.length + rules.merge.length + rules.custom.length;

  if (totalRules > 0) {
    console.log(`📋 一键更新将使用 ${totalRules} 条用户规则`);
  }

  return {
    concurrency,
    onlyEnabled,
    forceRefresh,
    includeUpgrades,
    debug,
    updateMode,
    rules  // 传递用户规则
  };
};

const getSelectedChannelIdsOrNull = () => {
  const selected = setOps.getChannelsArray();
  return selected.length > 0 ? selected : null;
};

const setJobControls = (running) => {
  const previewBtn = $('previewOneClickUpdateBtn');
  const executeBtn = $('executeOneClickUpdateBtn');
  const cancelBtn = $('cancelOneClickUpdateBtn');

  if (previewBtn) previewBtn.disabled = running;
  if (cancelBtn) cancelBtn.disabled = !running;

  // 执行按钮：只有在预览完成且不在运行时可用
  if (executeBtn) executeBtn.disabled = running || !lastPreviewJobId;

  updateRollbackButton();
};

const resetJobState = () => {
  activeJobId = null;
  activeJobCursor = 0;
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
};

const appendJobLogs = (logs) => {
  if (!Array.isArray(logs) || logs.length === 0) return;
  for (const entry of logs) {
    const date = entry?.ts ? new Date(entry.ts) : null;
    addLog('oneClickUpdateLogs', entry?.msg ?? '', entry?.type ?? '', date);
  }
};

const updateProgressUI = (progressData) => {
  const current = Number(progressData?.current || 0);
  const total = Number(progressData?.total || 0);
  const percent = Number(progressData?.percent || 0);
  const channelName = progressData?.channelName ? `（${progressData.channelName}）` : '';
  const text = total > 0
    ? `${current}/${total} ${channelName}`
    : '正在分析...';

  progress.update('oneClickUpdateProgressFill', 'oneClickUpdateProgressText', percent, text);
};

const isDeletionMapping = (mapping) => {
  return Boolean(mapping && (mapping.action === 'delete' || mapping.removeModel || mapping.fixType === 'remove-invalid'));
};

const renderResults = (results) => {
  const resultsContainer = $('oneClickUpdateResults');
  if (resultsContainer) resultsContainer.style.display = 'block';

  const scanned = $('scannedChannelsCount');
  const broken = $('brokenMappingsCount');
  const fixable = $('fixableMappingsCount');

  // 计算有效的可修复映射数量（包含删除项 + actualName 不为空且源不等于目标）
  const validFixableCount = (results?.newMappings || []).filter(m => {
    if (isDeletionMapping(m)) return true;
    if (!m.actualName) return false;
    const source = (m.originalModel || m.standardName || '').toLowerCase();
    const target = (m.actualName || '').toLowerCase();
    if (source === target) return false;
    return true;
  }).length;

  if (scanned) scanned.textContent = `扫描: ${results?.scannedChannels || 0}`;
  if (broken) broken.textContent = `失效: ${(results?.brokenMappings && results.brokenMappings.length) || 0}`;
  if (fixable) fixable.textContent = `可修复: ${validFixableCount}`;

  const brokenMappings = results?.brokenMappings || [];
  const newMappings = results?.newMappings || [];
  attachBrokenReasons(newMappings, brokenMappings);
  renderBrokenMappings(brokenMappings);
  renderNewMappings(newMappings);
};

const escapeHtml = (value) => {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[ch] || ch;
  });
};

const getMappingDisplayInfo = (mapping) => {
  const isRemoval = isDeletionMapping(mapping);
  const rawStandardName = String(mapping.standardName || '');
  const rawOriginalModel = String(mapping.originalModel || '');
  const rawActualName = String(mapping.actualName || '');
  const displaySourceRaw = rawOriginalModel || rawStandardName || rawActualName;
  const displayTargetRaw = mapping.displayTarget || (isRemoval ? '建议删除' : (rawActualName || rawStandardName || rawOriginalModel));
  const displayStandardRaw = mapping.displayStandard ||
    ((mapping.fixType === 'mapping-upgrade' && mapping.displayTarget) ? rawActualName : rawStandardName);
  const showStandard = displayStandardRaw &&
    displayStandardRaw !== displaySourceRaw &&
    displayStandardRaw !== displayTargetRaw;

  return {
    isRemoval,
    rawStandardName,
    rawOriginalModel,
    rawActualName,
    displaySourceRaw,
    displayTargetRaw,
    displayStandardRaw,
    showStandard
  };
};

const buildReasonKey = (mapping) => {
  const channelId = mapping?.channelId != null ? String(mapping.channelId) : '';
  const name = String(mapping?.originalModel || mapping?.standardName || mapping?.expectedModel || mapping?.actualName || '').toLowerCase();
  return `${channelId}::${name}`;
};

const attachBrokenReasons = (newMappings, brokenMappings) => {
  if (!Array.isArray(newMappings) || newMappings.length === 0) return;
  if (!Array.isArray(brokenMappings) || brokenMappings.length === 0) return;

  const reasonMap = new Map();
  brokenMappings.forEach((mapping) => {
    const key = buildReasonKey(mapping);
    if (!key || reasonMap.has(key)) return;
    const reason = String(mapping?.reason || '').trim();
    if (reason) {
      reasonMap.set(key, reason);
    }
  });

  newMappings.forEach((mapping) => {
    if (mapping?.reason) return;
    const key = buildReasonKey(mapping);
    const reason = reasonMap.get(key);
    if (reason) {
      mapping.reason = reason;
    }
  });
};

const normalizeCandidateList = (candidates) => {
  if (!Array.isArray(candidates)) return [];
  const normalized = [];
  const seen = new Set();

  for (const candidate of candidates) {
    if (!candidate) continue;
    const name = typeof candidate === 'string'
      ? candidate
      : (candidate.name || candidate.match || candidate.value);
    if (!name) continue;
    const key = String(name).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({
      name: String(name),
      alias: candidate.alias ? String(candidate.alias) : '',
      score: Number.isFinite(candidate.score) ? Math.round(candidate.score) : null,
      method: candidate.method ? String(candidate.method) : '',
      confidence: candidate.confidence ? String(candidate.confidence) : ''
    });
  }

  return normalized;
};

const buildCandidateLabel = (candidate) => {
  const scoreLabel = Number.isFinite(candidate.score) ? ` (${candidate.score}%)` : '';
  if (candidate.alias && candidate.alias !== candidate.name) {
    return `${candidate.name} | 别名: ${candidate.alias}${scoreLabel}`;
  }
  return `${candidate.name}${scoreLabel}`;
};

const renderCandidateSelect = (mapping, mappingId, displayTarget) => {
  const candidates = normalizeCandidateList(mapping.candidates);
  const currentValue = mapping.actualName ? String(mapping.actualName) : '';

  if (candidates.length === 0) {
    const displayText = escapeHtml(displayTarget || '');
    return `<span class="target-name" title="${displayText}">${displayText}</span>`;
  }

  const deduped = candidates.slice();
  if (currentValue) {
    const currentKey = currentValue.toLowerCase();
    const hasCurrent = deduped.some(candidate => candidate.name.toLowerCase() === currentKey);
    if (!hasCurrent) {
      deduped.unshift({
        name: currentValue,
        score: Number.isFinite(mapping.confidence) ? Math.round(mapping.confidence) : null,
        method: 'current',
        confidence: 'current',
        alias: ''
      });
    }
  }

  if (deduped.length === 0) return '';

  const isRemoval = isDeletionMapping(mapping);
  const deleteOption = isRemoval
    ? `<option value="" ${currentValue ? '' : 'selected'}>建议删除</option>`
    : '';

  const optionItems = deduped.map((candidate) => {
    const selected = currentValue && candidate.name === currentValue ? 'selected' : '';
    const aliasValue = candidate.alias && candidate.alias !== candidate.name ? candidate.alias : '';
    const label = buildCandidateLabel(candidate);
    return `<option value="${escapeHtml(candidate.name)}" ${selected} data-alias="${escapeHtml(aliasValue)}">${escapeHtml(label)}</option>`;
  }).join('');

  const displayText = escapeHtml(displayTarget || '');
  return `
    <select class="mapping-candidates-select" data-mapping-id="${mappingId}" title="${displayText}">
      ${deleteOption}
      ${optionItems}
    </select>
  `;
};

const getChannelBadgeText = (mapping) => {
  const id = mapping?.channelId != null ? String(mapping.channelId) : '';
  const name = mapping?.channelName != null ? String(mapping.channelName) : '';
  if (name && id) return `${name} (#${id})`;
  if (name) return name;
  if (id) return `渠道 #${id}`;
  return '';
};

const renderChannelMeta = (mapping) => {
  const text = getChannelBadgeText(mapping);
  if (!text) return '';
  return `
    <div class="mapping-meta">
      <span class="channel-badge">${escapeHtml(text)}</span>
    </div>
  `;
};

const pollJobStatus = async () => {
  if (!activeJobId) return;

  try {
    const resp = await getOneClickUpdateJob(activeJobId, activeJobCursor);
    if (!resp?.success) {
      throw new Error(resp?.message || '获取任务状态失败');
    }

    const job = resp.job || {};
    appendJobLogs(resp.logs || []);
    activeJobCursor = resp.nextCursor || activeJobCursor;

    updateProgressUI(job.progress);

    if (job.status === 'running') {
      if (job.cancelled) {
        const current = Number(job.progress?.current || 0);
        const total = Number(job.progress?.total || 0);
        const percent = Number(job.progress?.percent || 0);
        const channelName = job.progress?.channelName ? `（${job.progress.channelName}）` : '';
        const text = total > 0
          ? `正在停止... ${current}/${total} ${channelName}`
          : '正在停止...';
        progress.update('oneClickUpdateProgressFill', 'oneClickUpdateProgressText', percent, text);
      }
      pollTimer = setTimeout(pollJobStatus, 600);
      return;
    }

    if (job.status === 'completed') {
      progress.complete('oneClickUpdateProgressFill', 'oneClickUpdateProgressText', '完成!');
      renderResults(job.results || {});
      if (job.type === 'preview') {
        lastPreviewJobId = job.id;
      }
      setJobControls(false);
      resetJobState();
      notifications.success(job.type === 'preview' ? '预览完成' : '更新完成');
      return;
    }

    if (job.status === 'cancelled') {
      progress.fail('oneClickUpdateProgressFill', 'oneClickUpdateProgressText', '已停止');
      setJobControls(false);
      resetJobState();
      notifications.warning('已停止');
      return;
    }

    progress.fail('oneClickUpdateProgressFill', 'oneClickUpdateProgressText', '失败');
    setJobControls(false);
    resetJobState();
    notifications.error(job.message || '任务失败');
  } catch (error) {
    setJobControls(false);
    resetJobState();
    progress.fail('oneClickUpdateProgressFill', 'oneClickUpdateProgressText', '失败');
    addLog('oneClickUpdateLogs', `❌ 获取任务状态失败: ${error.message}`, 'error');
    notifications.error(`任务失败: ${error.message}`);
  }
};

const startJob = async ({ dryRun, selectedMappings = null }) => {
  const progressContainer = $('oneClickUpdateProgress');
  const resultsContainer = $('oneClickUpdateResults');
  const logsContainer = $('oneClickUpdateLogs');

  if (progressContainer) progressContainer.style.display = 'block';
  if (resultsContainer) resultsContainer.style.display = 'none';
  if (logsContainer) {
    logsContainer.style.display = 'block';
    logsContainer.innerHTML = '';
  }

  resetJobState();
  isRestoring = false;
  setJobControls(true);
  const cancelBtn = $('cancelOneClickUpdateBtn');
  if (cancelBtn) cancelBtn.disabled = true;

  const options = getOneClickOptions();
  const channelIds = getSelectedChannelIdsOrNull();

  // 显示规则信息
  const rulesCount = (options.rules?.nameMatch?.length || 0) +
                    (options.rules?.merge?.length || 0) +
                    (options.rules?.custom?.length || 0);

  progress.start('oneClickUpdateProgressFill', 'oneClickUpdateProgressText', dryRun ? '正在分析...' : '创建检查点...');

  if (!dryRun) {
    addLog('oneClickUpdateLogs', '创建检查点...');
    const checkpointResult = await createCheckpoint(channelIds, {
      tag: 'oneclick',
      concurrency: options.concurrency
    });

    if (!checkpointResult?.success) {
      progress.fail('oneClickUpdateProgressFill', 'oneClickUpdateProgressText', '检查点创建失败');
      addLog('oneClickUpdateLogs', `检查点创建失败: ${checkpointResult?.message || '未知错误'}`, 'error');
      setJobControls(false);
      resetJobState();
      throw new Error(checkpointResult?.message || '检查点创建失败');
    }

    const checkpointInfo = {
      id: checkpointResult.checkpointId,
      createdAt: checkpointResult.createdAt,
      count: checkpointResult.count,
      tag: 'oneclick'
    };
    setLastCheckpoint(checkpointInfo);
    updateRollbackButton();

    const checkpointWarning = formatCheckpointWarning(checkpointResult);
    if (checkpointWarning) {
      addLog('oneClickUpdateLogs', checkpointWarning, 'warning');
      notifications.warning(checkpointWarning);
    }

    const warningText = checkpointWarning ? `\n${checkpointWarning}` : '';
    const secondConfirm = window.confirm(
      `检查点已创建（${checkpointInfo.id}）。${warningText}\n确认继续更新？`
    );
    if (!secondConfirm) {
      progress.reset('oneClickUpdateProgressFill', 'oneClickUpdateProgressText', '已取消');
      addLog('oneClickUpdateLogs', '已取消更新', 'warning');
      setJobControls(false);
      resetJobState();
      notifications.info('已取消更新');
      return { cancelled: true };
    }

    progress.update('oneClickUpdateProgressFill', 'oneClickUpdateProgressText', 5, '正在更新...');
  }

  if (rulesCount > 0) {
    addLog('oneClickUpdateLogs', `📋 使用 ${rulesCount} 条用户规则 (名称匹配: ${options.rules?.nameMatch?.length || 0}, 合并: ${options.rules?.merge?.length || 0}, 自定义: ${options.rules?.custom?.length || 0})`);
  } else {
    addLog('oneClickUpdateLogs', '⚠️ 未配置用户规则，将使用智能匹配算法');
  }

  if (options.includeUpgrades) {
    addLog('oneClickUpdateLogs', '已启用版本升级匹配');
  }

  const updateModeLabel = options.updateMode === 'append' ? '追加' : '覆盖';
  addLog('oneClickUpdateLogs', `更新模式: ${updateModeLabel}`);

  addLog('oneClickUpdateLogs', dryRun ? '🔍 启动预览任务...' : '⚡ 基于预览结果启动更新任务...');

  const result = dryRun
    ? await startOneClickUpdateJob(channelIds, true, options)
    : await startOneClickUpdateJobFromPreview(channelIds, lastPreviewJobId, options, selectedMappings);
  if (!result?.success || !result.jobId) {
    setJobControls(false);
    throw new Error(result?.message || '启动任务失败');
  }

  activeJobId = result.jobId;
  activeJobCursor = 0;
  updateRollbackButton();

  pollTimer = setTimeout(pollJobStatus, 200);
};

/**
 * 预览一键更新
 */
export const previewUpdate = async () => {
  try {
    // 重置状态
    lastPreviewJobId = null;
    previewMappings = [];
    selectedMappingIds.clear();

    const executeBtn = $('executeOneClickUpdateBtn');
    if (executeBtn) executeBtn.disabled = true;

    await startJob({ dryRun: true });
    return { success: true };
  } catch (error) {
    progress.fail('oneClickUpdateProgressFill', 'oneClickUpdateProgressText', '分析失败');
    addLog('oneClickUpdateLogs', `❌ 预览失败: ${error.message}`, 'error');
    notifications.error(`预览失败: ${error.message}`);
    return { success: false, message: error.message };
  }
};

/**
 * 执行一键更新（只更新选中的映射）
 */
export const executeUpdate = async () => {
  try {
    if (!lastPreviewJobId) {
      notifications.warning('请先完成预览分析');
      return { success: false, message: '请先完成预览分析' };
    }

    const selectedMappings = getSelectedMappings();
    if (selectedMappings.length === 0) {
      notifications.warning('请至少选择一个映射');
      return { success: false, message: '请至少选择一个映射' };
    }

    const firstConfirm = window.confirm('即将创建检查点并执行更新，是否继续？');
    if (!firstConfirm) {
      return { success: false, message: '用户取消' };
    }

    addLog('oneClickUpdateLogs', `📋 将更新 ${selectedMappings.length} 个选中的映射`);

    const startResult = await startJob({ dryRun: false, selectedMappings });
    if (startResult?.cancelled) {
      return { success: false, message: '用户取消' };
    }
    return { success: true };
  } catch (error) {
    progress.fail('oneClickUpdateProgressFill', 'oneClickUpdateProgressText', '更新失败');
    addLog('oneClickUpdateLogs', `❌ 更新失败: ${error.message}`, 'error');
    notifications.error(`更新失败: ${error.message}`);
    return { success: false, message: error.message };
  }
};

/**
 * 回退到上次检查点
 */
export const restoreLastCheckpoint = async () => {
  if (activeJobId) {
    notifications.warning('更新任务正在进行中');
    return { success: false, message: '更新任务正在进行中' };
  }

  const checkpoint = getLastCheckpoint();
  if (!checkpoint || !checkpoint.id) {
    notifications.warning('暂无可回退的检查点');
    return { success: false, message: '暂无可回退的检查点' };
  }

  const firstConfirm = window.confirm(`即将回退到检查点 ${checkpoint.id}，当前修改将被覆盖，是否继续？`);
  if (!firstConfirm) {
    return { success: false, message: '用户取消' };
  }

  const secondConfirm = window.confirm('请再次确认回退操作，是否继续？');
  if (!secondConfirm) {
    return { success: false, message: '用户取消' };
  }

  const progressContainer = $('oneClickUpdateProgress');
  const logsContainer = $('oneClickUpdateLogs');
  if (progressContainer) progressContainer.style.display = 'block';
  if (logsContainer) {
    logsContainer.style.display = 'block';
    logsContainer.innerHTML = '';
  }

  isRestoring = true;
  setJobControls(true);
  progress.start('oneClickUpdateProgressFill', 'oneClickUpdateProgressText', '正在回退...');
  addLog('oneClickUpdateLogs', `开始回退到检查点 ${checkpoint.id}...`);

  try {
    const result = await restoreCheckpoint(checkpoint.id, { concurrency: 6 });
    if (result.success) {
      progress.complete('oneClickUpdateProgressFill', 'oneClickUpdateProgressText', '回退完成');
      addLog('oneClickUpdateLogs', `回退完成: ${result.restored} 个渠道`, 'success');
      if (result.failed > 0) {
        addLog('oneClickUpdateLogs', `回退失败: ${result.failed} 个渠道`, 'warning');
      }
      notifications.success('回退完成');
      return { success: true, result };
    }

    progress.fail('oneClickUpdateProgressFill', 'oneClickUpdateProgressText', '回退失败');
    addLog('oneClickUpdateLogs', `回退失败: ${result.message || '未知错误'}`, 'error');
    notifications.error(`回退失败: ${result.message || '未知错误'}`);
    return { success: false, message: result.message || '回退失败' };
  } catch (error) {
    progress.fail('oneClickUpdateProgressFill', 'oneClickUpdateProgressText', '回退失败');
    addLog('oneClickUpdateLogs', `回退失败: ${error.message}`, 'error');
    notifications.error(`回退失败: ${error.message}`);
    return { success: false, message: error.message };
  } finally {
    isRestoring = false;
    setJobControls(false);
    updateRollbackButton();
  }
};

export const cancelActiveJob = async () => {
  if (!activeJobId) return;
  try {
    await cancelOneClickUpdateJob(activeJobId);
    const cancelBtn = $('cancelOneClickUpdateBtn');
    if (cancelBtn) cancelBtn.disabled = true;
    addLog('oneClickUpdateLogs', '⏹️ 已请求停止，正在收尾...', 'warning');
  } catch (error) {
    addLog('oneClickUpdateLogs', `❌ 停止失败: ${error.message}`, 'error');
  }
};

/**
 * 渲染失效映射列表
 */
const renderBrokenMappings = (brokenMappings) => {
  const container = $('brokenMappingsList');
  if (!container) return;

  if (brokenMappings.length === 0) {
    container.innerHTML = '<div class="empty-state">没有发现失效的映射</div>';
    return;
  }

  container.innerHTML = brokenMappings.map(mapping => `
    <div class="mapping-item warning">
      ${renderChannelMeta(mapping)}
      <div class="mapping-info">
        <span class="model-name">${escapeHtml(mapping.originalModel || mapping.standardName || '')}</span>
        <i class="fas fa-arrow-right"></i>
        <span class="target-name">${escapeHtml(mapping.expectedModel || mapping.actualName || '')}</span>
      </div>
      <div class="mapping-reason">${escapeHtml(mapping.reason || '模型名称变更')}</div>
    </div>
  `).join('');
};

/**
 * 生成映射的唯一ID
 */
const getMappingId = (mapping, index) => {
  return `${mapping.channelId || 'unknown'}_${mapping.standardName || ''}_${index}`;
};

/**
 * 更新已选数量显示
 */
const updateSelectedCount = () => {
  const countEl = $('selectedMappingsCount');
  if (countEl) {
    countEl.textContent = `已选: ${selectedMappingIds.size}`;
  }
  // 更新执行按钮状态
  const executeBtn = $('executeOneClickUpdateBtn');
  if (executeBtn) {
    executeBtn.disabled = selectedMappingIds.size === 0 || activeJobId !== null;
  }
  const addSelectedBtn = $('addSelectedMappingsBtn');
  if (addSelectedBtn) {
    addSelectedBtn.disabled = selectedMappingIds.size === 0;
  }
};

/**
 * 切换映射选择状态
 */
const toggleMappingSelection = (mappingId, checked) => {
  if (checked) {
    selectedMappingIds.add(mappingId);
  } else {
    selectedMappingIds.delete(mappingId);
  }
  updateSelectedCount();
};

/**
 * 全选映射
 */
export const selectAllMappings = () => {
  previewMappings.forEach((mapping, index) => {
    const id = getMappingId(mapping, index);
    selectedMappingIds.add(id);
    const checkbox = document.querySelector(`input[data-mapping-id="${id}"]`);
    if (checkbox) checkbox.checked = true;
  });
  updateSelectedCount();
};

/**
 * 取消全选
 */
export const deselectAllMappings = () => {
  selectedMappingIds.clear();
  document.querySelectorAll('.mapping-checkbox').forEach(cb => cb.checked = false);
  updateSelectedCount();
};

/**
 * 仅选择高置信度映射
 */
export const selectHighConfidenceOnly = () => {
  selectedMappingIds.clear();
  previewMappings.forEach((mapping, index) => {
    const confidence = typeof mapping.confidence === 'number' ? mapping.confidence :
                       (mapping.confidence === 'high' ? 95 : mapping.confidence === 'medium' ? 80 : 60);
    const id = getMappingId(mapping, index);
    const checkbox = document.querySelector(`input[data-mapping-id="${id}"]`);
    if (confidence >= 90) {
      selectedMappingIds.add(id);
      if (checkbox) checkbox.checked = true;
    } else {
      if (checkbox) checkbox.checked = false;
    }
  });
  updateSelectedCount();
};

/**
 * 获取选中的映射列表
 */
export const getSelectedMappings = () => {
  return previewMappings.filter((mapping, index) => {
    const id = getMappingId(mapping, index);
    return selectedMappingIds.has(id);
  });
};

/**
 * 批量添加选中的映射到自定义映射
 */
export const addSelectedMappingsToCustom = () => {
  if (previewMappings.length === 0) {
    notifications.info('暂无可添加的映射');
    return;
  }

  let added = 0;
  let failed = 0;

  previewMappings.forEach((mapping, index) => {
    const mappingId = getMappingId(mapping, index);
    if (!selectedMappingIds.has(mappingId)) return;
    const success = addMappingToCustom(mappingId, { notify: false });
    if (success) {
      added += 1;
    } else {
      failed += 1;
    }
  });

  if (added === 0 && failed === 0) {
    notifications.info('请先选择需要添加的映射');
    return;
  }

  if (added > 0) {
    notifications.success(`已添加 ${added} 个映射`);
  }
  if (failed > 0) {
    notifications.warning(`有 ${failed} 个映射添加失败`);
  }
};

/**
 * 交换映射方向（standardName <-> actualName）
 */
const swapMappingDirection = (mappingId) => {
  const index = previewMappings.findIndex((m, i) => getMappingId(m, i) === mappingId);
  if (index === -1) {
    console.warn('未找到映射:', mappingId);
    return;
  }

  const mapping = previewMappings[index];
  if (isDeletionMapping(mapping)) {
    if (notify) notifications.warning('删除建议无法添加到映射表');
    return false;
  }
  const oldStandardName = mapping.standardName;
  const oldActualName = mapping.actualName;

  // 检查是否为空
  if (!oldStandardName || !oldActualName) {
    notifications.warning('映射数据不完整，无法交换');
    return;
  }

  // 交换值
  mapping.standardName = oldActualName;
  mapping.actualName = oldStandardName;

  // 重新计算新的 mappingId
  const newMappingId = getMappingId(mapping, index);

  // 更新 DOM
  const item = document.querySelector(`.mapping-item[data-mapping-id="${mappingId}"]`);
  if (item) {
    const modelName = item.querySelector('.model-name');
    const targetName = item.querySelector('.target-name');
    if (modelName && targetName) {
      // 交换显示文本
      const tempText = modelName.textContent;
      modelName.textContent = targetName.textContent;
      modelName.title = targetName.textContent;
      targetName.textContent = tempText;
      targetName.title = tempText;

      // 更新 data-attributes
      item.dataset.mappingId = newMappingId;
      item.dataset.standard = mapping.standardName;
      item.dataset.actual = mapping.actualName;

      // 更新 checkbox 的 data-mapping-id
      const checkbox = item.querySelector('.mapping-checkbox');
      if (checkbox) {
        checkbox.dataset.mappingId = newMappingId;
      }

      // 更新按钮的 data-mapping-id
      const swapBtn = item.querySelector('.btn-swap');
      const addBtn = item.querySelector('.btn-add');
      if (swapBtn) swapBtn.dataset.mappingId = newMappingId;
      if (addBtn) addBtn.dataset.mappingId = newMappingId;

      // 添加动画效果
      item.style.transition = 'transform 0.2s ease';
      item.style.transform = 'scale(0.98)';
      setTimeout(() => {
        item.style.transform = 'scale(1)';
      }, 100);
    }
  }

  // 更新 selectedMappingIds
  if (selectedMappingIds.has(mappingId)) {
    selectedMappingIds.delete(mappingId);
    selectedMappingIds.add(newMappingId);
  }

  notifications.success('已交换映射方向');
};

/**
 * 添加映射到自定义映射表
 */
const addMappingToCustom = (mappingId, options = {}) => {
  const notify = options.notify !== false;
  const index = previewMappings.findIndex((m, i) => getMappingId(m, i) === mappingId);
  if (index === -1) {
    console.warn('未找到映射:', mappingId);
    return false;
  }

  const mapping = previewMappings[index];
  const oldName = String(mapping.standardName || '').trim();
  const newName = String(mapping.actualName || '').trim();
  const sourceName = newName || oldName;
  const targetName = newName || oldName;

  if (!sourceName) {
    if (notify) notifications.error('映射数据不完整');
    return false;
  }

  // 使用 mappingModule 添加映射
  if (window.mappingModule && typeof window.mappingModule.addMapping === 'function') {
    const channelInfo = (mapping.channelId != null || mapping.channelName)
      ? { id: mapping.channelId, name: mapping.channelName }
      : null;
    const success = window.mappingModule.addMapping(sourceName, targetName, channelInfo);
    if (success) {
      if (notify) notifications.success(`已添加映射: ${sourceName} → ${targetName}`);
    } else {
      if (notify) notifications.error('添加映射失败');
    }
    return success;
  } else {
    console.error('mappingModule 未加载或不支持 addMapping 方法');
    if (notify) notifications.error('添加映射失败：系统模块未加载');
    return false;
  }
};

const updateMappingSelectionId = (oldMappingId, newMappingId, forceSelect = false) => {
  const wasSelected = selectedMappingIds.has(oldMappingId);
  if (oldMappingId !== newMappingId) {
    if (wasSelected) {
      selectedMappingIds.delete(oldMappingId);
    }
    if (forceSelect || wasSelected) {
      selectedMappingIds.add(newMappingId);
    }
    return;
  }
  if (forceSelect) {
    selectedMappingIds.add(newMappingId);
  }
};

const updateMappingItemDom = (item, mapping, oldMappingId, newMappingId) => {
  if (!item) return;

  const displayInfo = getMappingDisplayInfo(mapping);

  if (oldMappingId !== newMappingId) {
    item.dataset.mappingId = newMappingId;
  }
  item.dataset.standard = displayInfo.rawStandardName;
  item.dataset.actual = displayInfo.rawActualName;

  const modelName = item.querySelector('.model-name');
  if (modelName) {
    modelName.textContent = displayInfo.displaySourceRaw;
    modelName.title = displayInfo.displaySourceRaw;
  }

  const targetSelect = item.querySelector('.mapping-candidates-select');
  if (targetSelect) {
    const desiredValue = displayInfo.rawActualName || '';
    const options = Array.from(targetSelect.options || []);
    const hasDesired = desiredValue
      ? options.some(option => option.value === desiredValue)
      : options.some(option => option.value === '');
    if (!hasDesired) {
      const option = document.createElement('option');
      option.value = desiredValue;
      option.textContent = desiredValue || '建议删除';
      option.dataset.alias = '';
      targetSelect.insertBefore(option, targetSelect.firstChild);
    }
    targetSelect.value = desiredValue;
    targetSelect.title = displayInfo.displayTargetRaw;
  } else {
    const targetName = item.querySelector('.target-name');
    if (targetName) {
      targetName.textContent = displayInfo.displayTargetRaw;
      targetName.title = displayInfo.displayTargetRaw;
    }
  }

  const details = item.querySelector('.mapping-details');
  const metaRow = item.querySelector('.mapping-meta-row');
  if (displayInfo.showStandard) {
    if (metaRow) {
      const origin = metaRow.querySelector('.mapping-origin');
      if (origin) {
        origin.textContent = `标准名: ${displayInfo.displayStandardRaw}`;
      }
    } else if (details) {
      const row = document.createElement('div');
      row.className = 'mapping-meta-row';
      const origin = document.createElement('div');
      origin.className = 'mapping-origin';
      origin.textContent = `标准名: ${displayInfo.displayStandardRaw}`;
      row.appendChild(origin);
      details.appendChild(row);
    }
  } else if (metaRow) {
    metaRow.remove();
  }

  const actions = item.querySelector('.mapping-actions');
  if (actions) {
    if (displayInfo.isRemoval) {
      actions.innerHTML = '';
    } else {
      let addBtn = actions.querySelector('.btn-add');
      if (!addBtn) {
        addBtn = document.createElement('button');
        addBtn.className = 'btn-icon btn-add';
        addBtn.title = '添加到自定义映射';
        addBtn.innerHTML = '<i class="fas fa-plus"></i>';
        addBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          addMappingToCustom(addBtn.dataset.mappingId);
        });
        actions.appendChild(addBtn);
      }
      addBtn.dataset.mappingId = newMappingId;
    }
  }

  const checkbox = item.querySelector('.mapping-checkbox');
  if (checkbox) {
    checkbox.dataset.mappingId = newMappingId;
    checkbox.checked = selectedMappingIds.has(newMappingId);
  }

  const select = item.querySelector('.mapping-candidates-select');
  if (select) {
    select.dataset.mappingId = newMappingId;
  }
};

const handleCandidateSelection = (event) => {
  const select = event?.target;
  if (!select) return;
  const mappingId = select.dataset.mappingId;
  if (!mappingId) return;
  const index = previewMappings.findIndex((m, i) => getMappingId(m, i) === mappingId);
  if (index === -1) return;

  const mapping = previewMappings[index];
  const selectedValue = String(select.value || '').trim();
  const selectedOption = select.options[select.selectedIndex];
  const selectedAlias = selectedOption?.dataset?.alias ? String(selectedOption.dataset.alias).trim() : '';

  if (!selectedValue) {
    mapping.actualName = null;
    mapping.action = 'delete';
    mapping.removeModel = true;
    mapping.fixType = 'remove-invalid';
    mapping.displayTarget = '建议删除';
    delete mapping.displayStandard;
  } else {
    mapping.actualName = selectedValue;
    mapping.action = 'replace';
    mapping.removeModel = false;
    if (mapping.fixType === 'remove-invalid') {
      mapping.fixType = 'manual-select';
    }
    mapping.displayTarget = '';
    delete mapping.displayStandard;
    if (selectedAlias) {
      mapping.standardName = selectedAlias;
    }
  }

  const newMappingId = getMappingId(mapping, index);
  const forceSelect = isDeletionMapping(mapping);
  updateMappingSelectionId(mappingId, newMappingId, forceSelect);

  const item = document.querySelector(`.mapping-item[data-mapping-id="${mappingId}"]`);
  updateMappingItemDom(item, mapping, mappingId, newMappingId);
  updateSelectedCount();
};

/**
 * 渲染建议修复列表（优化版：按置信度分级展示，带选择功能）
 */
const renderNewMappings = (newMappings) => {
  const container = $('newMappingsList');
  if (!container) return;

  // 过滤掉无意义映射（保留删除项 + actualName 不为空且源不等于目标）
  const validMappings = newMappings.filter(m => {
    if (isDeletionMapping(m)) return true;
    // actualName 为空表示"建议删除此映射"，不是"可修复"
    if (!m.actualName) return false;
    // 如果源和目标相同，这是无意义的映射
    const source = (m.originalModel || m.standardName || '').toLowerCase();
    const target = (m.actualName || '').toLowerCase();
    if (source === target) return false;
    return true;
  });

  // 存储映射数据（只存储有效的）
  previewMappings = validMappings;
  selectedMappingIds.clear();

  if (validMappings.length === 0) {
    container.innerHTML = '<div class="empty-state">没有需要修复的映射</div>';
    updateSelectedCount();
    return;
  }

  // 默认选中高置信度映射 + 删除建议
  validMappings.forEach((mapping, index) => {
    const id = getMappingId(mapping, index);
    if (isDeletionMapping(mapping)) {
      selectedMappingIds.add(id);
      return;
    }
    const confidence = typeof mapping.confidence === 'number' ? mapping.confidence :
                       (mapping.confidence === 'high' ? 95 : mapping.confidence === 'medium' ? 80 : 60);
    if (confidence >= 90) {
      selectedMappingIds.add(id);
    }
  });

  // 按置信度分组
  const highConfidence = validMappings.map((m, i) => ({ ...m, _index: i })).filter(m => {
    const conf = typeof m.confidence === 'number' ? m.confidence : (m.confidence === 'high' ? 95 : m.confidence === 'medium' ? 80 : 60);
    return conf >= 90;
  });
  const mediumConfidence = validMappings.map((m, i) => ({ ...m, _index: i })).filter(m => {
    const conf = typeof m.confidence === 'number' ? m.confidence : (m.confidence === 'high' ? 95 : m.confidence === 'medium' ? 80 : 60);
    return conf >= 70 && conf < 90;
  });
  const lowConfidence = validMappings.map((m, i) => ({ ...m, _index: i })).filter(m => {
    const conf = typeof m.confidence === 'number' ? m.confidence : (m.confidence === 'high' ? 95 : m.confidence === 'medium' ? 80 : 60);
    return conf < 70;
  });

  // 按渠道分组的辅助函数
  const groupByChannel = (mappings) => {
    const groups = new Map();
    for (const mapping of mappings) {
      const key = mapping.channelId || 'unknown';
      if (!groups.has(key)) {
        groups.set(key, {
          channelId: mapping.channelId,
          channelName: mapping.channelName || `渠道 #${mapping.channelId}`,
          mappings: []
        });
      }
      groups.get(key).mappings.push(mapping);
    }
    return Array.from(groups.values());
  };

  // 渲染单个映射项（带checkbox和操作按钮）
  const renderMappingItem = (mapping, confidenceClass) => {
    const confidence = typeof mapping.confidence === 'number' ? mapping.confidence :
                       (mapping.confidence === 'high' ? 95 : mapping.confidence === 'medium' ? 80 : 60);
    const mappingId = getMappingId(mapping, mapping._index);
    const isChecked = selectedMappingIds.has(mappingId) ? 'checked' : '';
    const displayInfo = getMappingDisplayInfo(mapping);
    const isRemoval = displayInfo.isRemoval;
    const standardName = escapeHtml(displayInfo.rawStandardName);
    const actualName = escapeHtml(displayInfo.rawActualName);
    const displaySource = escapeHtml(displayInfo.displaySourceRaw);
    const displayTargetRaw = displayInfo.displayTargetRaw;
    const displayStandard = escapeHtml(displayInfo.displayStandardRaw);
    const showStandard = displayInfo.showStandard;

    return `
      <div class="mapping-item ${confidenceClass}" data-mapping-id="${mappingId}" data-standard="${standardName}" data-actual="${actualName}" data-channel-id="${mapping.channelId || ''}">
        <div class="mapping-select">
          <input type="checkbox" class="mapping-checkbox" data-mapping-id="${mappingId}" ${isChecked}>
        </div>
        <div class="mapping-content">
          <div class="mapping-details">
            <div class="mapping-info">
              <span class="model-name" title="${displaySource}">${displaySource}</span>
              <i class="fas fa-arrow-right"></i>
              ${renderCandidateSelect(mapping, mappingId, displayTargetRaw)}
            </div>
            ${mapping.reason ? `<div class="mapping-reason">${escapeHtml(mapping.reason)}</div>` : ''}
          ${showStandard ? `<div class="mapping-meta-row"><div class="mapping-origin">标准名: ${displayStandard}</div></div>` : ''}
          </div>
          <div class="mapping-actions">
            ${isRemoval ? '' : `
            <button class="btn-icon btn-add" data-mapping-id="${mappingId}" title="添加到自定义映射">
              <i class="fas fa-plus"></i>
            </button>
            `}
          </div>
        </div>
      </div>
    `;
  };

  // 渲染分组
  const renderGroup = (title, icon, mappings, confidenceClass, defaultExpanded = true) => {
    if (mappings.length === 0) return '';

    const channelGroups = groupByChannel(mappings);
    const expandedClass = defaultExpanded ? 'expanded' : '';

    return `
      <div class="confidence-group ${confidenceClass} ${expandedClass}">
        <div class="confidence-group-header" onclick="this.parentElement.classList.toggle('expanded')">
          <span class="group-icon"><i class="fas ${icon}"></i></span>
          <span class="group-title">${title}</span>
          <span class="group-count">${mappings.length} 个</span>
          <span class="expand-icon"><i class="fas fa-chevron-down"></i></span>
        </div>
        <div class="confidence-group-content">
          ${channelGroups.map(group => `
            <div class="channel-group">
              <div class="channel-group-header">
                <span class="channel-badge">${escapeHtml(group.channelName)} (#${group.channelId})</span>
                <span class="channel-count">${group.mappings.length} 个映射</span>
              </div>
              <div class="channel-mappings">
                ${group.mappings.map(m => renderMappingItem(m, confidenceClass)).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  container.innerHTML = `
    ${renderGroup('高置信度', 'fa-check-circle', highConfidence, 'high-confidence', true)}
    ${renderGroup('中置信度', 'fa-exclamation-circle', mediumConfidence, 'medium-confidence', true)}
    ${renderGroup('低置信度（建议删除或人工确认）', 'fa-question-circle', lowConfidence, 'low-confidence', false)}
  `;

  // 绑定checkbox事件
  container.querySelectorAll('.mapping-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      toggleMappingSelection(e.target.dataset.mappingId, e.target.checked);
    });
  });

  // 绑定添加到映射按钮事件
  container.querySelectorAll('.btn-add').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const mappingId = btn.dataset.mappingId;
      addMappingToCustom(mappingId);
    });
  });

  container.querySelectorAll('.mapping-candidates-select').forEach(select => {
    select.addEventListener('change', handleCandidateSelection);
  });

  updateSelectedCount();
};

/**
 * 打开一键更新弹窗
 */
export const openModal = () => {
  const modal = $('oneClickUpdateModal');
  if (modal) {
    modal.classList.add('show');
    modal.classList.remove('active');

    // 重置所有状态
    const resultsContainer = $('oneClickUpdateResults');
    if (resultsContainer) resultsContainer.style.display = 'none';

    const logsContainer = $('oneClickUpdateLogs');
    if (logsContainer) {
      logsContainer.style.display = 'none';
      logsContainer.innerHTML = '';
    }

    const progressContainer = $('oneClickUpdateProgress');
    if (progressContainer) progressContainer.style.display = 'none';

    // 重置状态变量
    lastPreviewJobId = null;
    previewMappings = [];
    selectedMappingIds.clear();
    resetJobState();
    setJobControls(false);

    // 更新选中数量显示
    updateSelectedCount();
    updateRollbackButton();
  }
};

/**
 * 关闭一键更新弹窗
 */
export const closeModal = () => {
  cancelActiveJob();
  const modal = $('oneClickUpdateModal');
  if (modal) {
    modal.classList.remove('show');
    modal.classList.remove('active');
  }
};

updateRollbackButton();

export default {
  previewUpdate,
  executeUpdate,
  restoreLastCheckpoint,
  cancelActiveJob,
  openModal,
  closeModal,
  selectAllMappings,
  deselectAllMappings,
  selectHighConfidenceOnly,
  getSelectedMappings,
  addSelectedMappingsToCustom
};
