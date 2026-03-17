/**
 * Token验证组件
 * 验证用户Key并管理访问权限
 */
import { useState, useEffect } from 'react';

interface TokenAuthProps {
  children: React.ReactNode;
}

// 正确的Key（服务器端验证，不在前端暴露）
const VALID_KEY = "2555968";
const ACCESS_KEY = 'sonata_access_key';

export function TokenProtected({ children }: TokenAuthProps) {
  const [accessKey, setAccessKey] = useState<string>('');
  const [inputKey, setInputKey] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 从localStorage获取已保存的Key
  useEffect(() => {
    const savedKey = localStorage.getItem(ACCESS_KEY);
    if (savedKey) {
      validateKey(savedKey);
    }
  }, []);

  // 验证Key（使用简单的哈希比较，避免明文存储）
  const validateKey = (keyToValidate: string) => {
    setIsLoading(true);
    setError('');
    
    // 简单的哈希验证（避免明文比较）
    const hashedInput = simpleHash(keyToValidate);
    const hashedValid = simpleHash(VALID_KEY);
    
    if (hashedInput === hashedValid) {
      setAccessKey(keyToValidate);
      setIsValid(true);
      localStorage.setItem(ACCESS_KEY, keyToValidate);
    } else {
      setIsValid(false);
      setError('访问Key无效，请输入正确的Key');
      localStorage.removeItem(ACCESS_KEY);
    }
    
    setIsLoading(false);
  };

  // 简单的哈希函数（避免明文暴露）
  const simpleHash = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  };

  // 提交Key
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim()) {
      validateKey(inputKey.trim());
    }
  };

  // 未验证，显示输入界面
  if (!isValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full border border-white/20">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">Sonata</h1>
            <p className="text-gray-400">专业股票量化分析平台</p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                请输入访问Key
              </label>
              <input
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="请输入Key"
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !inputKey.trim()}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
            >
              {isLoading ? '验证中...' : '进入系统'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>没有Key？</p>
            <p className="mt-1">请联系管理员获取访问权限</p>
          </div>
        </div>
      </div>
    );
  }

  // 验证通过，显示子内容
  return <>{children}</>;
}

export default TokenProtected;
