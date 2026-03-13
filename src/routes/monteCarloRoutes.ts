/**
 * 蒙特卡洛分析API路由
 * 版本: v3.0
 */

import express from 'express';
import { monteCarloAnalyzer } from '../services/MonteCarloService';

const router = express.Router();

// 获取单只股票蒙特卡洛分析
router.get('/:stockCode', async (req, res) => {
  try {
    const { stockCode } = req.params;
    const result = await monteCarloAnalyzer.analyzeStock(stockCode);
    
    res.json({
      success: true,
      data: result,
      message: '分析完成'
    });
  } catch (error) {
    console.error('分析失败:', error);
    res.status(500).json({
      success: false,
      message: '分析失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// 批量分析
router.post('/batch', async (req, res) => {
  try {
    const { stockCodes } = req.body;
    
    if (!stockCodes || !Array.isArray(stockCodes)) {
      return res.status(400).json({
        success: false,
        message: '参数错误'
      });
    }
    
    const results = await Promise.all(
      stockCodes.map(code => monteCarloAnalyzer.analyzeStock(code))
    );
    
    res.json({
      success: true,
      data: results,
      message: `批量分析完成，共${stockCodes.length}只股票`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '批量分析失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router;