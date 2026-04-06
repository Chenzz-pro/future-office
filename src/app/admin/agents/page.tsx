'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Bot, Search, Settings, X, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentConfig {
  id: string;
  type: string;
  name: string;
  description: string;
  avatar: string;
  systemPrompt: string;
  enabled: boolean;
  skills: string[];
  bots: Array<{ id: string; name: string }>;
}

interface SkillConfig {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
}

// Agent类型映射
const AGENT_TYPES = {
  root: { name: '统筹智能体', description: '负责意图识别、任务分发、结果汇总', emoji: '🎯' },
  approval: { name: '审批智能体', description: '负责待办审批、流程发起、审批查询', emoji: '✅' },
  meeting: { name: '会议智能体', description: '负责会议查询、会议预定、会议通知', emoji: '📅' },
  data: { name: '数据智能体', description: '负责表单查询、统计分析、报表生成', emoji: '📊' },
  assistant: { name: '个人助理智能体', description: '负责日程管理、提醒通知、个人事务', emoji: '🤝' },
};

type ViewMode = 'list' | 'edit';

export default function AgentsManagement() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [skills, setSkills] = useState<SkillConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    avatar: '🤖',
    systemPrompt: '',
    skills: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);

  // 加载Agent列表
  const loadAgents = async () => {
    try {
      const response = await fetch('/api/admin/agents?action=list');
      const data = await response.json();
      if (data.success) {
        setAgents(data.data);
      }
    } catch (error) {
      console.error('加载Agent列表失败:', error);
    }
  };

  // 加载技能列表
  const loadSkills = async () => {
    try {
      const response = await fetch('/api/admin/skills?action=list');
      const data = await response.json();
      if (data.success) {
        setSkills(data.data);
      }
    } catch (error) {
      console.error('加载技能列表失败:', error);
    }
  };

  // 初始化Agent和技能数据
  const handleInitializeAgents = async () => {
    setInitializing(true);
    try {
      const response = await fetch('/api/database/init/agents', {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        alert(`初始化成功！\n创建了 ${data.data.agentsCount} 个智能体\n创建了 ${data.data.skillsCount} 个技能`);
        await loadAgents();
        await loadSkills();
      } else {
        alert(data.error || '初始化失败');
      }
    } catch (error) {
      console.error('初始化Agent失败:', error);
      alert('初始化失败，请检查数据库连接');
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    Promise.all([loadAgents(), loadSkills()]).finally(() => {
      setLoading(false);
    });
  }, []);

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 编辑Agent
  const handleEditAgent = (agent: AgentConfig) => {
    setSelectedAgent(agent);
    setEditForm({
      name: agent.name,
      description: agent.description,
      avatar: agent.avatar,
      systemPrompt: agent.systemPrompt,
      skills: agent.skills || [],
    });
    setViewMode('edit');
  };

  // 保存Agent配置
  const handleSaveAgent = async () => {
    if (!selectedAgent) return;

    setSaving(true);
    try {
      const response = await fetch('/api/admin/agents?action=update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedAgent.type,
          name: editForm.name,
          description: editForm.description,
          avatar: editForm.avatar,
          systemPrompt: editForm.systemPrompt,
          skills: editForm.skills,
          bots: [],
        }),
      });

      const data = await response.json();
      if (data.success) {
        await loadAgents();
        setViewMode('list');
        setSelectedAgent(null);
      } else {
        alert(data.error || '保存失败');
      }
    } catch (error) {
      console.error('保存Agent失败:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 渲染列表视图
  if (viewMode === 'list') {
    return (
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">智能体管理</h1>
            <p className="text-gray-600 mt-1">管理和配置系统中的智能体</p>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">总智能体数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{agents.length}</div>
              <p className="text-xs text-gray-500 mt-1">系统内置智能体</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">运行中</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{agents.filter(a => a.enabled).length}</div>
              <p className="text-xs text-gray-500 mt-1">
                {agents.length > 0 ? `${Math.round(agents.filter(a => a.enabled).length / agents.length * 100)}%` : '0%'} 活跃率
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">可用技能</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{skills.length}</div>
              <p className="text-xs text-gray-500 mt-1">系统技能总数</p>
            </CardContent>
          </Card>
        </div>

        {/* 搜索框 */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索智能体..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* 智能体列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : filteredAgents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无智能体</h3>
              <p className="text-gray-600 mb-4">请先配置数据库连接并初始化智能体</p>
              <Button
                onClick={handleInitializeAgents}
                disabled={initializing}
              >
                {initializing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    初始化中...
                  </>
                ) : (
                  '初始化智能体'
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map((agent) => {
              const typeInfo = AGENT_TYPES[agent.type as keyof typeof AGENT_TYPES];
              return (
                <Card key={agent.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">
                          {agent.avatar}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">{typeInfo?.name || agent.type}</span>
                            {agent.enabled && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                已启用
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{agent.description}</p>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {agent.skills.slice(0, 3).map((skill) => (
                        <span key={skill} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                          {skill}
                        </span>
                      ))}
                      {agent.skills.length > 3 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                          +{agent.skills.length - 3}
                        </span>
                      )}
                    </div>

                    <Button
                      onClick={() => handleEditAgent(agent)}
                      className="w-full"
                      variant="outline"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      配置
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // 渲染编辑视图
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setViewMode('list');
              setSelectedAgent(null);
            }}
          >
            <X className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              配置智能体 - {selectedAgent?.name}
            </h1>
            <p className="text-gray-600 mt-1">配置系统提示词、技能和子Bot</p>
          </div>
        </div>
      </div>

      {/* 表单内容 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-3xl">
                  {editForm.avatar}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{editForm.name}</div>
                  <div className="text-sm text-gray-500">类型: {selectedAgent?.type}</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  描述
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="简单描述这个智能体的功能..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* 系统提示词 */}
          <Card>
            <CardHeader>
              <CardTitle>系统提示词（角色）</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                定义智能体的角色、行为和回复风格
              </p>
              <textarea
                value={editForm.systemPrompt}
                onChange={(e) => setEditForm({ ...editForm, systemPrompt: e.target.value })}
                placeholder="例如：你是一个专业的编程助手，擅长帮助用户解决编程问题。"
                rows={12}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono"
              />
            </CardContent>
          </Card>

          {/* 可调用的技能 */}
          <Card>
            <CardHeader>
              <CardTitle>可调用的技能</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                选择这个智能体可以使用的技能
              </p>
              <div className="space-y-3">
                {skills.map((skill) => (
                  <label
                    key={skill.id}
                    className={cn(
                      'flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all',
                      editForm.skills.includes(skill.code)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={editForm.skills.includes(skill.code)}
                      onChange={(e) => {
                        const newSkills = e.target.checked
                          ? [...editForm.skills, skill.code]
                          : editForm.skills.filter(s => s !== skill.code);
                        setEditForm({ ...editForm, skills: newSkills });
                      }}
                      className="mt-0.5 w-4 h-4"
                    />
                    <div>
                      <div className="font-medium text-sm text-gray-900">{skill.name}</div>
                      <div className="text-xs text-gray-500">{skill.code}</div>
                      <div className="text-xs text-gray-500 mt-1">{skill.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 可调用的子Bot */}
          <Card>
            <CardHeader>
              <CardTitle>可调用的子Bot</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  子Bot配置功能暂未开放，敬请期待...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 保存按钮 */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handleSaveAgent}
                disabled={saving}
                className="w-full"
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
              <Button
                onClick={() => {
                  setViewMode('list');
                  setSelectedAgent(null);
                }}
                variant="outline"
                className="w-full"
                disabled={saving}
              >
                取消
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
