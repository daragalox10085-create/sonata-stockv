/**
 * 应用配置管理
 * 集中管理应用级别的配置参数
 */

import { ENV, IS_DEV, IS_PROD } from './index';

// 股票分析配置
export interface StockAnalysisConfig {
  // 热门板块配置
  hotSectors: {
    topN: number;
    minHeatScore: number;
    minCapitalInflow: number;
    updateInterval: number; // 秒
  };
  
  // 六因子模型权重
  sixFactorWeights: {
    valuation: number;
    growth: number;
    profitability: number;
    quality: number;
    momentum: number;
    technical: number;
  };
  
  // 技术面配置
  technical: {
    supportLevelThreshold: number;
    lowPositionThreshold: number;
    rsiOversold: number;
    rsiOverbought: number;
    volumeMultiplier: number;
  };
  
  // 筛选阈值
  screeningThresholds: {
    minCompositeScore: number;
    minUpsidePotential: number;
    maxDrawdownRisk: number;
  };
}

// UI配置
export interface UIConfig {
  theme: 'light' | 'dark' | 'auto';
  animations: {
    enabled: boolean;
    duration: number;
    easing: string;
  };
  charts: {
    defaultTimeframe: '60' | '240' | '101';
    colors: {
      up: string;
      down: string;
      neutral: string;
    };
  };
}

// 功能开关配置
export interface FeatureConfig {
  // 实时数据
  realTimeData: boolean;
  // 自动更新
  autoUpdate: boolean;
  // 数据持久化
  dataPersistence: boolean;
  // 分析缓存
  analysisCache: boolean;
  // 错误报告
  errorReporting: boolean;
}

// 应用配置主接口
export interface AppConfig {
  // 应用信息
  app: {
    name: string;
    version: string;
    buildTime: string;
  };
  
  // 股票分析配置
  stockAnalysis: StockAnalysisConfig;
  
  // UI配置
  ui: UIConfig;
  
  // 功能开关
  features: FeatureConfig;
  
  // 性能配置
  performance: {
    debounceDelay: number;
    throttleDelay: number;
    maxConcurrentRequests: number;
    requestTimeout: number;
  };
  
  // 存储配置
  storage: {
    prefix: string;
    version: string;
    maxAge: number; // 毫秒
  };
}

// 基础配置
const baseConfig: Omit<AppConfig, 'app'> = {
  stockAnalysis: {
    hotSectors: {
      topN: 6,
      minHeatScore: 60,
      minCapitalInflow: 100000000, // 1亿
      updateInterval: 300, // 5分钟
    },
    sixFactorWeights: {
      valuation: 0.20,
      growth: 0.20,
      profitability: 0.15,
      quality: 0.15,
      momentum: 0.15,
      technical: 0.15,
    },
    technical: {
      supportLevelThreshold: 0.05,
      lowPositionThreshold: 0.30,
      rsiOversold: 30,
      rsiOverbought: 70,
      volumeMultiplier: 1.5,
    },
    screeningThresholds: {
      minCompositeScore: 50,
      minUpsidePotential: 0.10,
      maxDrawdownRisk: 0.15,
    },
  },
  
  ui: {
    theme: 'auto',
    animations: {
      enabled: true,
      duration: 300,
      easing: 'ease-in-out',
    },
    charts: {
      defaultTimeframe: '101',
      colors: {
        up: '#10b981',
        down: '#ef4444',
        neutral: '#6b7280',
      },
    },
  },
  
  features: {
    realTimeData: true,
    autoUpdate: IS_PROD,
    dataPersistence: true,
    analysisCache: true,
    errorReporting: IS_PROD,
  },
  
  performance: {
    debounceDelay: 300,
    throttleDelay: 100,
    maxConcurrentRequests: 5,
    requestTimeout: 10000,
  },
  
  storage: {
    prefix: 'sonata_',
    version: '2.5.0',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
  },
};

// 环境特定配置
const envConfigs: Record<string, Partial<AppConfig>> = {
  development: {
    features: {
      realTimeData: true,
      autoUpdate: false,
      dataPersistence: false,
      analysisCache: false,
      errorReporting: false,
    },
    performance: {
      debounceDelay: 100,
      throttleDelay: 50,
      maxConcurrentRequests: 10,
      requestTimeout: 30000,
    },
  },
  production: {
    features: {
      realTimeData: true,
      autoUpdate: true,
      dataPersistence: true,
      analysisCache: true,
      errorReporting: true,
    },
    performance: {
      debounceDelay: 300,
      throttleDelay: 150,
      maxConcurrentRequests: 3,
      requestTimeout: 10000,
    },
  },
  test: {
    features: {
      realTimeData: false,
      autoUpdate: false,
      dataPersistence: false,
      analysisCache: false,
      errorReporting: false,
    },
    performance: {
      debounceDelay: 0,
      throttleDelay: 0,
      maxConcurrentRequests: 20,
      requestTimeout: 5000,
    },
  },
};

// 合并配置
export const appConfig: AppConfig = {
  app: {
    name: 'Sonata Stock Analysis',
    version: '2.5.0',
    buildTime: new Date().toISOString(),
  },
  ...baseConfig,
  ...envConfigs[ENV],
};

// 导出默认配置
export default appConfig;
