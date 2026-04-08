'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Save,
  Trash2,
  CheckCircle,
  XCircle,
  Key,
  Server,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface OneAPIConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

export default function LLMConfigPage() {
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

  // 加载配置
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

  // 测试连接
  const handleTestConnection = async () => {
    if (!formData.baseUrl || !formData.apiKey || !formData.model) {
      setTestResult({
        success: false,
        message: '请填写完整的配置信息',
      });
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
      setTestResult({
        success: false,
        message: '连接测试失败',
      });
    } finally {
      setTesting(false);
    }
  };

  // 保存配置
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

  // 删除配置
  const handleDelete = async () => {
    if (!confirm('确定要删除oneAPI配置吗？')) return;

    setSaving(true);
    try {
      const response = await fetch('/api/integration/oneapi', {
        method: 'DELETE',
      });

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
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold">API管理</h1>
        <p className="text-muted-foreground mt-1">配置全局统一大模型服务</p>
      </div>

      {/* 说明卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            oneAPI集成说明
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
              配置oneAPI后，系统的智能体将使用大模型进行意图识别和响应生成，
              提升智能度和准确性。如果未配置oneAPI，系统将使用规则引擎（降级方案）。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* 配置表单 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              oneAPI配置
            </CardTitle>
            {config && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={saving}
              >
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
              {/* 配置名称 */}
              <div>
                <label htmlFor="name" className="text-sm font-medium">配置名称</label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="oneAPI服务"
                  className="mt-2"
                />
              </div>

              {/* 服务地址 */}
              <div>
                <label htmlFor="baseUrl" className="text-sm font-medium">服务地址</label>
                <Input
                  id="baseUrl"
                  value={formData.baseUrl}
                  onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                  placeholder="https://your-oneapi-server.com"
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  oneAPI服务的基础URL，例如：https://api.example.com
                </p>
              </div>

              {/* API密钥 */}
              <div>
                <label htmlFor="apiKey" className="text-sm font-medium">API密钥</label>
                <Input
                  id="apiKey"
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder="sk-xxxxxxxxxxxxxxxxxxxx"
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  oneAPI服务的API密钥，用于身份验证。如果显示为 ******，表示已有密钥，无需修改。
                </p>
              </div>

              {/* 模型名称 */}
              <div>
                <label htmlFor="model" className="text-sm font-medium">模型名称</label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="gpt-4"
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  要使用的模型名称，例如：gpt-4、gpt-3.5-turbo、deepseek-chat等
                </p>
              </div>

              {/* 启用开关 */}
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

              {/* 测试连接结果 */}
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

              {/* 操作按钮 */}
              <div className="flex items-center gap-4 pt-4 border-t">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  保存配置
                </Button>
                <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
                  {testing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Server className="w-4 h-4 mr-2" />
                  )}
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
