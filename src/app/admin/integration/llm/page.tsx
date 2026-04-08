'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
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
  RefreshCw,
  Upload,
  Download,
  Search,
  Edit,
  Play,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

interface EKPInterface {
  id?: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  path: string;
  method: string;
  serviceId?: string;
  enabled: boolean;
  version?: string;
  source?: 'official' | 'custom';
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
                        checked={!!key.isActive}
                        onCheckedChange={() => handleToggleActive(key.id, !!key.isActive)}
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

// ==================== EKP接口管理 Tab 组件 ====================

function EKPInterfacesTab() {
  const [activeSubTab, setActiveSubTab] = useState<'official' | 'custom'>('official');
  const [stats, setStats] = useState<{ total: number; official: number; custom: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [officialInterfaces, setOfficialInterfaces] = useState<EKPInterface[]>([]);
  const [customInterfaces, setCustomInterfaces] = useState<EKPInterface[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [editingInterface, setEditingInterface] = useState<EKPInterface | null>(null);
  const [testingInterface, setTestingInterface] = useState<EKPInterface | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, officialRes, customRes] = await Promise.all([
        fetch('/api/admin/ekp-interfaces'),
        fetch('/api/admin/ekp-interfaces?type=official'),
        fetch('/api/admin/ekp-interfaces?type=custom'),
      ]);
      
      const [statsData, officialData, customData] = await Promise.all([
        statsRes.json(),
        officialRes.json(),
        customRes.json(),
      ]);

      if (statsData.success) {
        setStats(statsData.stats);
      }
      if (officialData.success) {
        setOfficialInterfaces(officialData.data || []);
      }
      if (customData.success) {
        setCustomInterfaces(customData.data || []);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReload = async () => {
    try {
      setIsReloading(true);
      const res = await fetch('/api/admin/ekp-interfaces/reload', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await loadData();
        alert('配置已重新加载');
      } else {
        alert('重载失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      alert('重载失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsReloading(false);
    }
  };

  const handleAdd = () => {
    setEditingInterface(null);
    setFormDialogOpen(true);
  };

  const handleEdit = (item: EKPInterface) => {
    setEditingInterface(item);
    setFormDialogOpen(true);
  };

  const handleTest = (item: EKPInterface) => {
    setTestingInterface(item);
    setTestDialogOpen(true);
  };

  const handleDelete = async (item: EKPInterface) => {
    if (!confirm('确定要删除这个接口吗？')) return;

    try {
      const res = await fetch(`/api/admin/ekp-interfaces/${item.id || item.code}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        alert('删除成功');
        await loadData();
      } else {
        alert('删除失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      alert('删除失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handleSave = async (formData: any) => {
    const url = editingInterface
      ? `/api/admin/ekp-interfaces/${editingInterface.id || editingInterface.code}`
      : '/api/admin/ekp-interfaces';

    const method = editingInterface ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: activeSubTab,
        ...formData,
      }),
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || '保存失败');
    }

    alert(editingInterface ? '更新成功' : '创建成功');
    await loadData();
  };

  const handleTestInterface = async (params: Record<string, any>) => {
    if (!testingInterface) return { success: false, error: '未选择接口' };

    try {
      const res = await fetch('/api/admin/ekp-interfaces/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interfaceCode: testingInterface.code,
          params,
        }),
      });
      return await res.json();
    } catch (error) {
      return { success: false, error: '测试请求失败' };
    }
  };

  // 过滤接口
  const currentInterfaces = activeSubTab === 'official' ? officialInterfaces : customInterfaces;
  const filteredInterfaces = currentInterfaces.filter((item) =>
    !searchKeyword ||
    item.code.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    item.name.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 操作栏 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">EKP接口管理</h2>
          <p className="text-sm text-gray-600 mt-1">
            管理所有蓝凌EKP接口的配置信息
            {stats && (
              <span className="ml-2 text-xs text-gray-500">
                (总计 {stats.total} 个：官方 {stats.official} 个，二开 {stats.custom} 个)
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReload} disabled={isReloading}>
            {isReloading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                重载中...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                重载配置
              </>
            )}
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            导入配置
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            导出配置
          </Button>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            添加接口
          </Button>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索接口代码、名称..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* 接口分类Tabs */}
      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as any)}>
        <TabsList>
          <TabsTrigger value="official">
            官方接口
            {stats && stats.official > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                {stats.official}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="custom">
            二开接口
            {stats && stats.custom > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                {stats.custom}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="official" className="mt-4">
          {filteredInterfaces.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              {searchKeyword ? '未找到匹配的接口' : '暂无官方接口'}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">接口代码</TableHead>
                    <TableHead>接口名称</TableHead>
                    <TableHead className="w-[120px]">分类</TableHead>
                    <TableHead className="w-[300px]">API路径</TableHead>
                    <TableHead className="w-[80px]">方法</TableHead>
                    <TableHead className="w-[80px]">状态</TableHead>
                    <TableHead className="w-[120px] text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInterfaces.map((item) => (
                    <TableRow key={item.id || item.code}>
                      <TableCell className="font-mono text-sm">{item.code}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.name}</div>
                          {item.description && (
                            <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{item.path}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.method}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.enabled ? 'default' : 'secondary'}>
                          {item.enabled ? '启用' : '禁用'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(item)}>
                              <Edit className="w-4 h-4 mr-2" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleTest(item)}>
                              <Play className="w-4 h-4 mr-2" />
                              测试
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(item)} className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="custom" className="mt-4">
          {filteredInterfaces.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              {searchKeyword ? '未找到匹配的接口' : '暂无二开接口配置'}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">接口代码</TableHead>
                    <TableHead>接口名称</TableHead>
                    <TableHead className="w-[120px]">分类</TableHead>
                    <TableHead className="w-[300px]">API路径</TableHead>
                    <TableHead className="w-[80px]">方法</TableHead>
                    <TableHead className="w-[80px]">状态</TableHead>
                    <TableHead className="w-[120px] text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInterfaces.map((item) => (
                    <TableRow key={item.id || item.code}>
                      <TableCell className="font-mono text-sm">{item.code}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.name}</div>
                          {item.description && (
                            <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{item.path}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.method}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.enabled ? 'default' : 'secondary'}>
                          {item.enabled ? '启用' : '禁用'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(item)}>
                              <Edit className="w-4 h-4 mr-2" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleTest(item)}>
                              <Play className="w-4 h-4 mr-2" />
                              测试
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(item)} className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 添加/编辑对话框 */}
      {formDialogOpen && (
        <InterfaceFormDialogComponent
          open={formDialogOpen}
          onClose={() => setFormDialogOpen(false)}
          onSave={handleSave}
          source={activeSubTab}
          initialData={editingInterface}
        />
      )}

      {/* 测试对话框 */}
      {testDialogOpen && testingInterface && (
        <InterfaceTestDialogComponent
          open={testDialogOpen}
          onClose={() => setTestDialogOpen(false)}
          interfaceData={testingInterface}
          onTest={handleTestInterface}
        />
      )}
    </div>
  );
}

// ==================== 接口表单对话框组件 ====================

interface InterfaceFormDialogComponentProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  source: 'official' | 'custom';
  initialData?: EKPInterface | null;
}

function InterfaceFormDialogComponent({
  open,
  onClose,
  onSave,
  source,
  initialData,
}: InterfaceFormDialogComponentProps) {
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    category: '',
    path: '',
    method: 'POST',
    serviceId: 'ekp-service',
    enabled: true,
    version: '1.0',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        code: initialData.code || '',
        name: initialData.name || '',
        description: initialData.description || '',
        category: initialData.category || '',
        path: initialData.path || '',
        method: initialData.method || 'POST',
        serviceId: initialData.serviceId || 'ekp-service',
        enabled: initialData.enabled !== false,
        version: initialData.version || '1.0',
      });
    } else {
      setForm({
        code: '',
        name: '',
        description: '',
        category: '',
        path: '',
        method: 'POST',
        serviceId: 'ekp-service',
        enabled: true,
        version: '1.0',
      });
    }
  }, [initialData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.name || !form.category || !form.path) {
      alert('请填写必填字段');
      return;
    }

    setLoading(true);
    try {
      await onSave(form);
      onClose();
    } catch (error) {
      alert('保存失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const categories = source === 'official'
    ? ['workflow', 'document', 'organization', 'system']
    : ['流程', '统计', '文档', '其他'];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {initialData ? '编辑接口' : '添加接口'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">接口代码 *</label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="例如: ekp.todo.getTodo"
                disabled={!!initialData}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">接口名称 *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例如: 待办查询"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">接口描述</label>
            <textarea
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm min-h-[80px]"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="接口功能描述..."
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">分类 *</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="">请选择</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">请求方法 *</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">版本</label>
              <Input
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                placeholder="1.0"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">API路径 *</label>
            <Input
              value={form.path}
              onChange={(e) => setForm({ ...form, path: e.target.value })}
              placeholder="/api/sys-notify/sysNotifyTodoRestService/getTodo"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">服务标识</label>
            <Input
              value={form.serviceId}
              onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
              placeholder="ekp-service"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">启用此接口</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              保存
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 接口测试对话框组件 ====================

interface InterfaceTestDialogComponentProps {
  open: boolean;
  onClose: () => void;
  interfaceData: EKPInterface | null;
  onTest: (params: Record<string, any>) => Promise<{ success: boolean; data?: any; error?: string }>;
}

function InterfaceTestDialogComponent({
  open,
  onClose,
  interfaceData,
  onTest,
}: InterfaceTestDialogComponentProps) {
  const [params, setParams] = useState('');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; data?: any; error?: string } | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setResult(null);

    try {
      let parsedParams = {};
      if (params.trim()) {
        try {
          parsedParams = JSON.parse(params);
        } catch {
          alert('参数必须是有效的JSON格式');
          setTesting(false);
          return;
        }
      }

      const testResult = await onTest(parsedParams);
      setResult(testResult);
    } catch (error) {
      setResult({ success: false, error: '测试请求失败' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>测试接口</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted p-3 rounded-lg">
            <div className="text-sm font-medium">{interfaceData?.name}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {interfaceData?.method} {interfaceData?.path}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">请求参数 (JSON格式)</label>
            <textarea
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-mono min-h-[120px]"
              value={params}
              onChange={(e) => setParams(e.target.value)}
              placeholder='{"key": "value"}'
            />
          </div>

          {result && (
            <div className={cn(
              'p-3 rounded-lg',
              result.success ? 'bg-green-50' : 'bg-red-50'
            )}>
              <div className={cn(
                'text-sm font-medium mb-2',
                result.success ? 'text-green-700' : 'text-red-700'
              )}>
                {result.success ? '测试成功' : '测试失败'}
              </div>
              <pre className="text-xs overflow-auto max-h-[200px]">
                {JSON.stringify(result.data || result.error, null, 2)}
              </pre>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              关闭
            </Button>
            <Button onClick={handleTest} disabled={testing}>
              {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              测试
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 主页面组件 ====================

export default function LLMConfigPage() {
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold">AI服务配置</h1>
        <p className="text-muted-foreground mt-1">配置全局大模型服务和EKP接口管理</p>
      </div>

      {/* Tab 切换 */}
      <Tabs defaultValue="direct" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="direct" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            直接配置
          </TabsTrigger>
          <TabsTrigger value="oneapi" className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            OneAPI代理
          </TabsTrigger>
          <TabsTrigger value="ekp" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            EKP接口管理
          </TabsTrigger>
        </TabsList>

        <TabsContent value="direct" className="mt-6">
          <DirectConfigTab />
        </TabsContent>

        <TabsContent value="oneapi" className="mt-6">
          <OneAPIProxyTab />
        </TabsContent>

        <TabsContent value="ekp" className="mt-6">
          <EKPInterfacesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
