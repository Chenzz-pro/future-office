'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Check, Loader2, RefreshCw, Wifi, WifiOff, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface EKPConfig {
  id?: string;
  baseUrl: string;
  username: string;
  password: string;
  apiPath: string;
  serviceId: string;
  leaveTemplateId: string;
  expenseTemplateId: string;
  enabled: boolean;
  userId?: string;
}

export default function EKPConfigPanel() {
  const [config, setConfig] = useState<EKPConfig>({
    baseUrl: '',
    username: '',
    password: '',
    apiPath: '',
    serviceId: '',
    leaveTemplateId: '',
    expenseTemplateId: '',
    enabled: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'failed' | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 加载保存的配置
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/ekp-configs');
      const data = await res.json();
      if (data.success && data.data) {
        setConfig(data.data);
      }
    } catch (error) {
      console.error('加载 EKP 配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 测试连接
  const testConnection = async () => {
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
  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/ekp-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } else {
        alert('保存失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      alert('保存失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 提示 */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Building className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
            <p><strong>蓝凌EKP 使用 REST Service 接口</strong>，支持 Basic Auth 认证。</p>
            <p>系统将自动使用以下接口路径进行连接测试和待办查询：</p>
            <p className="font-mono text-[10px] bg-blue-100 dark:bg-blue-900/50 px-1 rounded">/api/sys-notify/sysNotifyTodoRestService/getTodo</p>
            <p>配置信息存储在数据库中，供系统统一管理。</p>
          </div>
        </div>
      </div>

      {/* EKP 地址 */}
      <div>
        <Label>
          EKP 系统地址 <span className="text-destructive ml-1">*</span>
        </Label>
        <Input
          type="url"
          value={config.baseUrl}
          onChange={(e) => setConfig({ ...config, baseUrl: e.target.value.trim() })}
          placeholder="https://oa.fjhxrl.com"
        />
        <p className="text-xs text-muted-foreground mt-1">填写蓝凌EKP系统的访问地址</p>
      </div>

      {/* 用户名 */}
      <div>
        <Label>
          用户名 <span className="text-destructive ml-1">*</span>
        </Label>
        <Input
          type="text"
          value={config.username}
          onChange={(e) => setConfig({ ...config, username: e.target.value })}
          placeholder="请输入EKP登录用户名"
        />
      </div>

      {/* 密码 */}
      <div>
        <Label>
          密码 <span className="text-destructive ml-1">*</span>
        </Label>
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={config.password}
            onChange={(e) => setConfig({ ...config, password: e.target.value })}
            placeholder="请输入EKP登录密码"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded"
          >
            {showPassword ? (
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Building className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* 表单模板ID */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>请假表单模板ID</Label>
          <Input
            type="text"
            value={config.leaveTemplateId}
            onChange={(e) => setConfig({ ...config, leaveTemplateId: e.target.value })}
            placeholder="如: 18c5d7a2..."
          />
        </div>
        <div>
          <Label>报销表单模板ID</Label>
          <Input
            type="text"
            value={config.expenseTemplateId}
            onChange={(e) => setConfig({ ...config, expenseTemplateId: e.target.value })}
            placeholder="如: 18c5d7a3..."
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
        <Button
          variant="outline"
          onClick={testConnection}
          disabled={isTesting || !config.baseUrl}
        >
          {isTesting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              测试中...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              测试连接
            </>
          )}
        </Button>
        <Button
          onClick={saveConfig}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              {saveSuccess && <Check className="w-4 h-4 mr-2" />}
              保存配置
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
