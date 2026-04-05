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
  ExternalLink,
  Settings,
  Loader2,
  Plug,
  RefreshCw,
  Wifi,
  WifiOff,
  Link
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

// EKP 配置接口
interface EKPConfig {
  baseUrl: string;
  username: string;
  password: string;
  apiPath: string;      // REST 服务路径
  serviceId: string;    // 服务标识
  leaveTemplateId: string;
  expenseTemplateId: string;
  enabled: boolean;
}

// REST服务路径选项
const EKP_REST_OPTIONS = [
  { label: '流程管理 (/api/km-review/)', value: '/api/km-review/', desc: '请假、报销等审批流程' },
  { label: '日程管理 (/api/km-calendar/)', value: '/api/km-calendar/', desc: '日程创建和查询' },
  { label: '知识库 (/api/kms-doc/)', value: '/api/kms-doc/', desc: '文档和知识库管理' },
  { label: '通用WebService (/sys/webservice/rest)', value: '/sys/webservice/rest', desc: '蓝凌标准REST服务' },
];

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
  const [activeTab, setActiveTab] = useState<'llm' | 'ekp'>('llm'); // 页签状态
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

        {/* 页签切换 */}
        <div className="px-4 pt-4">
          <div className="flex gap-2 border-b border-border">
            <button
              onClick={() => setActiveTab('llm')}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-colors -mb-px",
                activeTab === 'llm'
                  ? "border-b-2 border-primary text-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Plug className="w-4 h-4" />
              大模型配置
            </button>
            <button
              onClick={() => setActiveTab('ekp')}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-colors -mb-px",
                activeTab === 'ekp'
                  ? "border-b-2 border-primary text-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              蓝凌OA配置
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="p-4 overflow-y-auto flex-1">
          {/* 大模型配置内容 */}
          {activeTab === 'llm' && (
            <>
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
            </>
          )}

          {/* 蓝凌OA配置内容 */}
          {activeTab === 'ekp' && (
            <EKPOConfigPanel />
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

// ============================================
// 蓝凌OA 配置面板组件（内联在设置对话框中）
// ============================================

function EKPOConfigPanel() {
  const [config, setConfig] = useState<EKPConfig>({
    baseUrl: '',
    username: '',
    password: '',
    apiPath: '',  // 不再需要用户填写，使用内置路径
    serviceId: '',  // 不再需要用户填写
    leaveTemplateId: '',
    expenseTemplateId: '',
    enabled: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'failed' | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 加载保存的配置
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedConfig = localStorage.getItem('ekp_config');
      if (savedConfig) {
        try {
          setConfig(JSON.parse(savedConfig));
        } catch {
          // ignore
        }
      }
    }
  }, []);

  // 测试连接（通过后端代理，使用 REST API + Basic Auth）
  const testConnection = async () => {
    // 收集所有缺失的必填字段
    const missingFields: string[] = [];
    if (!config.baseUrl) missingFields.push('EKP 系统地址');
    if (!config.username) missingFields.push('用户名');
    if (!config.password) missingFields.push('密码');

    if (missingFields.length > 0) {
      setTestError(`请填写必填项：${missingFields.join('、')}`);
      setTestResult('failed');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setTestError(null);

    try {
      // 通过后端代理发送 REST 请求
      const response = await fetch('/api/ekp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          baseUrl: config.baseUrl,
          username: config.username,
          password: config.password,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTestResult('success');
        setTestError(result.message || '连接成功！');
      } else {
        setTestResult('failed');
        setTestError(result.message || '连接失败');
      }
    } catch (err) {
      setTestResult('failed');
      setTestError(err instanceof Error ? err.message : '连接测试失败');
    } finally {
      setIsTesting(false);
    }
  };

  // 保存配置
  const saveConfig = () => {
    setIsSaving(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('ekp_config', JSON.stringify(config));
      }
      setIsSaving(false);
    } catch {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 提示 */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
            <p><strong>蓝凌EKP 使用 REST Service 接口</strong>，支持 Basic Auth 认证。</p>
            <p>系统将自动使用以下接口路径进行连接测试和待办查询：</p>
            <p className="font-mono text-[10px] bg-blue-100 dark:bg-blue-900/50 px-1 rounded">/api/sys-notify/sysNotifyTodoRestService/getTodo</p>
            <p>配置信息仅存储在本地浏览器中，不会上传到服务器。</p>
          </div>
        </div>
      </div>

      {/* EKP 地址 */}
      <div>
        <label className="block text-xs font-medium mb-1.5">
          EKP 系统地址 <span className="text-destructive ml-1">*</span>
        </label>
        <input
          type="url"
          value={config.baseUrl}
          onChange={(e) => setConfig({ ...config, baseUrl: e.target.value.trim() })}
          placeholder="https://oa.fjhxrl.com"
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <p className="text-xs text-muted-foreground mt-1">填写蓝凌EKP系统的访问地址</p>
      </div>

      {/* 用户名 */}
      <div>
        <label className="block text-xs font-medium mb-1.5">
          用户名 <span className="text-destructive ml-1">*</span>
        </label>
        <input
          type="text"
          value={config.username}
          onChange={(e) => setConfig({ ...config, username: e.target.value })}
          placeholder="请输入EKP登录用户名"
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* 密码 */}
      <div>
        <label className="block text-xs font-medium mb-1.5">
          密码 <span className="text-destructive ml-1">*</span>
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={config.password}
            onChange={(e) => setConfig({ ...config, password: e.target.value })}
            placeholder="请输入EKP登录密码"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded"
          >
            {showPassword ? (
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Link className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* 表单模板ID */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1.5">
            请假表单模板ID
          </label>
          <input
            type="text"
            value={config.leaveTemplateId}
            onChange={(e) => setConfig({ ...config, leaveTemplateId: e.target.value })}
            placeholder="如: 18c5d7a2..."
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5">
            报销表单模板ID
          </label>
          <input
            type="text"
            value={config.expenseTemplateId}
            onChange={(e) => setConfig({ ...config, expenseTemplateId: e.target.value })}
            placeholder="如: 18c5d7a3..."
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* 启用开关 */}
      <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            config.enabled ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'
          )}>
            {config.enabled ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          </div>
          <div>
            <p className="text-sm font-medium">启用 EKP 集成</p>
            <p className="text-xs text-muted-foreground">开启后在对话中可提交审批申请</p>
          </div>
        </div>
        <button
          onClick={() => setConfig({ ...config, enabled: !config.enabled })}
          className={cn(
            'relative w-11 h-6 rounded-full transition-colors',
            config.enabled ? 'bg-primary' : 'bg-muted'
          )}
        >
          <span className={cn(
            'absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform',
            config.enabled && 'translate-x-5'
          )} />
        </button>
      </div>

      {/* 测试结果 */}
      {testResult && (
        <div className={cn(
          'p-3 rounded-lg text-sm',
          testResult === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        )}>
          <div className="flex items-center gap-2 mb-1">
            {testResult === 'success' ? (
              <Check className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span className="font-medium">
              {testResult === 'success' ? '连接成功' : '连接失败'}
            </span>
          </div>
          {testError && (
            <p className="text-xs opacity-80">{testError}</p>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <button
          onClick={testConnection}
          disabled={isTesting || !config.baseUrl}
          className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
        >
          {isTesting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              测试中...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              测试连接
            </>
          )}
        </button>
        <button
          onClick={saveConfig}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          保存配置
        </button>
      </div>
    </div>
  );
}
