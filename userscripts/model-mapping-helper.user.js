// ==UserScript==
// @name         New API 模型映射助手
// @namespace    https://newapi.zichuanlan.top/
// @version      3.0.0
// @description  在渠道编辑页面的模型重定向上方添加快捷模型映射功能（完整规则系统）
// @author       Sisyphus
// @match        https://newapi.zichuanlan.top/*
// @match        https://*.newapi.pro/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ========== 智能匹配规则（与项目完全一致）==========
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
      /(?:-|_|\s+)(?:instruct|instruction|chat|assistant|next|thinking|reasoning|reasoner|base|sft|dpo|rlhf|it)$/i
    ],
    stage: [
      /(?:-|_|\s+)(preview|beta|alpha|test|rc\d*|experimental|exp|latest|stable)$/i
    ],
    provider: [
      /(?:-|_|\s+)(official|internal|public|private|dev|test)$/i,
      /(?:-|_|\s+)[\u4e00-\u9fa5]{1,6}$/u
    ]
  };

  const SMART_MATCH_DATE_BEFORE_STAGE_RULES = [
    /(?:-|_|\s+)(20\d{2}\d{2}\d{2})(?:-|_|\s+)(preview|beta|alpha|test|rc\d*|experimental|exp|latest|stable|instruct|instruction|chat|assistant|next|thinking|reasoning|reasoner|base|sft|dpo|rlhf|it)$/i,
    /(?:-|_|\s+)(20\d{2})[-_.]\d{2}[-_.]\d{2}(?:-|_|\s+)(preview|beta|alpha|test|rc\d*|experimental|exp|latest|stable|instruct|instruction|chat|assistant|next|thinking|reasoning|reasoner|base|sft|dpo|rlhf|it)$/i
  ];

  // ========== 样式 ==========
  GM_addStyle(`
    .mm-helper { margin-bottom: 16px; padding: 16px; border: 1px solid var(--semi-color-border, #e0e0e0); border-radius: 8px; background: var(--semi-color-bg-2, #fafafa); }
    .mm-title { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-weight: 600; font-size: 14px; }
    .mm-badge { padding: 2px 8px; font-size: 12px; font-weight: 500; color: #fff; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 4px; }
    .mm-desc { margin-bottom: 12px; font-size: 12px; color: var(--semi-color-text-2, #666); }
    .mm-section { margin-bottom: 12px; padding: 12px; background: var(--semi-color-bg-0, #fff); border: 1px solid var(--semi-color-border, #e0e0e0); border-radius: 6px; }
    .mm-section-title { margin-bottom: 8px; font-size: 12px; font-weight: 500; color: var(--semi-color-text-1, #333); display: flex; justify-content: space-between; align-items: center; }
    .mm-options { display: flex; flex-wrap: wrap; gap: 10px; }
    .mm-option { display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer; }
    .mm-option input { width: 14px; height: 14px; cursor: pointer; }
    .mm-row { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
    .mm-input, .mm-select { flex: 1; padding: 8px 12px; font-size: 13px; border: 1px solid var(--semi-color-border, #e0e0e0); border-radius: 6px; background: var(--semi-color-bg-0, #fff); outline: none; }
    .mm-input:focus, .mm-select:focus { border-color: var(--semi-color-primary, #0077fa); }
    .mm-arrow { color: var(--semi-color-text-2, #666); font-size: 14px; }
    .mm-btn { padding: 8px 16px; font-size: 13px; border-radius: 6px; cursor: pointer; transition: all 0.2s; border: none; }
    .mm-btn-sm { padding: 6px 12px; font-size: 12px; }
    .mm-btn-primary { color: #fff; background: var(--semi-color-primary, #0077fa); }
    .mm-btn-success { color: #fff; background: var(--semi-color-success, #00b42a); }
    .mm-btn-secondary { color: var(--semi-color-text-0); background: var(--semi-color-fill-0, #f5f5f5); border: 1px solid var(--semi-color-border); }
    .mm-btn:hover { opacity: 0.85; }
    .mm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .mm-preview { margin-top: 12px; }
    .mm-preview-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 12px; font-weight: 500; }
    .mm-preview-list { display: flex; flex-direction: column; gap: 4px; max-height: 200px; overflow-y: auto; }
    .mm-preview-item { display: flex; align-items: center; padding: 6px 10px; font-size: 12px; background: var(--semi-color-bg-2, #f5f5f5); border-radius: 4px; }
    .mm-preview-item.changed { background: #e8f5e9; }
    .mm-preview-item.unchanged { opacity: 0.6; }
    .mm-preview-from, .mm-preview-to { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mm-preview-to { color: var(--semi-color-primary, #0077fa); font-weight: 500; }
    .mm-remove-model { margin-left: 8px; padding: 2px 8px; min-width: 24px; border-radius: 4px !important; }
    .mm-remove-model:hover { background: var(--semi-color-danger, #f53f3f) !important; color: #fff !important; }
    .mm-actions { display: flex; gap: 8px; margin-top: 12px; }
    .mm-empty { padding: 20px; text-align: center; color: var(--semi-color-text-3, #999); font-size: 12px; }
    .mm-toast { position: fixed; top: 20px; right: 20px; padding: 12px 20px; background: var(--semi-color-success, #00b42a); color: #fff; border-radius: 8px; font-size: 14px; z-index: 10000; animation: mmSlideIn 0.3s ease; }
    .mm-toast.error { background: var(--semi-color-danger, #f53f3f); }
    @keyframes mmSlideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .mm-stats { font-size: 11px; color: var(--semi-color-text-2, #666); font-weight: normal; }
    .mm-model-select-container { position: relative; }
    .mm-model-dropdown { position: absolute; top: 100%; left: 0; right: 0; max-height: 200px; overflow-y: auto; background: #fff; border: 1px solid var(--semi-color-border); border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 100; display: none; }
    .mm-model-dropdown.show { display: block; }
    .mm-model-option { padding: 8px 12px; cursor: pointer; font-size: 12px; }
    .mm-model-option:hover { background: var(--semi-color-fill-0, #f5f5f5); }
    .mm-affix-row { display: flex; gap: 8px; align-items: center; }
    .mm-affix-input { width: 150px; }
  `);

  // ========== 状态 ==========
  let channelModels = [];
  let allModels = [];
  let mappingResults = {};
  let currentChannelId = null;
  let options = {
    smartMatch: true,
    keepDate: false,
    keepVersion: false,
    keepNamespace: false,
    formatName: false,
    addPrefix: '',
    addSuffix: ''
  };

  // ========== 工具函数 ==========
  const showToast = (msg, isError = false) => {
    const t = document.createElement('div');
    t.className = `mm-toast${isError ? ' error' : ''}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  };

  const trimModelName = (v) => v.replace(/^[\s"'`]+|[\s"'`]+$/g, '').replace(/^[\s._-]+|[\s._-]+$/g, '');

  const stripRules = (v, rules) => {
    let r = v, updated = true;
    while (updated) {
      updated = false;
      for (const rule of rules) {
        if (rule.test(r)) { r = r.replace(rule, ''); updated = true; }
      }
    }
    return r;
  };

  const stripSuffixChain = (v, ruleGroups) => {
    let r = v, updated = true;
    while (updated) {
      updated = false;
      for (const rules of ruleGroups) {
        const next = trimModelName(stripRules(r, rules));
        if (next !== r) { r = next; updated = true; }
      }
    }
    return r;
  };

  const stripNamespacePrefix = (v) => {
    if (!v.includes('/')) return v;
    const parts = v.split('/').filter(Boolean);
    return parts.length <= 1 ? v : parts[parts.length - 1];
  };

  const stripLeadingIdentifiers = (v) => {
    let r = v.replace(/^@+/, '');
    r = r.replace(/^[a-zA-Z0-9._-]{2,32}[:|]/, '');
    return r;
  };

  const collapseSeparators = (v) => v.replace(/-{2,}/g, '-').replace(/_{2,}/g, '_').replace(/\s{2,}/g, ' ');

  const formatClaudeName = (v) => {
    if (!v) return v;
    const raw = String(v).trim();
    const byVersion = /^claude(?:-|_|\s+)(\d+)(?:[-_.](\d+))?(?:-|_|\s+)(haiku|sonnet|opus)$/i;
    const byVariant = /^claude(?:-|_|\s+)(haiku|sonnet|opus)(?:-|_|\s+)(\d+)(?:[-_.](\d+))?$/i;
    let m = raw.match(byVersion);
    if (m) return `claude-${m[3].toLowerCase()}-${m[2] ? m[1] + '.' + m[2] : m[1]}`;
    m = raw.match(byVariant);
    if (m) return `claude-${m[1].toLowerCase()}-${m[3] ? m[2] + '.' + m[3] : m[2]}`;
    return v;
  };

  // 智能名称匹配（核心函数）
  const applySmartNameMatching = (modelName) => {
    let r = trimModelName(String(modelName || '').trim());
    if (!r) return modelName;

    // 清理前缀
    r = trimModelName(stripRules(r, SMART_MATCH_PREFIX_RULES));
    if (!options.keepNamespace) r = trimModelName(stripNamespacePrefix(r));
    r = trimModelName(stripLeadingIdentifiers(r));

    // 清理渠道后缀
    r = trimModelName(stripRules(r, SMART_MATCH_SUFFIX_RULES.channel));

    // 清理日期
    if (!options.keepDate) {
      for (const rule of SMART_MATCH_DATE_BEFORE_STAGE_RULES) {
        if (rule.test(r)) r = r.replace(rule, '-$2');
      }
      r = trimModelName(stripRules(r, SMART_MATCH_SUFFIX_RULES.date));
    }

    // 清理版本
    if (!options.keepVersion) {
      r = stripSuffixChain(r, [
        SMART_MATCH_SUFFIX_RULES.stage,
        SMART_MATCH_SUFFIX_RULES.version,
        SMART_MATCH_SUFFIX_RULES.provider
      ]);
    }

    // 再次清理日期
    if (!options.keepDate) {
      r = trimModelName(stripRules(r, SMART_MATCH_SUFFIX_RULES.date));
    }

    // 格式化名称
    if (options.formatName) {
      r = trimModelName(formatClaudeName(r));
    }

    r = trimModelName(collapseSeparators(r));
    return r || modelName;
  };

  // 应用所有规则
  const applyAllRules = (modelName) => {
    let r = modelName;
    if (options.smartMatch) r = applySmartNameMatching(r);
    if (options.addPrefix) r = options.addPrefix + r;
    if (options.addSuffix) r = r + options.addSuffix;
    return r;
  };

  // 从 localStorage 获取当前渠道模型（简化版）
  const fetchAllModels = async () => {
    const channelId = getCurrentChannelId();

    if (!channelId) {
      showToast('无法获取当前渠道 ID', true);
      return [];
    }

    console.log('[MM] 获取渠道', channelId, '的模型...');

    // 从 /api/channel/{id} 获取渠道配置，其中包含 models 字段
    try {
      const res = await fetch(`/api/channel/${channelId}`, {
        headers: {
          'new-api-user': '1',
          'accept': 'application/json, text/plain, */*'
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data && data.data.models) {
          // models 可能是逗号分隔的字符串或数组
          const modelsStr = data.data.models;
          if (typeof modelsStr === 'string') {
            allModels = modelsStr.split(',').map(m => m.trim()).filter(Boolean);
          } else if (Array.isArray(modelsStr)) {
            allModels = modelsStr;
          }
          allModels = [...new Set(allModels)];
          console.log('[MM] 从渠道配置获取到', allModels.length, '个模型:', allModels.slice(0, 5));
          return allModels;
        } else {
          console.log('[MM] 渠道配置中没有 models 字段');
        }
      }
    } catch (e) {
      console.warn('[MM] 获取渠道配置失败:', e.message);
    }

    return [];
  };

  // 从 DOM 获取当前渠道已选的模型（简化版，不过滤）
  const getSelectedModelsFromDOM = () => {
    const models = [];
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return models;

    // 查找所有 closable tags（已选的模型标签）
    const allClosableTags = dialog.querySelectorAll('[class*="semi-tag-closable"]');
    allClosableTags.forEach((tag) => {
      const content = tag.querySelector('[class*="semi-tag-content"]');
      if (content) {
        let text = content.textContent.trim();
        // 排除明显的非模型标签
        if (text && text.length > 1 && !['default', 'cc', 'vip'].includes(text.toLowerCase())) {
          // 去除可能的分组前缀（如 "Claudeclaude-xxx" -> "claude-xxx"）
          const groupPrefixes = ['Claude', 'OpenAI', 'Google', 'DeepSeek', 'Anthropic', 'Meta', 'Mistral', 'Qwen', 'GLM', 'Moonshot', 'Yi', 'Baichuan', 'Gemini', 'GPT', 'Llama', 'Doubao', 'Hunyuan', 'Spark', 'ERNIE', 'ChatGLM', 'Minimax', 'Zhipu'];
          for (const prefix of groupPrefixes) {
            if (text.startsWith(prefix) && text.length > prefix.length) {
              const after = text.substring(prefix.length);
              // 检查是否是分组前缀（后面紧跟小写字母或数字）
              if (/^[a-z0-9\/]/.test(after)) {
                text = after;
                break;
              }
            }
          }
          if (!models.includes(text)) {
            models.push(text);
          }
        }
      }
    });
    return models;
  };

  // 从对话框获取当前渠道 ID
  const getCurrentChannelId = () => {
    // 方法1: 从 URL pathname 获取 (如 /channel/78)
    const pathnameMatch = window.location.pathname.match(/\/channel\/(\d+)/);
    if (pathnameMatch) return pathnameMatch[1];

    // 方法2: 从 URL hash 获取 (如 #/channel/78)
    const hashMatch = window.location.hash.match(/\/channel\/(\d+)/);
    if (hashMatch) return hashMatch[1];

    // 方法3: 从对话框的 URL 或隐藏字段获取
    const dialog = document.querySelector('[role="dialog"]');
    if (dialog) {
      // 从对话框 URL 获取
      const dialogUrl = dialog.dataset.url || dialog.dataset.href;
      if (dialogUrl) {
        const match = dialogUrl.match(/\/channel\/(\d+)/);
        if (match) return match[1];
      }

      // 从对话框内的链接或按钮获取
      const editBtn = dialog.querySelector('[href*="/channel/"]');
      if (editBtn) {
        const href = editBtn.href || editBtn.dataset.href;
        const match = href.match(/\/channel\/(\d+)/);
        if (match) return match[1];
      }

      // 从表单隐藏字段获取
      const hiddenId = dialog.querySelector('input[name="id"]');
      if (hiddenId) return hiddenId.value;

      // 从 URL hash 获取（对话框可能在 iframe 中）
      const dialogHash = dialog.location?.hash;
      if (dialogHash) {
        const match = dialogHash.match(/\/channel\/(\d+)/);
        if (match) return match[1];
      }
    }

    // 方法4: 拦截最近的 API 请求
    return currentChannelId;
  };

  // 从 API 获取当前渠道的模型
  const fetchChannelModels = async (channelId) => {
    if (!channelId) {
      console.warn('[MM] 无法获取渠道 ID');
      return [];
    }
    try {
      const res = await fetch(`/api/channel/${channelId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.data && data.data.models) {
          // models 可能是逗号分隔的字符串或数组
          const models = typeof data.data.models === 'string'
            ? data.data.models.split(',').map(m => m.trim()).filter(Boolean)
            : data.data.models;
          return models;
        }
      }
    } catch (e) {
      console.warn('[MM] 获取渠道模型失败:', e);
    }
    return [];
  };

  // 从 API 获取当前渠道的模型（用于"获取当前渠道模型"功能）
  const fetchCurrentChannelModels = async () => {
    const channelId = getCurrentChannelId();
    if (!channelId) {
      showToast('无法获取当前渠道 ID', true);
      return [];
    }
    const models = await fetchChannelModels(channelId);
    return models;
  };

  // 拦截 API 请求获取渠道 ID
  const interceptChannelRequests = () => {
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const response = await originalFetch.apply(this, args);
      const url = args[0];
      if (typeof url === 'string' && url.match(/\/api\/channel\/\d+$/)) {
        const match = url.match(/\/api\/channel\/(\d+)$/);
        if (match) {
          currentChannelId = match[1];
          console.log('[MM] 检测到渠道 ID:', currentChannelId);
        }
      }
      return response;
    };
  };

  // ========== 生成映射 ==========
  const generateMappings = () => {
    mappingResults = {};
    for (const m of channelModels) {
      mappingResults[m] = applyAllRules(m);
    }
    renderPreview();
  };

  // ========== 渲染 ==========
  const renderPreview = () => {
    const list = document.querySelector('#mm-preview-list');
    const stats = document.querySelector('#mm-stats');
    if (!list) return;

    const entries = Object.entries(mappingResults);
    if (entries.length === 0) {
      list.innerHTML = '<div class="mm-empty">请先刷新获取渠道模型</div>';
      if (stats) stats.textContent = '';
      return;
    }

    const changed = entries.filter(([f, t]) => f !== t).length;
    if (stats) stats.textContent = `共 ${entries.length} 个，${changed} 个将被修改`;

    list.innerHTML = entries.map(([f, t]) => `
      <div class="mm-preview-item ${f !== t ? 'changed' : 'unchanged'}" data-model="${f}">
        <span class="mm-preview-from" title="${f}">${f}</span>
        <span class="mm-arrow">→</span>
        <span class="mm-preview-to" title="${t}">${f !== t ? t : '(不变)'}</span>
        <button type="button" class="mm-btn mm-btn-sm mm-btn-secondary mm-remove-model" data-model="${f}" title="删除">×</button>
      </div>
    `).join('');

    // 绑定删除事件
    list.querySelectorAll('.mm-remove-model').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const modelToRemove = btn.dataset.model;
        delete mappingResults[modelToRemove];
        channelModels = channelModels.filter(m => m !== modelToRemove);
        renderPreview();
        showToast(`已删除: ${modelToRemove}`);
      });
    });
  };

  // ========== 应用映射 ==========
  const applyMappings = () => {
    const changed = {};
    for (const [f, t] of Object.entries(mappingResults)) {
      if (f !== t) changed[f] = t;
    }
    if (Object.keys(changed).length === 0) {
      showToast('没有需要应用的映射', true);
      return;
    }

    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) { showToast('未找到对话框', true); return; }

    // 查找模型重定向区域（使用更灵活的选择器）
    const allElements = dialog.querySelectorAll('*');
    let modelRedirectContainer = null;
    allElements.forEach(el => {
      if (el.textContent && el.textContent.trim() === '模型重定向') {
        // 向上查找容器
        let parent = el.parentElement;
        for (let i = 0; i < 3 && parent; i++) {
          if (parent.querySelector('[role="tablist"]')) {
            modelRedirectContainer = parent;
            break;
          }
          parent = parent.parentElement;
        }
      }
    });

    if (!modelRedirectContainer) { showToast('未找到模型重定向区域', true); return; }

    const tabs = modelRedirectContainer.querySelectorAll('[role="tab"]');
    let manualTab = null;
    tabs.forEach(t => { if (t.textContent.includes('手动编辑')) manualTab = t; });

    if (manualTab) {
      manualTab.click();
      setTimeout(() => {
        const textarea = modelRedirectContainer.querySelector('textarea');
        if (textarea) {
          let existing = {};
          try { if (textarea.value.trim()) existing = JSON.parse(textarea.value); } catch (e) {}
          const merged = { ...existing, ...changed };
          const json = JSON.stringify(merged, null, 2);
          const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
          setter.call(textarea, json);
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
          showToast(`已应用 ${Object.keys(changed).length} 条映射`);
        } else {
          showToast('未找到输入框', true);
        }
      }, 300);
    } else {
      showToast('未找到手动编辑选项卡', true);
    }
  };

  // ========== 创建 UI ==========
  const createUI = () => {
    const c = document.createElement('div');
    c.className = 'mm-helper';
    c.innerHTML = `
      <div class="mm-title">
        <span class="mm-badge">助手</span>
        <span>模型映射快捷工具</span>
      </div>
      <div class="mm-desc">自动清理模型名称中的前缀、后缀、日期、版本号等，或添加自定义前缀/后缀。</div>
      
      <div class="mm-section">
        <div class="mm-section-title">智能匹配选项</div>
        <div class="mm-options">
          <label class="mm-option"><input type="checkbox" id="mm-smart" checked> 启用智能匹配</label>
          <label class="mm-option"><input type="checkbox" id="mm-keepDate"> 保留日期</label>
          <label class="mm-option"><input type="checkbox" id="mm-keepVersion"> 保留版本号</label>
          <label class="mm-option"><input type="checkbox" id="mm-keepNs"> 保留命名空间</label>
          <label class="mm-option"><input type="checkbox" id="mm-format"> 格式化名称</label>
        </div>
      </div>

      <div class="mm-section">
        <div class="mm-section-title">添加前缀/后缀</div>
        <div class="mm-affix-row">
          <input type="text" class="mm-input mm-affix-input" id="mm-prefix" placeholder="添加前缀">
          <span>+ 模型名 +</span>
          <input type="text" class="mm-input mm-affix-input" id="mm-suffix" placeholder="添加后缀">
        </div>
      </div>

        <div class="mm-section">
          <div class="mm-section-title">
            <span>从渠道可用模型中添加</span>
            <button type="button" class="mm-btn mm-btn-sm mm-btn-secondary" id="mm-fetch-all">获取可用模型</button>
          </div>
          <div class="mm-row">
            <select class="mm-select" id="mm-all-models-select">
              <option value="">-- 选择模型添加到重定向 --</option>
            </select>
            <button type="button" class="mm-btn mm-btn-sm mm-btn-primary" id="mm-add-model">添加</button>
          </div>
        </div>

      <div class="mm-preview">
        <div class="mm-preview-title">
          <span>映射预览</span>
          <span class="mm-stats" id="mm-stats"></span>
        </div>
        <div class="mm-preview-list" id="mm-preview-list">
          <div class="mm-empty">请先刷新获取渠道模型</div>
        </div>
      </div>

      <div class="mm-actions">
        <button type="button" class="mm-btn mm-btn-secondary" id="mm-refresh">刷新模型列表</button>
        <button type="button" class="mm-btn mm-btn-success" id="mm-apply">应用到下方</button>
      </div>
    `;

    // 绑定选项事件
    const bindOpt = (id, key) => {
      const el = c.querySelector(`#${id}`);
      if (el) el.addEventListener('change', () => { options[key] = el.checked; if (channelModels.length) generateMappings(); });
    };
    bindOpt('mm-smart', 'smartMatch');
    bindOpt('mm-keepDate', 'keepDate');
    bindOpt('mm-keepVersion', 'keepVersion');
    bindOpt('mm-keepNs', 'keepNamespace');
    bindOpt('mm-format', 'formatName');

    // 前缀后缀
    c.querySelector('#mm-prefix').addEventListener('input', (e) => { options.addPrefix = e.target.value; if (channelModels.length) generateMappings(); });
    c.querySelector('#mm-suffix').addEventListener('input', (e) => { options.addSuffix = e.target.value; if (channelModels.length) generateMappings(); });

    // 刷新按钮 - 从 DOM 获取当前渠道模型
    c.querySelector('#mm-refresh').addEventListener('click', () => {
      const btn = c.querySelector('#mm-refresh');
      btn.textContent = '加载中...';
      btn.disabled = true;
      
      try {
        channelModels = getSelectedModelsFromDOM();
        
        if (channelModels.length > 0) {
          showToast(`已获取 ${channelModels.length} 个模型`);
          generateMappings();
        } else {
          showToast('未获取到模型，请先在上方选择模型', true);
        }
      } finally {
        btn.textContent = '刷新模型列表';
        btn.disabled = false;
      }
    });

    // 获取可用模型 - 从 API 获取当前渠道的可用模型列表（使用事件委托）
    document.addEventListener('click', async (e) => {
      if (e.target.id === 'mm-fetch-all') {
        const btn = e.target;
        btn.textContent = '加载中...';
        btn.disabled = true;
        try {
          await fetchAllModels();
          btn.textContent = '获取可用模型';
          btn.disabled = false;
          
          const select = document.querySelector('#mm-all-models-select');
          if (select) {
            select.innerHTML = '<option value="">-- 选择模型添加到重定向 --</option>' +
              allModels.map(m => `<option value="${m}">${m}</option>`).join('');
          }
          showToast(`已获取 ${allModels.length} 个可用模型`);
        } catch (err) {
          btn.textContent = '获取可用模型';
          btn.disabled = false;
          console.error('[MM] 获取失败:', err);
        }
      }
    });

    // 添加模型到当前渠道（使用事件委托）
    document.addEventListener('click', (e) => {
      if (e.target.id === 'mm-add-model') {
        const select = document.querySelector('#mm-all-models-select');
        const model = select ? select.value : '';
        if (!model) { showToast('请先选择模型', true); return; }
        if (channelModels.includes(model)) { showToast('模型已存在', true); return; }
        channelModels.push(model);
        if (select) select.value = '';
        generateMappings();
        showToast(`已添加: ${model}`);
      }
    });

    return c;
  };

  // ========== 插入 UI ==========
  const insertHelper = () => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return;

    const labels = dialog.querySelectorAll('[class*="semi-form-field-label"]');
    let container = null;
    labels.forEach(l => { if (l.textContent.trim() === '模型重定向') container = l.closest('[class*="semi-form-field"]'); });

    if (container && !document.querySelector('.mm-helper')) {
      const ui = createUI();
      container.parentNode.insertBefore(ui, container);
      console.log('[MM] UI 已插入');
      
      // 自动获取渠道模型（优先 DOM）
      setTimeout(() => {
        channelModels = getSelectedModelsFromDOM();
        if (channelModels.length) {
          generateMappings();
          console.log('[MM] 自动加载了', channelModels.length, '个模型');
        }
      }, 500);
    }
  };

  // ========== 监听 DOM ==========
  const observeDOM = () => {
    const observer = new MutationObserver(() => {
      if (document.querySelector('[role="dialog"]')) setTimeout(insertHelper, 500);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  // ========== 初始化 ==========
  const init = () => {
    console.log('[MM] 初始化中...');
    interceptChannelRequests(); // 拦截 API 请求获取渠道 ID
    observeDOM();
    setTimeout(insertHelper, 1000);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
