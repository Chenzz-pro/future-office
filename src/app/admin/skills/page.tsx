'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sparkles,
  Search,
  Plus,
  Edit,
  Trash2,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  Bell,
  Calendar,
  Settings,
  TestTube,
  RefreshCw,
  Database,
} from 'lucide-react';
import { SKILL_TEMPLATES, type CustomSkill, type SkillCategory } from '@/types/custom-skill';

interface SkillRecord {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  enabled: boolean;
  apiConfig: Record<string, unknown>;
  authConfig?: Record<string, unknown>;
  requestParams?: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    defaultValue?: string;
    placeholder?: string;
    description?: string;
    enumOptions?: string[];
  }>;
  bodyTemplate?: Record<string, unknown>;
  responseParsing?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export default function SkillsManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [ekpConfig, setEkpConfig] = useState<Record<string, string> | null>(null);

  // 测试对话框状态
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testSkill, setTestSkill] = useState<SkillRecord | null>(null);
  const [testParams, setTestParams] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; data?: unknown } | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  // 新建/编辑对话框状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');
  const [editSkill, setEditSkill] = useState<Partial<SkillRecord>>({});

  // 加载技能列表
  const loadSkills = async () => {
    setLoading(true);
    try {
      // 从本地存储加载自定义技能
      const stored = localStorage.getItem('custom_skills');
      const customSkills = stored ? JSON.parse(stored) : [];

      // 获取EKP配置
      const ekpRes = await fetch('/api/config/ekp');
      const ekpData = await ekpRes.json();
      if (ekpData.success && ekpData.config) {
        setEkpConfig(ekpData.config);
      }

      // 合并预置模板和自定义技能
      const templateSkills: SkillRecord[] = [
        {
          id: 'ekp-todo',
          name: 'EKP待办查询',
          description: '查询蓝凌EKP系统的待办数量',
          icon: 'Bell',
          category: '企业服务',
          enabled: true,
          apiConfig: {
            baseUrl: ekpData.config?.baseUrl || '',
            path: ekpData.config?.apiPath || '/api/sys-notify/sysNotifyTodoRestService/getTodo',
            method: 'POST',
            contentType: 'application/json',
          },
          authConfig: {
            type: 'basic',
            username: ekpData.config?.username || '',
            password: ekpData.config?.password || '',
          },
          requestParams: [
            { name: 'loginName', label: '用户登录名', type: 'string', required: true, defaultValue: ekpData.config?.username || '' },
            { name: 'type', label: '待办类型', type: 'enum', required: false, defaultValue: '0', enumOptions: ['-1', '0', '1', '2', '3', '13'] },
          ],
          bodyTemplate: {
            targets: '{"LoginName":"{{loginName}}"}',
            type: '{{type}}',
          },
          responseParsing: {
            successField: 'returnState',
            successValue: '2',
            dataField: 'message',
            countField: 'count',
          },
        },
        {
          id: 'ekp-leave',
          name: 'EKP请假申请',
          description: '在蓝凌EKP系统发起请假申请',
          icon: 'Calendar',
          category: '企业服务',
          enabled: false,
          apiConfig: {
            baseUrl: ekpData.config?.baseUrl || '',
            path: '/api/km-review/kmReviewRestService/addReview',
            method: 'POST',
            contentType: 'application/json',
          },
          authConfig: {
            type: 'basic',
            username: ekpData.config?.username || '',
            password: ekpData.config?.password || '',
          },
          requestParams: [],
          bodyTemplate: {},
          responseParsing: {},
        },
      ];

      setSkills([...templateSkills, ...customSkills]);
    } catch (error) {
      console.error('加载技能失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载EKP配置
  useEffect(() => {
    loadSkills();
  }, []);

  // 过滤技能
  const filteredSkills = skills.filter(skill =>
    skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    skill.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 统计信息
  const stats = {
    total: skills.length,
    enabled: skills.filter(s => s.enabled).length,
    custom: skills.filter(s => !s.id.startsWith('ekp-')).length,
    categories: [...new Set(skills.map(s => s.category))].length,
  };

  // 测试技能
  const handleTestSkill = async () => {
    if (!testSkill) return;
    setTestLoading(true);
    setTestResult(null);

    try {
      const apiConfig = testSkill.apiConfig as { baseUrl?: string; path?: string; method?: string; contentType?: string };
      const authConfig = testSkill.authConfig as { type?: string; username?: string; password?: string } | undefined;
      const bodyTemplate = testSkill.bodyTemplate || {};

      // 构建请求体
      const body: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(bodyTemplate)) {
        if (typeof value === 'string') {
          // 替换模板变量
          let processedValue = value;
          for (const [paramKey, paramValue] of Object.entries(testParams)) {
            processedValue = processedValue.replace(new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g'), paramValue);
          }
          // 如果是JSON字符串，解析它
          if (key === 'targets' && !processedValue.startsWith('{')) {
            processedValue = `{"LoginName":"${processedValue}"}`;
          }
          body[key] = processedValue;
        } else {
          body[key] = testParams[key] || value;
        }
      }

      // 构建认证头
      const headers: Record<string, string> = {
        'Content-Type': apiConfig.contentType || 'application/json',
      };
      if (authConfig?.type === 'basic' && authConfig.username && authConfig.password) {
        const credentials = btoa(`${authConfig.username}:${authConfig.password}`);
        headers['Authorization'] = `Basic ${credentials}`;
      }

      const url = `${apiConfig.baseUrl}${apiConfig.path}`;
      console.log('[TestSkill] 请求URL:', url);
      console.log('[TestSkill] 请求体:', JSON.stringify(body));

      const response = await fetch(url, {
        method: apiConfig.method || 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = await response.json();
      console.log('[TestSkill] 响应:', data);

      // 检查返回状态
      const returnState = data.returnState || data.returnState2;
      if (String(returnState) === '2') {
        // 解析message中的JSON获取count
        let count = 0;
        try {
          const msgData = JSON.parse(data.message);
          count = msgData.count || 0;
        } catch {
          count = data.count || 0;
        }
        setTestResult({
          success: true,
          message: `查询成功！共有 ${count} 条待办`,
          data,
        });
      } else {
        setTestResult({
          success: false,
          message: data.message || data.msg || '查询失败',
          data,
        });
      }
    } catch (error) {
      console.error('[TestSkill] 错误:', error);
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : '请求失败',
      });
    } finally {
      setTestLoading(false);
    }
  };

  // 打开测试对话框
  const openTestDialog = (skill: SkillRecord) => {
    setTestSkill(skill);
    setTestParams({});
    setTestResult(null);
    setTestDialogOpen(true);
  };

  // 切换技能启用状态
  const toggleSkillEnabled = (skillId: string) => {
    const updated = skills.map(s =>
      s.id === skillId ? { ...s, enabled: !s.enabled } : s
    );
    setSkills(updated);

    // 保存自定义技能到本地存储
    const customSkills = updated.filter(s => !s.id.startsWith('ekp-'));
    localStorage.setItem('custom_skills', JSON.stringify(customSkills));
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">技能管理</h1>
          <p className="text-gray-600 mt-1">管理和配置系统中的自定义技能</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          新建技能
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">总技能数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <p className="text-xs text-gray-500 mt-1">包含预置和自定义</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">已启用</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.enabled}</div>
            <p className="text-xs text-gray-500 mt-1">{Math.round((stats.enabled / stats.total) * 100) || 0}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">自定义技能</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.custom}</div>
            <p className="text-xs text-gray-500 mt-1">用户创建</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">EKP配置</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-bold ${ekpConfig?.baseUrl ? 'text-green-600' : 'text-red-600'}`}>
              {ekpConfig?.baseUrl ? '已配置' : '未配置'}
            </div>
            <p className="text-xs text-gray-500 mt-1 truncate">
              {ekpConfig?.baseUrl || '请在集成中心配置EKP'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 搜索栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索技能..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={loadSkills}>
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 技能列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>技能列表</CardTitle>
            <Badge variant="secondary">{filteredSkills.length} 个技能</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : filteredSkills.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>暂无技能</p>
              <p className="text-sm text-gray-400 mt-1">点击上方按钮创建新技能</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>技能名称</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSkills.map((skill) => (
                  <TableRow key={skill.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          skill.id.startsWith('ekp-') ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                        }`}>
                          {skill.id === 'ekp-todo' ? <Bell className="w-5 h-5" /> :
                           skill.id === 'ekp-leave' ? <Calendar className="w-5 h-5" /> :
                           <Sparkles className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="font-medium">{skill.name}</div>
                          <div className="text-xs text-gray-500">{skill.id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                      {skill.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{skill.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSkillEnabled(skill.id)}
                        className={skill.enabled ? 'text-green-600' : 'text-gray-400'}
                      >
                        {skill.enabled ? (
                          <><CheckCircle className="w-4 h-4 mr-1" /> 已启用</>
                        ) : (
                          <><XCircle className="w-4 h-4 mr-1" /> 已禁用</>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openTestDialog(skill)}
                          disabled={!skill.enabled}
                          title="测试技能"
                        >
                          <TestTube className="w-4 h-4 mr-1" />
                          测试
                        </Button>
                        <Button variant="ghost" size="sm" title="编辑">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="删除" className="text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 测试对话框 */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>测试技能 - {testSkill?.name}</DialogTitle>
            <DialogDescription>
              填写参数并测试技能调用是否正常
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 参数输入 */}
            {testSkill?.requestParams?.map((param) => (
              <div key={param.name} className="space-y-2">
                <Label>
                  {param.label}
                  {param.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {param.type === 'enum' ? (
                  <Select
                    value={testParams[param.name] || param.defaultValue || ''}
                    onValueChange={(v) => setTestParams({ ...testParams, [param.name]: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`选择${param.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {param.enumOptions?.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt === '-1' ? '所有已办' :
                           opt === '0' ? '所有待办' :
                           opt === '1' ? '审批类' :
                           opt === '2' ? '通知类' :
                           opt === '3' ? '暂挂类' :
                           opt === '13' ? '审批+暂挂' : opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder={param.placeholder || `输入${param.label}`}
                    value={testParams[param.name] || param.defaultValue || ''}
                    onChange={(e) => setTestParams({ ...testParams, [param.name]: e.target.value })}
                  />
                )}
                {param.description && (
                  <p className="text-xs text-gray-500">{param.description}</p>
                )}
              </div>
            ))}

            {/* 测试结果 */}
            {testResult && (
              <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {testResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {testResult.success ? '测试成功' : '测试失败'}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{testResult.message}</p>
                {testResult.data !== undefined && testResult.data !== null && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer">查看原始响应</summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(testResult.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
              关闭
            </Button>
            <Button onClick={handleTestSkill} disabled={testLoading}>
              {testLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 测试中...</>
              ) : (
                <><Play className="w-4 h-4 mr-2" /> 执行测试</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
