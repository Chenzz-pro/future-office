'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Save,
  Trash2,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Key,
  Server,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OneAPIConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default function APIManagement() {
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
          apiKey: '', // 不显示API密钥
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

    // 如果 API 密钥为空，说明用户没有修改，不需要更新 API 密钥字段
    const requestBody: any = {
      name: formData.name,
      baseUrl: formData.baseUrl,
      model: formData.model,
      enabled: formData.enabled,
    };

    // 只有当 API 密钥不为空时，才更新 API 密钥
    if (formData.apiKey && formData.apiKey.trim() !== '') {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API管理</h1>
          <p className="text-gray-600 mt-1">配置全局统一大模型服务</p>
        </div>
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
              <h3 className="font-semibold text-gray-900 mb-2">什么是oneAPI？</h3>
              <p className="text-sm text-gray-600">
                oneAPI是一个OpenAI接口兼容的API中转服务，支持多个大模型提供商的统一接入。
                通过oneAPI，您可以轻松接入OpenAI、Azure、DeepSeek、豆包等多个模型服务。
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">如何获取oneAPI？</h3>
              <p className="text-sm text-gray-600">
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
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* 配置名称 */}
              <div>
                <Label htmlFor="name">配置名称</Label>
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
                <Label htmlFor="baseUrl">服务地址</Label>
                <Input
                  id="baseUrl"
                  value={formData.baseUrl}
                  onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                  placeholder="https://your-oneapi-server.com"
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  oneAPI服务的基础URL，例如：https://api.example.com
                </p>
              </div>

              {/* API密钥 */}
              <div>
                <Label htmlFor="apiKey">API密钥</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder="sk-xxxxxxxxxxxxxxxxxxxx"
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  oneAPI服务的API密钥，用于身份验证
                </p>
              </div>

              {/* 模型名称 */}
              <div>
                <Label htmlFor="model">模型名称</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="gpt-4"
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  要使用的模型名称，例如：gpt-4、gpt-3.5-turbo、deepseek-chat等
                </p>
              </div>

              {/* 启用开关 */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>启用oneAPI</Label>
                  <p className="text-xs text-gray-500 mt-1">
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
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleTestConnection}
                  disabled={testing}
                  variant="outline"
                >
                  {testing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      测试中...
                    </>
                  ) : (
                    '测试连接'
                  )}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      保存配置
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
