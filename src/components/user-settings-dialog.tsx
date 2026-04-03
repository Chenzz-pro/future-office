'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Check,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApiKey {
  id: string;
  name: string;
  provider: 'openai' | 'claude' | 'deepseek' | 'doubao' | 'custom';
  apiKey: string;
  baseUrl?: string;
  isActive: boolean;
}

interface ProviderConfig {
  name: string;
  nameEn: string;
  defaultBaseUrl: string;
  models: string[];
  helpUrl?: string;
}

const providerConfig: Record<string, ProviderConfig> = {
  doubao: {
    name: '豆包 (火山引擎)',
    nameEn: 'Doubao',
    defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    models: [
      'doubao-seed-2-0-pro-260215',
      'doubao-seed-2-0-lite-260215',
      'doubao-seed-2-0-mini-260215',
      'doubao-seed-1-8-251228',
      'doubao-seed-1-6-251015',
      'doubao-seed-1-6-lite-251015',
      'doubao-seed-1-6-flash-250615',
      'doubao-seed-1-6-thinking-250715',
    ],
    helpUrl: 'https://www.volcengine.com/product/doubao',
  },
  openai: {
    name: 'OpenAI',
    nameEn: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
    helpUrl: 'https://platform.openai.com/api-keys',
  },
  claude: {
    name: 'Claude (Anthropic)',
    nameEn: 'Claude',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-5-sonnet', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    helpUrl: 'https://console.anthropic.com/settings/keys',
  },
  deepseek: {
    name: 'DeepSeek',
    nameEn: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-coder'],
    helpUrl: 'https://platform.deepseek.com/api_keys',
  },
  custom: {
    name: '自定义 API',
    nameEn: 'Custom',
    defaultBaseUrl: '',
    models: [],
    helpUrl: '',
  },
};

interface UserSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onKeysChange: (keys: ApiKey[]) => void;
}

