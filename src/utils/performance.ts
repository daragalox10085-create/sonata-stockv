/**
 * 性能监控工具
 * 用于分析和优化关键路径性能
 */

// 性能指标
export interface PerformanceMetrics {
  // 时间指标（毫秒）
  timing: {
    startTime: number;
    endTime: number;
    duration: number;
  };
  // 内存指标（字节）
  memory?: {
    used: number;
    total: number;
  };
  // 请求指标
  requests?: {
    count: number;
    successCount: number;
    failureCount: number;
    totalBytes: number;
  };
  // 自定义指标
  custom?: Record<string, number>;
}

// 性能报告
export interface PerformanceReport {
  name: string;
  metrics: PerformanceMetrics;
  timestamp: string;
  metadata?: Record<string, any>;
}

// 性能监控器
class PerformanceMonitor {
  private reports: PerformanceReport[] = [];
  private maxReports: number = 100;
  private activeTimers: Map<string, number> = new Map();

  /**
   * 开始计时
   */
  startTimer(name: string): void {
    this.activeTimers.set(name, performance.now());
  }

  /**
   * 结束计时
   */
  endTimer(name: string, metadata?: Record<string, any>): PerformanceMetrics | null {
    const startTime = this.activeTimers.get(name);
    if (!startTime) return null;

    const endTime = performance.now();
    const duration = endTime - startTime;

    this.activeTimers.delete(name);

    const metrics: PerformanceMetrics = {
      timing: {
        startTime,
        endTime,
        duration,
      },
    };

    // 添加内存指标（如果可用）
    if (performance.memory) {
      metrics.memory = {
        used: (performance.memory as any).usedJSHeapSize,
        total: (performance.memory as any).totalJSHeapSize,
      };
    }

    const report: PerformanceReport = {
      name,
      metrics,
      timestamp: new Date().toISOString(),
      metadata,
    };

    this.addReport(report);

    return metrics;
  }

  /**
   * 记录性能报告
   */
  addReport(report: PerformanceReport): void {
    this.reports.push(report);

    // 限制报告数量
    if (this.reports.length > this.maxReports) {
      this.reports.shift();
    }
  }

  /**
   * 获取所有报告
   */
  getReports(): PerformanceReport[] {
    return [...this.reports];
  }

  /**
   * 获取指定名称的报告
   */
  getReportsByName(name: string): PerformanceReport[] {
    return this.reports.filter(r => r.name === name);
  }

  /**
   * 获取平均性能指标
   */
  getAverageMetrics(name: string): PerformanceMetrics | null {
    const reports = this.getReportsByName(name);
    if (reports.length === 0) return null;

    const totalDuration = reports.reduce((sum, r) => sum + r.metrics.timing.duration, 0);
    const avgDuration = totalDuration / reports.length;

    return {
      timing: {
        startTime: 0,
        endTime: 0,
        duration: avgDuration,
      },
    };
  }

  /**
   * 获取性能摘要
   */
  getSummary(): {
    totalReports: number;
    slowestOperations: { name: string; avgDuration: number }[];
    fastestOperations: { name: string; avgDuration: number }[];
  } {
    const nameMap = new Map<string, number[]>();

    for (const report of this.reports) {
      const durations = nameMap.get(report.name) || [];
      durations.push(report.metrics.timing.duration);
      nameMap.set(report.name, durations);
    }

    const averages = Array.from(nameMap.entries()).map(([name, durations]) => ({
      name,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
    }));

    const sorted = averages.sort((a, b) => a.avgDuration - b.avgDuration);

    return {
      totalReports: this.reports.length,
      slowestOperations: sorted.slice(-5).reverse(),
      fastestOperations: sorted.slice(0, 5),
    };
  }

  /**
   * 清空报告
   */
  clear(): void {
    this.reports = [];
    this.activeTimers.clear();
  }

  /**
   * 设置最大报告数
   */
  setMaxReports(max: number): void {
    this.maxReports = max;
    while (this.reports.length > max) {
      this.reports.shift();
    }
  }
}

// 单例实例
const performanceMonitor = new PerformanceMonitor();

/**
 * 性能装饰器
 * 用于自动监控函数性能
 */
export function measurePerformance(
  name?: string,
  metadata?: Record<string, any>
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const metricName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      performanceMonitor.startTimer(metricName);
      
      try {
        const result = await originalMethod.apply(this, args);
        performanceMonitor.endTimer(metricName, { success: true, ...metadata });
        return result;
      } catch (error) {
        performanceMonitor.endTimer(metricName, { success: false, error, ...metadata });
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * 高阶函数：包装函数以监控性能
 */
export function withPerformanceTracking<T extends (...args: any[]) => any>(
  fn: T,
  name: string,
  metadata?: Record<string, any>
): (...args: Parameters<T>) => ReturnType<T> {
  return function (...args: Parameters<T>): ReturnType<T> {
    performanceMonitor.startTimer(name);
    
    try {
      const result = fn(...args);
      
      // 处理异步函数
      if (result instanceof Promise) {
        return result
          .then((value) => {
            performanceMonitor.endTimer(name, { success: true, ...metadata });
            return value;
          })
          .catch((error) => {
            performanceMonitor.endTimer(name, { success: false, error, ...metadata });
            throw error;
          }) as ReturnType<T>;
      }
      
      performanceMonitor.endTimer(name, { success: true, ...metadata });
      return result;
    } catch (error) {
      performanceMonitor.endTimer(name, { success: false, error, ...metadata });
      throw error;
    }
  } as T;
}

/**
 * 分析慢查询
 */
export function analyzeSlowQueries(threshold: number = 1000): PerformanceReport[] {
  return performanceMonitor
    .getReports()
    .filter(r => r.metrics.timing.duration > threshold);
}

/**
 * 导出性能报告为JSON
 */
export function exportPerformanceReport(): string {
  const summary = performanceMonitor.getSummary();
  const slowQueries = analyzeSlowQueries();

  return JSON.stringify({
    summary,
    slowQueries,
    allReports: performanceMonitor.getReports(),
    generatedAt: new Date().toISOString(),
  }, null, 2);
}

// 导出单例
export { performanceMonitor };

// 默认导出
export default performanceMonitor;
