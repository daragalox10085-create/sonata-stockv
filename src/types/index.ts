/**
 * Sonata Types - 统一导出
 * 版本：v2.0
 */

export type {
  DataSource,
  DataVerification,
  StockQuote,
  SectorData,
  MonteCarloResult,
  StockRecommendation,
  KLinePoint,
  ApiLog,
  ApiConfig,
  StockSearchResult,
  StockData
} from './DataContract';

export {
  DataIntegrityError,
  verifyRealData
} from './DataContract';
