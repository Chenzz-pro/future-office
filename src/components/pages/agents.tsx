'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Bot,
  Settings,
  MessageSquare,
  ArrowLeft,
  Edit2,
  Trash2,
  Copy,
  MoreVertical,
  Save,
  X,
  ChevronRight,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  createdAt: Date;
  updatedAt: Date;
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

export function AgentsPage() {
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
    bots: [] as Array<{ id: string; name: string }>,
  });
  const [saving, setSaving] = useState(false);

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
      bots: agent.bots || [],
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
          bots: editForm.bots,
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
      <div className="h-full flex flex-col bg-background">
        {/* 头部 */}
        <div className="border-b border-border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">智能体</h1>
              <p className="text-sm text-muted-foreground mt-1">管理和配置您的 AI 智能体</p>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索智能体..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* 智能体列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">暂无智能体</h3>
              <p className="text-sm text-muted-foreground">请在数据库中配置智能体</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onEdit={() => handleEditAgent(agent)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 渲染编辑视图
  return (
    <>
      <div className="h-full flex flex-col bg-background">
        {/* 头部 */}
        <div className="border-b border-border bg-card p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setViewMode('list');
                setSelectedAgent(null);
              }}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                配置智能体 - {selectedAgent?.name}
              </h1>
              <p className="text-sm text-muted-foreground">配置系统提示词、技能和子Bot</p>
            </div>
          </div>
        </div>

        {/* 表单内容 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* 基本信息 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground">基本信息</h3>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center text-3xl">
                  {editForm.avatar}
                </div>
                <div>
                  <div className="font-medium text-foreground">{editForm.name}</div>
                  <div className="text-sm text-muted-foreground">类型: {selectedAgent?.type}</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  描述
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="简单描述这个智能体的功能..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>
            </div>

            {/* 系统提示词 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground">系统提示词（角色）</h3>
              <p className="text-sm text-muted-foreground">
                定义智能体的角色、行为和回复风格
              </p>
              <textarea
                value={editForm.systemPrompt}
                onChange={(e) => setEditForm({ ...editForm, systemPrompt: e.target.value })}
                placeholder="例如：你是一个专业的编程助手，擅长帮助用户解决编程问题。"
                rows={12}
                className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none font-mono"
              />
            </div>

            {/* 可调用的技能 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground">可调用的技能</h3>
              <p className="text-sm text-muted-foreground">
                选择这个智能体可以使用的技能
              </p>
              <div className="grid grid-cols-1 gap-3">
                {skills.map((skill) => (
                  <label
                    key={skill.id}
                    className={cn(
                      'flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all',
                      editForm.skills.includes(skill.code)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
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
                      <div className="font-medium text-sm">{skill.name}</div>
                      <div className="text-xs text-muted-foreground">{skill.code}</div>
                      <div className="text-xs text-muted-foreground mt-1">{skill.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 可调用的子Bot */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground">可调用的子Bot</h3>
              <p className="text-sm text-muted-foreground">
                配置这个智能体可以调用的子Bot（可选）
              </p>
              <div className="bg-accent/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  子Bot配置功能暂未开放，敬请期待...
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="border-t border-border bg-card p-4">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => {
                setViewMode('list');
                setSelectedAgent(null);
              }}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              disabled={saving}
            >
              取消
            </button>
            <button
              onClick={handleSaveAgent}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  保存配置
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// 智能体卡片组件
function AgentCard({
  agent,
  onEdit,
}: {
  agent: AgentConfig;
  onEdit: () => void;
}) {
  const typeInfo = AGENT_TYPES[agent.type as keyof typeof AGENT_TYPES];

  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:shadow-lg transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-2xl">
            {agent.avatar}
          </div>
          <div>
            <h3 className="font-medium text-foreground">{agent.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">{typeInfo?.name || agent.type}</span>
              {agent.enabled && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                  已启用
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{agent.description}</p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {agent.skills.slice(0, 3).map((skill) => (
          <span key={skill} className="px-2 py-0.5 bg-accent text-accent-foreground rounded text-xs">
            {skill}
          </span>
        ))}
        {agent.skills.length > 3 && (
          <span className="px-2 py-0.5 bg-accent text-accent-foreground rounded text-xs">
            +{agent.skills.length - 3}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm"
        >
          <Settings className="w-4 h-4" />
          配置
        </button>
      </div>
    </div>
  );
}
