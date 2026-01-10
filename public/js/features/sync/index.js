/**
 * 同步功能模块
 */
import { state, setOps } from '../../core/state.js';
import { syncModels, batchSync, createCheckpoint, restoreCheckpoint } from '../../api/sync.js';
import { $ } from '../../ui/dom.js';
import { addLog, setProgress } from '../../ui/dom.js';
import { notifications } from '../../ui/notifications.js';
import { progress } from '../../ui/progress.js';
import { getLastCheckpoint, setLastCheckpoint } from '../../core/checkpoint.js';

const updateRollbackButton = () => {
  const btn = $('rollbackSyncBtn');
  if (!btn) return;
  const checkpoint = getLastCheckpoint();
  const hasCheckpoint = Boolean(checkpoint && checkpoint.id);
  btn.disabled = !hasCheckpoint || state.isSyncing;
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
 * 开始同步
 */
export const startSync = async (mode = 'append') => {
  if (state.isSyncing) {
    notifications.warning('同步正在进行中');
    return { success: false, message: '同步正在进行中' };
  }

  if (!state.config.baseUrl || !state.config.token || !state.config.userId) {
    notifications.error('请先配置连接信息');
    return { success: false, message: '请先配置连接信息' };
  }

  if (Object.keys(state.mappings).length === 0) {
    notifications.warning('请先生成模型映射');
    return { success: false, message: '请先生成模型映射' };
  }

  const firstConfirm = window.confirm('即将创建检查点并执行同步操作，是否继续？');
  if (!firstConfirm) {
    return { success: false, message: '用户取消' };
  }

  state.isSyncing = true;

  // UI 初始化
  const syncSection = $('syncSection');
  if (syncSection) syncSection.classList.remove('hidden');

  const logsContainer = $('syncLogs');
  if (logsContainer) logsContainer.innerHTML = '';

  progress.start('progressFill', 'progressText', '创建检查点...');
  addLog('syncLogs', '创建检查点...');

  try {
    // 更新进度
    progress.update('progressFill', 'progressText', 30, '创建检查点...');

    // 获取选中的渠道 ID
    // 优先使用手动选择的渠道，否则从选中模型的渠道信息中提取
    let selectedChannelIds = setOps.getChannelsArray();

    if (selectedChannelIds.length === 0) {
      // 从 modelChannelMap 中提取选中模型对应的渠道ID
      const channelIdSet = new Set();
      for (const model of Object.keys(state.mappings)) {
        const channelInfo = state.modelChannelMap[model];
        if (channelInfo && channelInfo.id != null) {
          channelIdSet.add(channelInfo.id);
        }
      }
      selectedChannelIds = Array.from(channelIdSet);
    }

    const channelIds = selectedChannelIds.length > 0 ? selectedChannelIds : null;

    const checkpointResult = await createCheckpoint(channelIds, {
      tag: 'sync',
      concurrency: 6
    });

    if (!checkpointResult?.success) {
      progress.fail('progressFill', 'progressText', '检查点创建失败');
      addLog('syncLogs', `检查点创建失败: ${checkpointResult?.message || '未知错误'}`, 'error');
      notifications.error(`检查点创建失败: ${checkpointResult?.message || '未知错误'}`);
      return { success: false, message: checkpointResult?.message || '检查点创建失败' };
    }

    const checkpointInfo = {
      id: checkpointResult.checkpointId,
      createdAt: checkpointResult.createdAt,
      count: checkpointResult.count,
      tag: 'sync'
    };
    setLastCheckpoint(checkpointInfo);
    updateRollbackButton();

    const checkpointWarning = formatCheckpointWarning(checkpointResult);
    if (checkpointWarning) {
      addLog('syncLogs', checkpointWarning, 'warning');
      notifications.warning(checkpointWarning);
    }

    const warningText = checkpointWarning ? `\n${checkpointWarning}` : '';
    const secondConfirm = window.confirm(
      `检查点已创建（${checkpointInfo.id}）。${warningText}\n确认继续同步？`
    );
    if (!secondConfirm) {
      progress.reset('progressFill', 'progressText', '已取消');
      addLog('syncLogs', '已取消同步', 'warning');
      notifications.info('已取消同步');
      return { success: false, message: '用户取消' };
    }

    progress.update('progressFill', 'progressText', 30, '正在同步...');
    addLog('syncLogs', '开始同步模型映射...');

    if (channelIds && channelIds.length > 0) {
      addLog('syncLogs', `📋 同步到 ${channelIds.length} 个渠道: ${channelIds.join(', ')}`);
    } else {
      addLog('syncLogs', `⚠️ 未找到关联渠道，请先选择模型`, 'warning');
      progress.fail('progressFill', 'progressText', '无渠道可同步');
      notifications.warning('未找到关联渠道，请先选择模型');
      return { success: false, message: '未找到关联渠道' };
    }

    // 执行同步 - 传递选中的渠道 ID
    // state.mappings 格式是 { 原始模型名: 新模型名 }
    const result = await syncModels(state.config, state.mappings, mode, channelIds);

    if (result.success) {
      progress.complete('progressFill', 'progressText', '同步完成!');

      // 记录结果
      const stats = result.stats || {};
      const successMsg = `✅ 同步成功: ${stats.success || 0} 个渠道已更新`;
      const failedMsg = stats.failed > 0 ? `, ${stats.failed} 个失败` : '';
      const unchangedMsg = stats.unchanged > 0 ? `, ${stats.unchanged} 个未变更` : '';

      addLog('syncLogs', successMsg + failedMsg + unchangedMsg, 'success');

      if (result.logs) {
        result.logs.forEach(log => addLog('syncLogs', log));
      }

      notifications.success('同步完成');
      return { success: true, stats, logs: result.logs };
    } else {
      progress.fail('progressFill', 'progressText', '同步失败');
      addLog('syncLogs', `❌ 同步失败: ${result.message}`, 'error');
      notifications.error(`同步失败: ${result.message}`);
      return { success: false, message: result.message };
    }
  } catch (error) {
    progress.fail('progressFill', 'progressText', '同步失败');
    addLog('syncLogs', `❌ 同步失败: ${error.message}`, 'error');
    notifications.error(`同步失败: ${error.message}`);
    return { success: false, message: error.message };
  } finally {
    state.isSyncing = false;
    updateRollbackButton();
  }
};

/**
 * 批量同步（按渠道分组）
 */
export const batchSyncChannels = async (channelMappings, onProgress) => {
  if (state.isSyncing) {
    notifications.warning('同步正在进行中');
    return { success: false, message: '同步正在进行中' };
  }

  if (!channelMappings || channelMappings.length === 0) {
    notifications.warning('没有可同步的渠道');
    return { success: false, message: '没有可同步的渠道' };
  }

  state.isSyncing = true;

  const logsContainer = $('syncLogs');
  if (logsContainer) logsContainer.innerHTML = '';

  addLog('syncLogs', '创建检查点...');

  try {
    const channelIds = channelMappings
      .map(item => item?.channelId)
      .filter(id => id != null);

    const checkpointResult = await createCheckpoint(channelIds, {
      tag: 'batch-sync',
      concurrency: 6
    });

    if (!checkpointResult?.success) {
      addLog('syncLogs', `检查点创建失败: ${checkpointResult?.message || '未知错误'}`, 'error');
      notifications.error(`检查点创建失败: ${checkpointResult?.message || '未知错误'}`);
      return { success: false, message: checkpointResult?.message || '检查点创建失败' };
    }

    const checkpointInfo = {
      id: checkpointResult.checkpointId,
      createdAt: checkpointResult.createdAt,
      count: checkpointResult.count,
      tag: 'batch-sync'
    };
    setLastCheckpoint(checkpointInfo);
    updateRollbackButton();

    const checkpointWarning = formatCheckpointWarning(checkpointResult);
    if (checkpointWarning) {
      addLog('syncLogs', checkpointWarning, 'warning');
      notifications.warning(checkpointWarning);
    }

    const warningText = checkpointWarning ? `\n${checkpointWarning}` : '';
    const secondConfirm = window.confirm(
      `检查点已创建（${checkpointInfo.id}）。${warningText}\n确认继续批量同步？`
    );
    if (!secondConfirm) {
      addLog('syncLogs', '已取消批量同步', 'warning');
      notifications.info('已取消批量同步');
      return { success: false, message: '用户取消' };
    }

    addLog('syncLogs', `开始批量同步 ${channelMappings.length} 个渠道...`);

    const results = await batchSync(state.config, channelMappings, onProgress);

    addLog('syncLogs', `✅ 批量同步完成: 成功 ${results.success}, 失败 ${results.failed}`, 'success');

    if (results.errors.length > 0) {
      addLog('syncLogs', `❌ 以下渠道同步失败:`, 'error');
      results.errors.forEach(e => addLog('syncLogs', `  - 渠道 ${e.channelId}: ${e.error}`, 'error'));
    }

    notifications.success(`批量同步完成: 成功 ${results.success}, 失败 ${results.failed}`);
    return { success: true, results };
  } catch (error) {
    addLog('syncLogs', `❌ 批量同步失败: ${error.message}`, 'error');
    notifications.error(`批量同步失败: ${error.message}`);
    return { success: false, message: error.message };
  } finally {
    state.isSyncing = false;
    updateRollbackButton();
  }
};

/**
 * 回退到上次检查点
 */
export const restoreLastCheckpoint = async () => {
  if (state.isSyncing) {
    notifications.warning('同步正在进行中');
    return { success: false, message: '同步正在进行中' };
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

  state.isSyncing = true;

  const logsContainer = $('syncLogs');
  if (logsContainer) logsContainer.innerHTML = '';

  progress.start('progressFill', 'progressText', '正在回退...');
  addLog('syncLogs', `开始回退到检查点 ${checkpoint.id}...`);

  try {
    const result = await restoreCheckpoint(checkpoint.id, { concurrency: 6 });

    if (result.success) {
      progress.complete('progressFill', 'progressText', '回退完成');
      addLog('syncLogs', `回退完成: ${result.restored} 个渠道`, 'success');
      if (result.failed > 0) {
        addLog('syncLogs', `回退失败: ${result.failed} 个渠道`, 'warning');
      }
      notifications.success('回退完成');
      return { success: true, result };
    }

    progress.fail('progressFill', 'progressText', '回退失败');
    addLog('syncLogs', `回退失败: ${result.message || '未知错误'}`, 'error');
    notifications.error(`回退失败: ${result.message || '未知错误'}`);
    return { success: false, message: result.message || '回退失败' };
  } catch (error) {
    progress.fail('progressFill', 'progressText', '回退失败');
    addLog('syncLogs', `回退失败: ${error.message}`, 'error');
    notifications.error(`回退失败: ${error.message}`);
    return { success: false, message: error.message };
  } finally {
    state.isSyncing = false;
    updateRollbackButton();
  }
};

/**
 * 获取同步状态
 */
export const getSyncStatus = () => {
  return {
    isSyncing: state.isSyncing,
    mappingsCount: Object.keys(state.mappings).length,
    channelsCount: state.channels.length
  };
};

/**
 * 取消同步
 */
export const cancelSync = () => {
  state.isSyncing = false;
  progress.reset('progressFill', 'progressText', '同步已取消');
  addLog('syncLogs', '⚠️ 同步已取消');
  notifications.info('同步已取消');
  updateRollbackButton();
};

updateRollbackButton();

export default {
  startSync,
  batchSyncChannels,
  restoreLastCheckpoint,
  getSyncStatus,
  cancelSync
};
