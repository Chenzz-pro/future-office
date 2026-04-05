import { useState, useEffect } from 'react';

interface LLMConfig {
  id: string;
  name: string;
  provider: 'openai' | 'claude' | 'deepseek' | 'doubao' | 'custom';
  apiKey: string;
  baseUrl?: string;
  isActive: boolean;
}

interface ConfigResponse {
  success: boolean;
  useGlobal: boolean;
  config: LLMConfig | null;
  source?: 'user' | 'global';
  message?: string;
}

export function useLLMConfig(userId?: string) {
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [source, setSource] = useState<'user' | 'global' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. 先尝试从 localStorage 获取用户配置
      const localKeys = localStorage.getItem('ai-api-keys');
      if (localKeys) {
        try {
          const keys = JSON.parse(localKeys);
          const activeKey = keys.find((k: LLMConfig) => k.isActive);
          if (activeKey) {
            setConfig(activeKey);
            setSource('user');
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('解析本地配置失败:', err);
        }
      }

      // 2. 从后端获取配置（用户配置 > 全局配置）
      const url = userId ? `/api/config/llm?userId=${userId}` : '/api/config/llm';
      const res = await fetch(url);
      const data: ConfigResponse = await res.json();

      if (data.success && data.config) {
        setConfig(data.config);
        setSource(data.source || 'global');
      } else {
        setConfig(null);
        setSource(null);
      }
    } catch (err) {
      console.error('获取 LLM 配置失败:', err);
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [userId]);

  return {
    config,
    source,
    loading,
    error,
    refetch: fetchConfig,
  };
}
