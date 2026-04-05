'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Bell,
  Database,
  Globe,
  Zap,
  Calendar,
  Check,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CustomSkill,
  AuthType,
  SkillCategory,
  ParamType,
  HttpMethod,
  ContentType,
  SKILL_TEMPLATES,
} from '@/types/custom-skill';

// 可用图标映射
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Bell,
  Database,
  Globe,
  Zap,
  Calendar,
};

interface CustomSkillDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (skill: CustomSkill) => void;
  initialSkill?: CustomSkill | null;
}

const CATEGORIES: SkillCategory[] = [
  '信息获取',
  '创作工具',
  '开发工具',
  '信息处理',
  '数据分析',
  '语言处理',
  '自动化',
  '企业服务',
];

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE'];

const CONTENT_TYPES: ContentType[] = [
  'application/json',
  'application/x-www-form-urlencoded',
  'text/plain',
];

const AUTH_TYPES: { value: AuthType; label: string }[] = [
  { value: 'basic', label: 'Basic Auth' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'api-key', label: 'API Key' },
  { value: 'none', label: '无需认证' },
];

const PARAM_TYPES: { value: ParamType; label: string }[] = [
  { value: 'string', label: '文本' },
  { value: 'number', label: '数字' },
  { value: 'boolean', label: '布尔值' },
  { value: 'enum', label: '枚举' },
  { value: 'json', label: 'JSON' },
];

// 默认技能配置
const DEFAULT_SKILL: Partial<CustomSkill> = {
  name: '',
  description: '',
  icon: 'Bell',
  category: '企业服务',
  enabled: true,
  apiConfig: {
    baseUrl: '',
    path: '',
    method: 'POST',
    contentType: 'application/json',
    timeout: 10000,
  },
  authConfig: {
    type: 'basic',
    username: '',
    password: '',
  },
  requestParams: [],
  bodyTemplate: {},
  responseParsing: {
    successField: 'success',
    successValue: 'true',
    dataField: 'data',
    messageField: 'message',
    dataIsJson: false,
  },
};

