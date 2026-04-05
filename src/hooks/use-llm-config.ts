import { useState, useEffect } from 'react';

/**
 * LLM 配置管理 Hook
 * 只返回全局配置，个人配置功能已移除
 */
export function useLLMConfig() {
  const [config, setConfig] = useState<any>(null);
  const [source, setSource] = useState<'none' | 'global'>('none');
  const [sourceName, setSourceName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      // 获取全局配置
      const response = await fetch('/api/config/llm');
      const data = await response.json();

      if (data.success && data.config) {
        setConfig(data.config);
        setSource(data.source);
        setSourceName(data.sourceName || data.config?.name || '');
      } else {
        setConfig(null);
        setSource('none');
        setSourceName('');
        setError(data.message || '未配置');
      }
    } catch (err) {
      console.error('加载 LLM 配置失败:', err);
      setConfig(null);
      setSource('none');
      setSourceName('');
      setError(err instanceof Error ? err.message : '加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  return {
    config,
    source,
    sourceName,
    loading,
    error,
    hasConfig: !!config,
    isGlobalConfig: source === 'global',
    refresh: loadConfig
  };
}
