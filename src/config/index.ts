/**
 * 主配置入口文件
 * 集中管理所有配置，支持多环境切换
 */

import { apiConfig, ApiConfig } from './api.config';
import { appConfig, AppConfig } from './app.config';

// 环境类型
export type Environment = 'development' | 'production' | 'test';

// 当前环境
export const ENV: Environment = (import.meta.env.VITE_APP_ENV as Environment) || 'development';

// 是否开发环境
export const IS_DEV = ENV === 'development';

// 是否生产环境
export const IS_PROD = ENV === 'production';

// 是否测试环境
export const IS_TEST = ENV === 'test';

// 统一配置对象
export interface Config {
  env: Environment;
  api: ApiConfig;
  app: AppConfig;
}

// 导出完整配置
export const config: Config = {
  env: ENV,
  api: apiConfig,
  app: appConfig,
};

// 默认导出
export default config;

// 重新导出子配置
export { apiConfig, ApiConfig } from './api.config';
export { appConfig, AppConfig } from './app.config';