export function CustomSkillDialog({
  open,
  onClose,
  onSave,
  initialSkill,
}: CustomSkillDialogProps) {
  const [skill, setSkill] = useState<Partial<CustomSkill>>(DEFAULT_SKILL);
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // 初始化
  useEffect(() => {
    if (initialSkill) {
      setSkill(initialSkill);
    } else {
      setSkill(DEFAULT_SKILL);
    }
    setTestResult(null);
  }, [initialSkill, open]);

  // 应用模板
  const applyTemplate = (templateKey: string) => {
    const template = SKILL_TEMPLATES[templateKey as keyof typeof SKILL_TEMPLATES];
    if (template) {
      setSkill({
        ...DEFAULT_SKILL,
        ...template,
        id: skill.id, // 保留原有 ID
      });
      setSelectedTemplate(templateKey);
    }
  };

  // 测试连接
  const handleTest = async () => {
    if (!skill.apiConfig?.baseUrl) {
      setTestResult({ success: false, message: '请填写服务地址' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/custom-skill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          skill,
        }),
      });

      const data = await response.json();
      setTestResult({ success: data.success, message: data.message });
    } catch (err) {
      setTestResult({ success: false, message: `测试失败：${err instanceof Error ? err.message : '网络错误'}` });
    } finally {
      setTesting(false);
    }
  };

  // 保存技能
  const handleSave = () => {
    if (!skill.name?.trim()) {
      alert('请填写技能名称');
      return;
    }
    if (!skill.apiConfig?.baseUrl?.trim()) {
      alert('请填写服务地址');
      return;
    }
    if (!skill.apiConfig?.path?.trim()) {
      alert('请填写服务路径');
      return;
    }

    onSave(skill as CustomSkill);
    onClose();
  };

  // 添加请求参数
  const addRequestParam = () => {
    const newParam = {
      name: '',
      label: '',
      type: 'string' as ParamType,
      required: false,
      placeholder: '',
      description: '',
    };
    setSkill({
      ...skill,
      requestParams: [...(skill.requestParams || []), newParam],
    });
  };

  // 更新请求参数
  const updateRequestParam = (index: number, updates: Partial<CustomSkill['requestParams'][number]>) => {
    const params = [...(skill.requestParams || [])];
    params[index] = { ...params[index], ...updates };
    setSkill({ ...skill, requestParams: params });
  };

  // 删除请求参数
  const removeRequestParam = (index: number) => {
    const params = [...(skill.requestParams || [])];
    params.splice(index, 1);
    setSkill({ ...skill, requestParams: params });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 对话框 */}
      <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">
            {initialSkill ? '编辑技能' : '创建自定义技能'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 预置模板选择 */}
          {!initialSkill && (
            <div>
              <label className="block text-sm font-medium mb-2">从模板创建</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(SKILL_TEMPLATES).map(([key, template]) => (
                  <button
                    key={key}
                    onClick={() => applyTemplate(key)}
                    className={cn(
                      'p-3 border rounded-lg text-left transition-all hover:border-primary',
                      selectedTemplate === key ? 'border-primary bg-primary/5' : 'border-border'
                    )}
                  >
                    <div className="font-medium text-sm">{template.name}</div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {template.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 基本信息 */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground">基本信息</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  技能名称 <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={skill.name || ''}
                  onChange={(e) => setSkill({ ...skill, name: e.target.value })}
                  placeholder="如：EKP待办查询"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">分类</label>
                <select
                  value={skill.category || '企业服务'}
                  onChange={(e) => setSkill({ ...skill, category: e.target.value as SkillCategory })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">描述</label>
              <textarea
                value={skill.description || ''}
                onChange={(e) => setSkill({ ...skill, description: e.target.value })}
                placeholder="描述此技能的功能..."
                rows={2}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
          </div>

          {/* API 配置 */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground">API 配置</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  服务地址 <span className="text-destructive">*</span>
                </label>
                <input
                  type="url"
                  value={skill.apiConfig?.baseUrl || ''}
                  onChange={(e) => setSkill({
                    ...skill,
                    apiConfig: { ...skill.apiConfig!, baseUrl: e.target.value.trim() },
                  })}
                  placeholder="https://oa.example.com"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  服务路径 <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={skill.apiConfig?.path || ''}
                  onChange={(e) => setSkill({
                    ...skill,
                    apiConfig: { ...skill.apiConfig!, path: e.target.value },
                  })}
                  placeholder="/api/xxx/service"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">请求方法</label>
                <select
                  value={skill.apiConfig?.method || 'POST'}
                  onChange={(e) => setSkill({
                    ...skill,
                    apiConfig: { ...skill.apiConfig!, method: e.target.value as HttpMethod },
                  })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                >
                  {HTTP_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Content-Type</label>
                <select
                  value={skill.apiConfig?.contentType || 'application/json'}
                  onChange={(e) => setSkill({
                    ...skill,
                    apiConfig: { ...skill.apiConfig!, contentType: e.target.value as ContentType },
                  })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                >
                  {CONTENT_TYPES.map((ct) => (
                    <option key={ct} value={ct}>{ct}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">超时时间(ms)</label>
                <input
                  type="number"
                  value={skill.apiConfig?.timeout || 10000}
                  onChange={(e) => setSkill({
                    ...skill,
                    apiConfig: { ...skill.apiConfig!, timeout: Number(e.target.value) },
                  })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          {/* 认证配置 */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground">认证配置</h3>

            <div>
              <label className="block text-sm font-medium mb-1.5">认证方式</label>
              <select
                value={skill.authConfig?.type || 'basic'}
                onChange={(e) => {
                  const type = e.target.value as AuthType;
                  let authConfig = { type } as CustomSkill['authConfig'];
                  
                  if (type === 'basic') {
                    authConfig = { type: 'basic', username: '', password: '' };
                  } else if (type === 'bearer') {
                    authConfig = { type: 'bearer', token: '' };
                  } else if (type === 'api-key') {
                    authConfig = { type: 'api-key', apiKey: '', headerName: 'X-API-Key' };
                  } else {
                    authConfig = { type: 'none' };
                  }
                  
                  setSkill({ ...skill, authConfig });
                }}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
              >
                {AUTH_TYPES.map((at) => (
                  <option key={at.value} value={at.value}>{at.label}</option>
                ))}
              </select>
            </div>

            {skill.authConfig?.type === 'basic' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">用户名</label>
                  <input
                    type="text"
                    value={(skill.authConfig as { username: string; password: string }).username || ''}
                    onChange={(e) => setSkill({
                      ...skill,
                      authConfig: { ...skill.authConfig as { type: 'basic'; username: string; password: string }, username: e.target.value },
                    })}
                    placeholder="登录用户名"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">密码</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={(skill.authConfig as { username: string; password: string }).password || ''}
                      onChange={(e) => setSkill({
                        ...skill,
                        authConfig: { ...skill.authConfig as { type: 'basic'; username: string; password: string }, password: e.target.value },
                      })}
                      placeholder="登录密码"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {skill.authConfig?.type === 'bearer' && (
              <div>
                <label className="block text-sm font-medium mb-1.5">Bearer Token</label>
                <input
                  type="password"
                  value={(skill.authConfig as { token: string }).token || ''}
                  onChange={(e) => setSkill({
                    ...skill,
                    authConfig: { type: 'bearer', token: e.target.value },
                  })}
                  placeholder="输入 Token"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                />
              </div>
            )}

            {skill.authConfig?.type === 'api-key' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Header 名称</label>
                  <input
                    type="text"
                    value={(skill.authConfig as { apiKey: string; headerName: string }).headerName || 'X-API-Key'}
                    onChange={(e) => setSkill({
                      ...skill,
                      authConfig: { ...skill.authConfig as { type: 'api-key'; apiKey: string; headerName: string }, headerName: e.target.value },
                    })}
                    placeholder="X-API-Key"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">API Key</label>
                  <input
                    type="password"
                    value={(skill.authConfig as { apiKey: string; headerName: string }).apiKey || ''}
                    onChange={(e) => setSkill({
                      ...skill,
                      authConfig: { ...skill.authConfig as { type: 'api-key'; apiKey: string; headerName: string }, apiKey: e.target.value },
                    })}
                    placeholder="输入 API Key"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 请求参数配置 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm text-muted-foreground">请求参数</h3>
              <button
                onClick={addRequestParam}
                className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded transition-colors"
              >
                <Plus className="w-3 h-3" />
                添加参数
              </button>
            </div>

            {skill.requestParams && skill.requestParams.length > 0 ? (
              <div className="space-y-3">
                {skill.requestParams.map((param, index) => (
                  <div key={index} className="p-3 bg-accent/30 rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={param.name}
                        onChange={(e) => updateRequestParam(index, { name: e.target.value })}
                        placeholder="参数名"
                        className="flex-1 px-2 py-1.5 bg-background border border-border rounded text-sm"
                      />
                      <input
                        type="text"
                        value={param.label}
                        onChange={(e) => updateRequestParam(index, { label: e.target.value })}
                        placeholder="显示名称"
                        className="flex-1 px-2 py-1.5 bg-background border border-border rounded text-sm"
                      />
                      <select
                        value={param.type}
                        onChange={(e) => updateRequestParam(index, { type: e.target.value as ParamType })}
                        className="px-2 py-1.5 bg-background border border-border rounded text-sm"
                      >
                        {PARAM_TYPES.map((pt) => (
                          <option key={pt.value} value={pt.value}>{pt.label}</option>
                        ))}
                      </select>
                      <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={param.required}
                          onChange={(e) => updateRequestParam(index, { required: e.target.checked })}
                          className="rounded"
                        />
                        必填
                      </label>
                      <button
                        onClick={() => removeRequestParam(index)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={param.placeholder || ''}
                        onChange={(e) => updateRequestParam(index, { placeholder: e.target.value })}
                        placeholder="输入提示"
                        className="flex-1 px-2 py-1.5 bg-background border border-border rounded text-sm"
                      />
                      <input
                        type="text"
                        value={param.defaultValue || ''}
                        onChange={(e) => updateRequestParam(index, { defaultValue: e.target.value })}
                        placeholder="默认值"
                        className="w-24 px-2 py-1.5 bg-background border border-border rounded text-sm"
                      />
                    </div>

                    {param.type === 'enum' && (
                      <input
                        type="text"
                        value={param.enumOptions?.join(', ') || ''}
                        onChange={(e) => updateRequestParam(index, { 
                          enumOptions: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                        })}
                        placeholder="枚举选项，用逗号分隔"
                        className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm"
                      />
                    )}

                    <input
                      type="text"
                      value={param.description || ''}
                      onChange={(e) => updateRequestParam(index, { description: e.target.value })}
                      placeholder="参数说明"
                      className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
                暂无请求参数，点击上方"添加参数"按钮添加
              </div>
            )}
          </div>

          {/* 高级配置（响应解析） */}
          <div className="space-y-4">
            <button
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {advancedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              响应解析配置
            </button>

            {advancedOpen && (
              <div className="p-4 bg-accent/20 rounded-lg space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">成功标识字段</label>
                    <input
                      type="text"
                      value={skill.responseParsing?.successField || ''}
                      onChange={(e) => setSkill({
                        ...skill,
                        responseParsing: { ...skill.responseParsing!, successField: e.target.value },
                      })}
                      placeholder="如: success 或 result.returnState"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">成功时的值</label>
                    <input
                      type="text"
                      value={skill.responseParsing?.successValue || ''}
                      onChange={(e) => setSkill({
                        ...skill,
                        responseParsing: { ...skill.responseParsing!, successValue: e.target.value },
                      })}
                      placeholder="如: true 或 2"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">数据字段</label>
                    <input
                      type="text"
                      value={skill.responseParsing?.dataField || ''}
                      onChange={(e) => setSkill({
                        ...skill,
                        responseParsing: { ...skill.responseParsing!, dataField: e.target.value },
                      })}
                      placeholder="如: data 或 result.message"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">消息字段</label>
                    <input
                      type="text"
                      value={skill.responseParsing?.messageField || ''}
                      onChange={(e) => setSkill({
                        ...skill,
                        responseParsing: { ...skill.responseParsing!, messageField: e.target.value },
                      })}
                      placeholder="如: message 或 msg"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">数量字段（可选）</label>
                    <input
                      type="text"
                      value={skill.responseParsing?.countField || ''}
                      onChange={(e) => setSkill({
                        ...skill,
                        responseParsing: { ...skill.responseParsing!, countField: e.target.value },
                      })}
                      placeholder="如: count"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={skill.responseParsing?.dataIsJson || false}
                        onChange={(e) => setSkill({
                          ...skill,
                          responseParsing: { ...skill.responseParsing!, dataIsJson: e.target.checked },
                        })}
                        className="rounded"
                      />
                      数据字段为 JSON 字符串
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 测试结果 */}
          {testResult && (
            <div className={cn(
              'p-4 rounded-lg flex items-start gap-3',
              testResult.success ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'
            )}>
              {testResult.success ? (
                <Check className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              )}
              <div className="text-sm">
                <span className={testResult.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                  {testResult.message}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-accent/20">
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm disabled:opacity-50"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                测试中...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                测试连接
              </>
            )}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
            >
              保存技能
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
