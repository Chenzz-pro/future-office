'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  Save,
  Trash2,
  CheckCircle,
  XCircle,
  Key,
  Server,
  Globe,
  Plus,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ==================== 类型定义 ====================

interface ApiKey {
  id: string;
  name: string;
  provider: 'openai' | 'claude' | 'deepseek' | 'doubao' | 'custom';
  apiKey: string;
  baseUrl?: string;
  isActive: boolean;
  createdAt?: string;
}

interface OneAPIConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
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

// ==================== 直接配置 Tab 组件 ====================

function DirectConfigTab() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState<Partial<ApiKey>>({
    provider: 'doubao',
    name: '',
    apiKey: '',
    baseUrl: '',
    isActive: true,
  });
  const [showKeyMap, setShowKeyMap] = useState<Record<string, boolean>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/api-keys');
      const data = await res.json();
      if (data.success) {
        setApiKeys(data.data || []);
      }
    } catch (error) {
      console.error('加载API Keys失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddKey = async () => {
    if (!newKey.name || !newKey.apiKey) {
      alert('请填写名称和API Key');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKey.name,
          provider: newKey.provider || 'custom',
          apiKey: newKey.apiKey,
          baseUrl: newKey.baseUrl || providerConfig[newKey.provider || 'doubao']?.defaultBaseUrl || '',
          isActive: newKey.isActive ?? true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddForm(false);
        setNewKey({ provider: 'doubao', name: '', apiKey: '', baseUrl: '', isActive: true });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        await loadApiKeys();
      } else {
        alert(data.error || '保存失败');
      }
    } catch (error) {
      console.error('保存API Key失败:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('确定要删除这个API Key吗？')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/api-keys/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await loadApiKeys();
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除API Key失败:', error);
      alert('删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/api-keys/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      const data = await res.json();
      if (data.success) {
        await loadApiKeys();
      } else {
        alert(data.error || '更新失败');
      }
    } catch (error) {
      console.error('更新API Key失败:', error);
      alert('更新失败');
    }
  };

  const handleTestKey = async (key: ApiKey) => {
    setTestResult({ id: key.id, success: false, message: '测试中...' });
    try {
      const res = await fetch('/api/admin/api-keys/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: key.provider,
          apiKey: key.apiKey,
          baseUrl: key.baseUrl,
        }),
      });
      const data = await res.json();
      setTestResult({
        id: key.id,
        success: data.success,
        message: data.success ? '连接成功' : (data.error || '连接失败'),
      });
    } catch (error) {
      setTestResult({ id: key.id, success: false, message: '测试请求失败' });
    }
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return '****';
    return key.slice(0, 4) + '****' + key.slice(-4);
  };

  const getProviderBadgeColor = (provider: string) => {
    const colors: Record<string, string> = {
      doubao: 'bg-orange-100 text-orange-700 border-orange-200',
      openai: 'bg-green-100 text-green-700 border-green-200',
      claude: 'bg-purple-100 text-purple-700 border-purple-200',
      deepseek: 'bg-blue-100 text-blue-700 border-blue-200',
      custom: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return colors[provider] || colors.custom;
  };

  return (
    <div className="space-y-6">
      {/* 说明卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            直接配置说明
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-foreground mb-2">支持的大模型</h3>
              <p className="text-sm text-muted-foreground">
                支持豆包、OpenAI、Claude、DeepSeek等多种大模型的直接接入。
                每个模型服务可以单独配置API Key，系统会自动选择可用的模型。
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">如何获取API Key</h3>
              <p className="text-sm text-muted-foreground">
                请前往各模型提供商的官网申请API Key。建议优先使用豆包模型，
                国内访问速度快，稳定性好。
              </p>
            </div>
          </div>
          <Alert>
            <AlertDescription>
              直接配置模式下，系统会直接调用各大模型API。如需使用统一的API管理平台，
              请切换到"OneAPI代理"标签页。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* API Keys 列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              已配置的 API Keys
            </CardTitle>
            {!showAddForm && (
              <Button onClick={() => setShowAddForm(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                添加配置
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : apiKeys.length === 0 && !showAddForm ? (
            <div className="text-center py-12">
              <Key className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">暂未配置任何API Key</p>
              <Button onClick={() => setShowAddForm(true)} className="mt-4" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                添加第一个配置
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 添加表单 */}
              {showAddForm && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-medium mb-4">添加新的 API 配置</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">配置名称</label>
                      <Input
                        placeholder="例如：豆包主账号"
                        value={newKey.name}
                        onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">模型提供商</label>
                      <select
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        value={newKey.provider}
                        onChange={(e) => {
                          const provider = e.target.value as ApiKey['provider'];
                          setNewKey({
                            ...newKey,
                            provider,
                            baseUrl: providerConfig[provider]?.defaultBaseUrl || '',
                          });
                        }}
                      >
                        {Object.entries(providerConfig).map(([key, config]) => (
                          <option key={key} value={key}>{config.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">API Key</label>
                      <Input
                        type="password"
                        placeholder="sk-xxxxxxxxxxxxxxxxxxxx"
                        value={newKey.apiKey}
                        onChange={(e) => setNewKey({ ...newKey, apiKey: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">接口地址（可选）</label>
                      <Input
                        placeholder={providerConfig[newKey.provider || 'doubao']?.defaultBaseUrl || 'https://api.example.com'}
                        value={newKey.baseUrl}
                        onChange={(e) => setNewKey({ ...newKey, baseUrl: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={newKey.isActive}
                        onChange={(e) => setNewKey({ ...newKey, isActive: e.target.checked })}
                        className="rounded"
                      />
                      启用此配置
                    </label>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                        取消
                      </Button>
                      <Button size="sm" onClick={handleAddKey} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        保存
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* API Keys 列表 */}
              {apiKeys.map((key) => (
                <div key={key.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="pt-1">
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
                          getProviderBadgeColor(key.provider)
                        )}>
                          {providerConfig[key.provider]?.nameEn || key.provider.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium">{key.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {key.baseUrl ? (
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              {key.baseUrl}
                            </span>
                          ) : (
                            <span>{providerConfig[key.provider]?.defaultBaseUrl}</span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-sm font-mono text-muted-foreground">
                            {showKeyMap[key.id] ? key.apiKey : maskApiKey(key.apiKey)}
                          </span>
                          <button
                            onClick={() => setShowKeyMap({ ...showKeyMap, [key.id]: !showKeyMap[key.id] })}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {showKeyMap[key.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={key.isActive}
                        onCheckedChange={() => handleToggleActive(key.id, key.isActive)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestKey(key)}
                      >
                        测试
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteKey(key.id)}
                        disabled={deletingId === key.id}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {testResult?.id === key.id && (
                    <div className={cn(
                      'mt-3 text-sm px-3 py-2 rounded',
                      testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    )}>
                      {testResult.success ? <CheckCircle className="w-4 h-4 inline mr-1" /> : <XCircle className="w-4 h-4 inline mr-1" />}
                      {testResult.message}
                    </div>
                  )}
                </div>
              ))}

              {saveSuccess && (
                <div className="text-sm text-green-600 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  保存成功
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== OneAPI代理 Tab 组件 ====================

function OneAPIProxyTab() {
  const [config, setConfig] = useState<OneAPIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [formData, setFormData] = useState({
    name: 'oneAPI服务',
    baseUrl: '',
    apiKey: '',
    model: 'gpt-4',
    enabled: true,
  });

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/integration/oneapi');
      const data = await response.json();
      if (data.success && data.data) {
        setConfig(data.data);
        setFormData({
          name: data.data.name,
          baseUrl: data.data.baseUrl,
          apiKey: '******',
          model: data.data.model,
          enabled: data.data.enabled,
        });
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleTestConnection = async () => {
    if (!formData.baseUrl || !formData.apiKey || !formData.model) {
      setTestResult({ success: false, message: '请填写完整的配置信息' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/integration/oneapi/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: formData.baseUrl,
          apiKey: formData.apiKey,
          model: formData.model,
        }),
      });

      const data = await response.json();
      setTestResult({
        success: data.success,
        message: data.message || (data.success ? '连接测试成功' : '连接测试失败'),
      });
    } catch (error) {
      setTestResult({ success: false, message: '连接测试失败' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!formData.baseUrl || !formData.model) {
      alert('请填写完整的配置信息');
      return;
    }

    const requestBody: Record<string, unknown> = {
      name: formData.name,
      baseUrl: formData.baseUrl,
      model: formData.model,
      enabled: formData.enabled,
    };

    if (formData.apiKey && formData.apiKey.trim() !== '' && formData.apiKey !== '******') {
      requestBody.apiKey = formData.apiKey;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/integration/oneapi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      if (data.success) {
        alert('保存配置成功');
        await loadConfig();
      } else {
        alert(data.error || '保存失败');
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      alert('保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除oneAPI配置吗？')) return;

    setSaving(true);
    try {
      const response = await fetch('/api/integration/oneapi', { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        alert('删除配置成功');
        setConfig(null);
        setFormData({
          name: 'oneAPI服务',
          baseUrl: '',
          apiKey: '',
          model: 'gpt-4',
          enabled: true,
        });
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除配置失败:', error);
      alert('删除配置失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 说明卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            OneAPI代理说明
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-foreground mb-2">什么是oneAPI？</h3>
              <p className="text-sm text-muted-foreground">
                oneAPI是一个OpenAI接口兼容的API中转服务，支持多个大模型提供商的统一接入。
                通过oneAPI，您可以轻松接入OpenAI、Azure、DeepSeek、豆包等多个模型服务。
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">如何获取oneAPI？</h3>
              <p className="text-sm text-muted-foreground">
                您需要部署自己的oneAPI服务，或者使用第三方提供的oneAPI服务。
                配置时需要提供oneAPI服务的地址和API密钥。
              </p>
            </div>
          </div>
          <Alert>
            <AlertDescription>
              配置oneAPI后，系统将通过oneAPI代理统一调用大模型服务。
              如需直接配置各大模型API，请切换到"直接配置"标签页。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* 配置表单 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              oneAPI配置
            </CardTitle>
            {config && (
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={saving}>
                <Trash2 className="w-4 h-4 mr-2" />
                删除配置
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">配置名称</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="oneAPI服务"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">服务地址</label>
                <Input
                  value={formData.baseUrl}
                  onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                  placeholder="https://your-oneapi-server.com"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  oneAPI服务的基础URL，例如：https://api.example.com
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">API密钥</label>
                <Input
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder="sk-xxxxxxxxxxxxxxxxxxxx"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  oneAPI服务的API密钥。如果显示为 ******，表示已有密钥，无需修改。
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">模型名称</label>
                <Input
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="gpt-4"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  要使用的模型名称，例如：gpt-4、gpt-3.5-turbo、deepseek-chat等
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">启用oneAPI</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    启用后系统将使用oneAPI进行大模型调用
                  </p>
                </div>
                <Switch
                  checked={formData.enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                />
              </div>

              {testResult && (
                <Alert className={cn(
                  testResult.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
                )}>
                  <div className="flex items-start gap-2">
                    {testResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <AlertDescription className={cn(
                      testResult.success ? 'text-green-800' : 'text-red-800'
                    )}>
                      {testResult.message}
                    </AlertDescription>
                  </div>
                </Alert>
              )}

              <div className="flex items-center gap-4 pt-4 border-t">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  保存配置
                </Button>
                <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
                  {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Server className="w-4 h-4 mr-2" />}
                  测试连接
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== 主页面组件 ====================

export default function LLMConfigPage() {
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold">AI服务配置</h1>
        <p className="text-muted-foreground mt-1">配置全局大模型服务，支持直接调用和代理模式</p>
      </div>

      {/* Tab 切换 */}
      <Tabs defaultValue="direct" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="direct" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            直接配置
          </TabsTrigger>
          <TabsTrigger value="oneapi" className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            OneAPI代理
          </TabsTrigger>
        </TabsList>

        <TabsContent value="direct" className="mt-6">
          <DirectConfigTab />
        </TabsContent>

        <TabsContent value="oneapi" className="mt-6">
          <OneAPIProxyTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