export function UserSettingsDialog({ open, onClose, onKeysChange }: UserSettingsDialogProps) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState<Partial<ApiKey>>({
    provider: 'doubao',
    name: '',
    apiKey: '',
    baseUrl: '',
    isActive: true,
  });
  const [showKeyMap, setShowKeyMap] = useState<Record<string, boolean>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 从 localStorage 加载
  useEffect(() => {
    if (open) {
      const savedKeys = localStorage.getItem('ai-api-keys');
      if (savedKeys) {
        try {
          setApiKeys(JSON.parse(savedKeys));
        } catch {
          setApiKeys([]);
        }
      }
    }
  }, [open]);

  // 保存到 localStorage
  const saveKeys = (keys: ApiKey[]) => {
    localStorage.setItem('ai-api-keys', JSON.stringify(keys));
    setApiKeys(keys);
    onKeysChange(keys);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const addKey = () => {
    if (!newKey.apiKey || !newKey.name) return;

    const config = providerConfig[newKey.provider || 'doubao'];
    const key: ApiKey = {
      id: Date.now().toString(),
      name: newKey.name,
      provider: newKey.provider || 'doubao',
      apiKey: newKey.apiKey,
      baseUrl: newKey.baseUrl || config.defaultBaseUrl,
      isActive: true,
    };

    const updatedKeys = [...apiKeys, key];
    saveKeys(updatedKeys);
    setNewKey({
      provider: 'doubao',
      name: '',
      apiKey: '',
      baseUrl: '',
      isActive: true,
    });
    setShowAddForm(false);
  };

  const deleteKey = (id: string) => {
    const updatedKeys = apiKeys.filter(k => k.id !== id);
    saveKeys(updatedKeys);
  };

  const toggleKey = (id: string) => {
    const updatedKeys = apiKeys.map(k =>
      k.id === id ? { ...k, isActive: !k.isActive } : k
    );
    saveKeys(updatedKeys);
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return '****';
    return key.slice(0, 4) + '****' + key.slice(-4);
  };

  const currentConfig = providerConfig[newKey.provider || 'doubao'];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 对话框 */}
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-foreground">设置</h2>
            <p className="text-sm text-muted-foreground">管理您的 AI 服务 API 密钥</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4 overflow-y-auto flex-1">
          {/* 提示 */}
          <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-500 mt-0.5 shrink-0" />
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                API 密钥仅存储在本地浏览器中，不会上传到服务器。请妥善保管您的密钥。
              </p>
            </div>
          </div>

          {/* 已添加的密钥列表 */}
          {apiKeys.length > 0 && (
            <div className="space-y-3 mb-4">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className={cn(
                    'border rounded-lg p-3 transition-colors',
                    key.isActive ? 'border-primary/50 bg-primary/5' : 'border-border'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium',
                        key.isActive ? 'bg-primary/10 text-primary' : 'bg-accent text-muted-foreground'
                      )}>
                        {providerConfig[key.provider]?.nameEn?.slice(0, 2) || '自定义'}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-foreground">{key.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {providerConfig[key.provider]?.name || '自定义'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleKey(key.id)}
                        className={cn(
                          'px-2 py-1 rounded text-xs transition-colors',
                          key.isActive
                            ? 'bg-primary/10 text-primary'
                            : 'bg-accent text-muted-foreground'
                        )}
                      >
                        {key.isActive ? '已启用' : '已禁用'}
                      </button>
                      <button
                        onClick={() => deleteKey(key.id)}
                        className="p-1.5 hover:bg-accent rounded text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-background px-2 py-1 rounded font-mono">
                      {showKeyMap[key.id] ? key.apiKey : maskApiKey(key.apiKey)}
                    </code>
                    <button
                      onClick={() => setShowKeyMap({ ...showKeyMap, [key.id]: !showKeyMap[key.id] })}
                      className="p-1.5 hover:bg-accent rounded transition-colors"
                    >
                      {showKeyMap[key.id] ? (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {key.baseUrl}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* 添加新密钥表单 */}
          {showAddForm ? (
            <div className="border border-border rounded-lg p-4 space-y-4">
              <h3 className="text-sm font-medium text-foreground">添加新密钥</h3>
              
              <div>
                <label className="block text-xs text-muted-foreground mb-1">服务提供商</label>
                <select
                  value={newKey.provider}
                  onChange={(e) => {
                    const provider = e.target.value as ApiKey['provider'];
                    const config = providerConfig[provider];
                    setNewKey({ 
                      ...newKey, 
                      provider,
                      baseUrl: config.defaultBaseUrl,
                    });
                  }}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {Object.entries(providerConfig).map(([key, config]) => (
                    <option key={key} value={key}>{config.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">名称</label>
                <input
                  type="text"
                  value={newKey.name}
                  onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                  placeholder="例如：我的豆包 API"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  API Key {newKey.provider === 'doubao' && <span className="text-orange-500">*</span>}
                </label>
                <input
                  type="password"
                  value={newKey.apiKey}
                  onChange={(e) => setNewKey({ ...newKey, apiKey: e.target.value })}
                  placeholder={newKey.provider === 'doubao' ? '请输入豆包 API Key' : 'sk-...'}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {newKey.provider === 'doubao' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    请从火山引擎控制台获取 API Key：
                    <a 
                      href="https://console.volcengine.com/iam/keymanage/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline ml-1 inline-flex items-center gap-1"
                    >
                      获取 Key <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Base URL <span className="text-muted-foreground/50">(通常不需要修改)</span>
                </label>
                <input
                  type="text"
                  value={newKey.baseUrl}
                  onChange={(e) => setNewKey({ ...newKey, baseUrl: e.target.value })}
                  placeholder={currentConfig.defaultBaseUrl}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                />
                {newKey.provider === 'doubao' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    默认使用北京区域 endpoint，如需其他区域请参考：
                    <a 
                      href="https://www.volcengine.com/docs/82379/1263482" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline ml-1"
                    >
                      区域说明
                    </a>
                  </p>
                )}
              </div>

              {/* 模型选择提示 */}
              {currentConfig.models.length > 0 && (
                <div className="bg-accent/50 rounded-lg p-3">
                  <h4 className="text-xs font-medium text-foreground mb-2">可用模型</h4>
                  <div className="flex flex-wrap gap-1">
                    {currentConfig.models.slice(0, 6).map((model) => (
                      <span key={model} className="text-xs px-2 py-0.5 bg-background rounded">
                        {model}
                      </span>
                    ))}
                    {currentConfig.models.length > 6 && (
                      <span className="text-xs text-muted-foreground">+{currentConfig.models.length - 6} 更多</span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={addKey}
                  disabled={!newKey.apiKey || !newKey.name}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  添加
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加 API 密钥
            </button>
          )}

          {/* 快速配置指南 */}
          {apiKeys.length === 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="text-sm font-medium text-foreground">快速配置指南</h3>
              
              <div className="space-y-3">
                <div className="border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">豆</div>
                    <h4 className="text-sm font-medium">豆包 (推荐)</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    火山引擎方舟大模型，支持 32K/128K 上下文，价格优惠
                  </p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>访问 <a href="https://console.volcengine.com/ark" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">火山引擎控制台</a></li>
                    <li>开通方舟大模型服务</li>
                    <li>创建 API Key</li>
                    <li>复制 Key 并粘贴到此处</li>
                  </ol>
                </div>

                <div className="border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">OP</div>
                    <h4 className="text-sm font-medium">OpenAI</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    访问 <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenAI Platform</a> 获取 API Key
                  </p>
                </div>

                <div className="border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">DS</div>
                    <h4 className="text-sm font-medium">DeepSeek</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    访问 <a href="https://platform.deepseek.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">DeepSeek Platform</a> 获取 API Key
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-between p-4 border-t border-border shrink-0">
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <div className="flex items-center gap-1 text-sm text-green-600">
                <Check className="w-4 h-4" />
                已保存
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
