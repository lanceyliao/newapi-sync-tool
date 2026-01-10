/**
 * 进度管理模块
 */
import { $ } from './dom.js';

class ProgressManager {
  constructor() {
    this.current = 0;
    this.status = '';
    this.type = 'info';
  }

  /**
   * 设置进度
   */
  set(fillId, textId, percent, text = '', type = 'info') {
    const fill = document.getElementById(fillId);
    if (fill) fill.style.width = `${percent}%`;

    if (textId && text) {
      const textEl = document.getElementById(textId);
      if (textEl) textEl.textContent = text;
    }

    this.current = percent;
    this.status = text;
    this.type = type;
  }

  /**
   * 开始进度
   */
  start(fillId, textId, text = '开始...') {
    this.set(fillId, textId, 0, text, 'info');
  }

  /**
   * 更新进度
   */
  update(fillId, textId, percent, text) {
    this.set(fillId, textId, percent, text, this.type);
  }

  /**
   * 完成
   */
  complete(fillId, textId, text = '完成!') {
    this.set(fillId, textId, 100, text, 'success');
  }

  /**
   * 失败
   */
  fail(fillId, textId, text = '失败') {
    this.set(fillId, textId, 100, text, 'error');
  }

  /**
   * 重置
   */
  reset(fillId, textId, text = '等待...') {
    this.set(fillId, textId, 0, text, 'info');
  }
}

export const progress = new ProgressManager();

export default progress;
