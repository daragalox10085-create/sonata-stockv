/**
 * 依赖注入容器
 * 实现服务定位器和依赖注入模式
 */

import { DataFetcher } from '../services/data-fetchers/types';
import { DataProcessor } from '../services/data-processors/types';
import { DataCache } from '../services/cache/CacheManager';

// 服务令牌
export type ServiceToken = 
  | 'cacheManager'
  | 'requestDeduplicator'
  | 'tencentFetcher'
  | 'eastmoneyFetcher'
  | 'sinaFetcher'
  | 'stockProcessor'
  | 'klineProcessor'
  | 'sectorProcessor'
  | string;

// 服务工厂
export type ServiceFactory<T> = () => T;

// 服务注册
interface ServiceRegistration<T> {
  token: ServiceToken;
  factory: ServiceFactory<T>;
  singleton: boolean;
  instance?: T;
}

/**
 * 依赖注入容器
 */
export class DIContainer {
  private services: Map<ServiceToken, ServiceRegistration<any>> = new Map();
  private static instance: DIContainer;

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  /**
   * 注册服务
   */
  register<T>(
    token: ServiceToken,
    factory: ServiceFactory<T>,
    options: { singleton?: boolean } = {}
  ): this {
    this.services.set(token, {
      token,
      factory,
      singleton: options.singleton ?? true,
    });
    return this;
  }

  /**
   * 注册单例服务
   */
  registerSingleton<T>(token: ServiceToken, factory: ServiceFactory<T>): this {
    return this.register(token, factory, { singleton: true });
  }

  /**
   * 注册瞬态服务
   */
  registerTransient<T>(token: ServiceToken, factory: ServiceFactory<T>): this {
    return this.register(token, factory, { singleton: false });
  }

  /**
   * 获取服务
   */
  resolve<T>(token: ServiceToken): T {
    const registration = this.services.get(token);
    
    if (!registration) {
      throw new Error(`Service not registered: ${token}`);
    }

    // 单例模式：返回缓存的实例
    if (registration.singleton) {
      if (!registration.instance) {
        registration.instance = registration.factory();
      }
      return registration.instance as T;
    }

    // 瞬态模式：每次创建新实例
    return registration.factory() as T;
  }

  /**
   * 获取服务（可选）
   */
  tryResolve<T>(token: ServiceToken): T | null {
    try {
      return this.resolve<T>(token);
    } catch {
      return null;
    }
  }

  /**
   * 检查服务是否已注册
   */
  has(token: ServiceToken): boolean {
    return this.services.has(token);
  }

  /**
   * 注销服务
   */
  unregister(token: ServiceToken): boolean {
    return this.services.delete(token);
  }

  /**
   * 清空所有服务
   */
  clear(): void {
    this.services.clear();
  }

  /**
   * 获取所有已注册的服务令牌
   */
  getRegisteredTokens(): ServiceToken[] {
    return Array.from(this.services.keys());
  }

  /**
   * 创建服务作用域
   */
  createScope(): DIScope {
    return new DIScope(this);
  }
}

/**
 * 服务作用域
 * 用于管理作用域内的服务生命周期
 */
export class DIScope {
  private container: DIContainer;
  private scopedInstances: Map<ServiceToken, any> = new Map();

  constructor(container: DIContainer) {
    this.container = container;
  }

  /**
   * 获取服务
   */
  resolve<T>(token: ServiceToken): T {
    // 检查作用域内是否有实例
    if (this.scopedInstances.has(token)) {
      return this.scopedInstances.get(token) as T;
    }

    // 从容器获取
    const instance = this.container.resolve<T>(token);
    this.scopedInstances.set(token, instance);
    return instance;
  }

  /**
   * 释放作用域
   */
  dispose(): void {
    this.scopedInstances.clear();
  }
}

// 装饰器：注入依赖
export function Inject(token: ServiceToken) {
  return function (target: any, propertyKey: string) {
    Object.defineProperty(target, propertyKey, {
      get: function () {
        return container.resolve(token);
      },
      enumerable: true,
      configurable: true,
    });
  };
}

// 装饰器：可注入类
export function Injectable() {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    // 可以在这里添加元数据
    return constructor;
  };
}

// 全局容器实例
export const container = DIContainer.getInstance();

// 默认导出
export default container;
