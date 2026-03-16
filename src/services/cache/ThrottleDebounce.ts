/**
 * 防抖节流工具
 * 优化高频请求和事件处理
 */

// 防抖选项
export interface DebounceOptions {
  wait: number;
  immediate?: boolean;
}

// 节流选项
export interface ThrottleOptions {
  wait: number;
  leading?: boolean;
  trailing?: boolean;
}

/**
 * 防抖函数
 * 延迟执行，如果在等待期间再次调用则重新计时
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };

    const callNow = immediate && !timeout;

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);

    if (callNow) {
      func.apply(this, args);
    }
  };
}

/**
 * 节流函数
 * 限制执行频率，在指定时间窗口内最多执行一次
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let previous = 0;
  const { leading = true, trailing = true } = options;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();

    if (!previous && !leading) {
      previous = now;
    }

    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }

      previous = now;
      func.apply(this, args);
    } else if (!timeout && trailing) {
      timeout = setTimeout(() => {
        previous = leading ? Date.now() : 0;
        timeout = null;
        func.apply(this, args);
      }, remaining);
    }
  };
}

/**
 * 带缓存的防抖函数
 * 缓存最后一次调用的结果
 */
export function debounceWithCache<T extends (...args: any[]) => Promise<any>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeout: NodeJS.Timeout | null = null;
  let cachedPromise: Promise<ReturnType<T>> | null = null;

  return function (this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
    if (timeout) {
      clearTimeout(timeout);
    }

    if (!cachedPromise) {
      cachedPromise = func.apply(this, args);
    }

    timeout = setTimeout(() => {
      timeout = null;
      cachedPromise = null;
    }, wait);

    return cachedPromise;
  };
}

/**
 * 带缓存的节流函数
 * 缓存最后一次成功的结果
 */
export function throttleWithCache<T extends (...args: any[]) => Promise<any>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let lastResult: Promise<ReturnType<T>> | null = null;
  let lastCallTime = 0;

  return function (this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
    const now = Date.now();

    if (now - lastCallTime >= wait) {
      lastCallTime = now;
      lastResult = func.apply(this, args);
    }

    return lastResult!;
  };
}

/**
 * 请求队列管理器
 * 控制并发请求数量
 */
export class RequestQueue {
  private queue: Array<{
    execute: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = [];
  private running = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent: number = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * 添加请求到队列
   */
  async add<T>(execute: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ execute, resolve, reject });
      this.process();
    });
  }

  /**
   * 处理队列
   */
  private async process(): Promise<void> {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.running++;

    try {
      const result = await item.execute();
      item.resolve(result);
    } catch (error) {
      item.reject(error);
    } finally {
      this.running--;
      this.process();
    }
  }

  /**
   * 获取队列状态
   */
  getStatus(): { queueLength: number; running: number } {
    return {
      queueLength: this.queue.length,
      running: this.running,
    };
  }

  /**
   * 清空队列
   */
  clear(): void {
    // 拒绝所有等待的请求
    for (const item of this.queue) {
      item.reject(new Error('Queue cleared'));
    }
    this.queue = [];
  }
}

// 全局请求队列
let globalQueue: RequestQueue | null = null;

/**
 * 获取全局请求队列
 */
export function getRequestQueue(maxConcurrent: number = 5): RequestQueue {
  if (!globalQueue) {
    globalQueue = new RequestQueue(maxConcurrent);
  }
  return globalQueue;
}

/**
 * 重置全局请求队列
 */
export function resetRequestQueue(): void {
  if (globalQueue) {
    globalQueue.clear();
    globalQueue = null;
  }
}

// 导出默认实例
export const requestQueue = getRequestQueue();
