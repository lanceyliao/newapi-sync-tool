/**
 * DOM 操作工具
 */

// 获取元素
export const $ = (id) => document.getElementById(id);

// 获取多个元素
export const $$ = (selector) => document.querySelectorAll(selector);

// 创建元素
export const create = (tag, attributes = {}, children = []) => {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'dataset') {
      for (const [dataKey, dataValue] of Object.entries(value)) {
        element.dataset[dataKey] = dataValue;
      }
    } else if (key.startsWith('on') && typeof value === 'function') {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else {
      element.setAttribute(key, value);
    }
  }

  for (const child of children) {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  }

  return element;
};

// 安全添加事件监听器
export const safeAddEventListener = (element, event, handler) => {
  if (!element) {
    console.warn(`无法为 null 元素添加事件监听器: ${event}`);
    return;
  }
  element.addEventListener(event, handler);
};

// 模板渲染
export const renderTemplate = (template, data = {}) => {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, key) => {
    const keys = key.split('.');
    let value = data;
    for (const k of keys) {
      if (value == null) break;
      value = value[k];
    }
    return value != null ? value : '';
  });
};

// 格式化时间
export const formatTime = (date = new Date()) => {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

// 防抖
export const debounce = (fn, delay) => {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};

// 节流
export const throttle = (fn, limit) => {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// 复制到剪贴板
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // 降级方案
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  }
};

// 从现有 ui.js 保留的函数
export const openModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) {
    // 统一使用 .show 类
    modal.classList.add('show');
    // 移除 .active 以确保一致性
    modal.classList.remove('active');
    // 点击遮罩层关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modalId);
      }
    }, { once: true });
  }
};

export const closeModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
    modal.classList.remove('active');
  }
};

export const closeAllModals = () => {
  document.querySelectorAll('.modal.show, .modal.active').forEach(m => {
    m.classList.remove('show');
    m.classList.remove('active');
  });
};

export const showLoading = (container, text = '加载中...') => {
  container.innerHTML = `<div class="empty-state">${text}</div>`;
};

export const showEmpty = (container, text = '暂无数据') => {
  container.innerHTML = `<div class="empty-state">${text}</div>`;
};

export const setProgress = (fillId, textId, percent, text) => {
  const fill = document.getElementById(fillId);
  if (fill) fill.style.width = `${percent}%`;
  if (textId && text) {
    const textEl = document.getElementById(textId);
    if (textEl) textEl.textContent = text;
  }
};

export const addLog = (containerId, msg, type = '', date = null) => {
  const container = document.getElementById(containerId);
  if (!container) return;

  const el = document.createElement('div');
  el.className = `log-item ${type}`;
  el.textContent = `[${formatTime(date || new Date())}] ${msg}`;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
};

export default {
  $,
  $$,
  create,
  safeAddEventListener,
  renderTemplate,
  formatTime,
  debounce,
  throttle,
  copyToClipboard,
  openModal,
  closeModal,
  closeAllModals,
  showLoading,
  showEmpty,
  setProgress,
  addLog
};
