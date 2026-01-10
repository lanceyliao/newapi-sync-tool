/**
 * 事件系统
 * 提供发布/订阅模式的事件管理
 */

class EventEmitter {
  constructor() {
    this._events = new Map();
    this._maxListeners = 10;
  }

  /**
   * 绑定事件
   */
  on(event, callback, once = false) {
    if (typeof callback !== 'function') {
      throw new Error('事件回调必须是函数');
    }

    if (!this._events.has(event)) {
      this._events.set(event, []);
    }

    const listeners = this._events.get(event);
    if (listeners.length >= this._maxListeners) {
      console.warn(`事件 "${event}" 的监听器数量超过最大值 ${this._maxListeners}`);
    }

    listeners.push({ callback, once });
    return this;
  }

  /**
   * 只触发一次
   */
  once(event, callback) {
    return this.on(event, callback, true);
  }

  /**
   * 解绑事件
   */
  off(event, callback) {
    if (!this._events.has(event)) {
      return this;
    }

    const listeners = this._events.get(event);
    if (!callback) {
      this._events.delete(event);
      return this;
    }

    const filtered = listeners.filter(l => l.callback !== callback);
    if (filtered.length === 0) {
      this._events.delete(event);
    } else {
      this._events.set(event, filtered);
    }

    return this;
  }

  /**
   * 触发事件
   */
  emit(event, ...args) {
    if (!this._events.has(event)) {
      return false;
    }

    const listeners = this._events.get(event).slice(); // 复制一份，避免修改时出问题
    let hasListeners = false;

    for (const { callback, once } of listeners) {
      try {
        callback.apply(this, args);
        hasListeners = true;
      } catch (error) {
        console.error(`事件 "${event}" 执行错误:`, error);
      }

      if (once) {
        this.off(event, callback);
      }
    }

    return hasListeners;
  }

  /**
   * 触发事件（异步）
   */
  async emitAsync(event, ...args) {
    if (!this._events.has(event)) {
      return false;
    }

    const listeners = this._events.get(event).slice();
    let hasListeners = false;

    for (const { callback, once } of listeners) {
      try {
        await callback.apply(this, args);
        hasListeners = true;
      } catch (error) {
        console.error(`事件 "${event}" 执行错误:`, error);
      }

      if (once) {
        this.off(event, callback);
      }
    }

    return hasListeners;
  }

  /**
   * 获取监听器数量
   */
  listenerCount(event) {
    if (!this._events.has(event)) {
      return 0;
    }
    return this._events.get(event).length;
  }

  /**
   * 获取所有事件名称
   */
  eventNames() {
    return Array.from(this._events.keys());
  }

  /**
   * 清空所有事件
   */
  clear() {
    this._events.clear();
  }
}

// 全局事件总线
export const eventBus = new EventEmitter();

export default EventEmitter;
