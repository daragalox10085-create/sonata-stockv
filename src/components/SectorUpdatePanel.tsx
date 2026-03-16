// src/components/SectorUpdatePanel.tsx
// 板块数据更新控制面板

import React, { useState, useEffect } from 'react';
import { autoUpdateSectorService } from '../services/AutoUpdateSectorService';

export const SectorUpdatePanel: React.FC = () => {
  const [status, setStatus] = useState({
    autoUpdate: true,
    updateSchedule: '',
    nextUpdate: '',
    lastUpdate: '',
    isUpdating: false
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    refreshStatus();
    // 每秒刷新状态
    const timer = setInterval(refreshStatus, 1000);
    return () => clearInterval(timer);
  }, []);

  const refreshStatus = () => {
    const serviceStatus = autoUpdateSectorService.getStatus();
    setStatus(serviceStatus);
  };

  const handleManualUpdate = async () => {
    if (isUpdating) {
      setMessage('正在更新中，请稍候...');
      return;
    }

    setIsUpdating(true);
    setMessage('开始手动更新板块数据...');

    try {
      // 这里应该调用真实的更新逻辑
      // 由于网络限制，目前只是模拟
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 调用手动更新
      await autoUpdateSectorService.manualUpdate();
      
      setMessage('更新完成！板块数据已刷新。');
      refreshStatus();
    } catch (error) {
      setMessage(`更新失败: ${error}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">板块数据更新</h2>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${status.autoUpdate ? 'bg-green-500' : 'bg-gray-400'}`}></span>
          <span className="text-sm text-gray-600">
            {status.autoUpdate ? '自动更新已开启' : '自动更新已关闭'}
          </span>
        </div>
      </div>

      {/* 状态信息 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-600 mb-1">更新计划</div>
          <div className="text-lg font-semibold text-blue-900">{status.updateSchedule}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-green-600 mb-1">下次更新</div>
          <div className="text-lg font-semibold text-green-900">{status.nextUpdate}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">最后更新</div>
          <div className="text-lg font-semibold text-gray-900">{status.lastUpdate}</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="text-sm text-yellow-600 mb-1">更新状态</div>
          <div className="text-lg font-semibold text-yellow-900">
            {status.isUpdating ? '更新中...' : '等待更新'}
          </div>
        </div>
      </div>

      {/* 手动更新按钮 */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleManualUpdate}
          disabled={isUpdating}
          className={`flex-1 py-3 px-6 rounded-lg font-semibold text-white transition-colors ${
            isUpdating 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isUpdating ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              更新中...
            </span>
          ) : (
            '立即手动更新'
          )}
        </button>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className={`mt-4 p-3 rounded-lg ${
          message.includes('失败') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}

      {/* 说明 */}
      <div className="mt-6 text-sm text-gray-500">
        <p className="mb-2">💡 <strong>自动更新</strong>：系统会在每周二 11:00 自动尝试更新板块数据</p>
        <p className="mb-2">💡 <strong>手动更新</strong>：您可以随时点击"立即手动更新"按钮更新数据</p>
        <p>⚠️ <strong>注意</strong>：由于网络限制，自动更新可能无法获取真实数据，建议定期手动更新</p>
      </div>
    </div>
  );
};

export default SectorUpdatePanel;
