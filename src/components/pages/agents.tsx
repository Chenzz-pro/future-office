'use client';

import { useState } from 'react';
import { 
  Plus, 
  Search, 
  Bot, 
  Settings, 
  MessageSquare, 
  Sparkles,
  ArrowLeft,
  Upload,
  Mic,
  Globe,
  Database,
  Zap,
  ChevronRight,
  MoreVertical,
  Play,
  Edit2,
  Trash2,
  Copy,
  Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Agent {
  id: string;
  name: string;
  description: string;
  avatar: string;
  model: string;
  capabilities: string[];
  createdAt: string;
  status: 'draft' | 'published' | 'testing';
}

// 模拟智能体数据
const mockAgents: Agent[] = [
  {
    id: '1',
    name: 'AI 编程助手',
    description: '专业的编程助手，支持多种编程语言，能够帮助您编写、调试和优化代码',
    avatar: '👨‍💻',
    model: 'GPT-4',
    capabilities: ['代码生成', '代码审查', 'Bug 修复'],
    createdAt: '2026-03-28',
    status: 'published',
  },
  {
    id: '2',
    name: '文案创作大师',
    description: '擅长各类文案创作，包括营销文案、产品描述、社交媒体内容等',
    avatar: '✍️',
    model: 'GPT-4',
    capabilities: ['文案创作', '内容优化', 'SEO 建议'],
    createdAt: '2026-03-25',
    status: 'published',
  },
  {
    id: '3',
    name: '数据分析专家',
    description: '帮助您进行数据分析、生成可视化图表、解读数据趋势',
    avatar: '📊',
    model: 'Claude 3',
    capabilities: ['数据分析', '图表生成', '报告撰写'],
    createdAt: '2026-03-20',
    status: 'draft',
  },
];

type ViewMode = 'list' | 'create' | 'edit' | 'detail';

export function AgentsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [agents, setAgents] = useState<Agent[]>(mockAgents);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    avatar: '🤖',
    model: 'GPT-4',
    prompt: '',
    welcomeMessage: '',
    capabilities: [] as string[],
  });

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 创建智能体流程
  const handleCreateAgent = () => {
    setViewMode('create');
    setCurrentStep(0);
    setCreateForm({
      name: '',
      description: '',
      avatar: '🤖',
      model: 'GPT-4',
      prompt: '',
      welcomeMessage: '',
      capabilities: [],
    });
  };

  const handleSaveAgent = () => {
    const newAgent: Agent = {
      id: Date.now().toString(),
      name: createForm.name,
      description: createForm.description,
      avatar: createForm.avatar,
      model: createForm.model,
      capabilities: createForm.capabilities,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'draft',
    };
    setAgents([newAgent, ...agents]);
    setViewMode('list');
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
              <p className="text-sm text-muted-foreground mt-1">创建和管理您的 AI 智能体</p>
            </div>
            <button
              onClick={handleCreateAgent}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              创建智能体
            </button>
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
          {filteredAgents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">暂无智能体</h3>
              <p className="text-sm text-muted-foreground mb-4">创建您的第一个智能体，开启 AI 之旅</p>
              <button
                onClick={handleCreateAgent}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                创建智能体
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onEdit={() => {
                    setSelectedAgent(agent);
                    setViewMode('edit');
                  }}
                  onDelete={() => {
                    setAgents(agents.filter(a => a.id !== agent.id));
                  }}
                  onChat={() => {
                    setSelectedAgent(agent);
                    setViewMode('detail');
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 渲染创建/编辑视图
  return (
    <div className="h-full flex flex-col bg-background">
      {/* 头部 */}
      <div className="border-b border-border bg-card p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setViewMode('list')}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {viewMode === 'create' ? '创建智能体' : '编辑智能体'}
            </h1>
            <p className="text-sm text-muted-foreground">配置您的 AI 智能体</p>
          </div>
        </div>
      </div>

      {/* 步骤指示器 */}
      <div className="border-b border-border bg-card/50 px-4 py-3">
        <div className="flex items-center gap-2">
          {['基础配置', '人设与回复逻辑', '技能与工具', '预览与发布'].map((step, index) => (
            <div key={step} className="flex items-center">
              <div
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors',
                  currentStep === index
                    ? 'bg-primary text-primary-foreground'
                    : currentStep > index
                    ? 'bg-primary/20 text-primary'
                    : 'bg-accent text-muted-foreground'
                )}
              >
                <span className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-xs',
                  currentStep >= index ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}>
                  {index + 1}
                </span>
                {step}
              </div>
              {index < 3 && <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />}
            </div>
          ))}
        </div>
      </div>

      {/* 表单内容 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {/* 步骤 1: 基础配置 */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  智能体头像
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-accent flex items-center justify-center text-4xl cursor-pointer hover:bg-accent/80 transition-colors">
                    {createForm.avatar}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">选择表情或上传图片</p>
                    <div className="flex gap-2">
                      {['🤖', '👨‍💻', '👩‍💼', '🎨', '📊', '🚀', '💡', '🎯'].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => setCreateForm({ ...createForm, avatar: emoji })}
                          className={cn(
                            'w-10 h-10 rounded-lg text-xl hover:bg-accent transition-colors',
                            createForm.avatar === emoji ? 'bg-primary/20 ring-2 ring-primary' : 'bg-accent/50'
                          )}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  智能体名称 <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="为您的智能体起个名字"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  简介
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="简单描述这个智能体的功能..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  模型选择
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'GPT-4', name: 'GPT-4', desc: '最强推理能力' },
                    { id: 'Claude 3', name: 'Claude 3', desc: '擅长长文本' },
                    { id: 'GPT-3.5', name: 'GPT-3.5', desc: '快速响应' },
                  ].map((model) => (
                    <button
                      key={model.id}
                      onClick={() => setCreateForm({ ...createForm, model: model.id })}
                      className={cn(
                        'p-3 rounded-lg border text-left transition-all',
                        createForm.model === model.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <div className="font-medium text-sm">{model.name}</div>
                      <div className="text-xs text-muted-foreground">{model.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 步骤 2: 人设与回复逻辑 */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  人设与回复逻辑 <span className="text-destructive">*</span>
                </label>
                <p className="text-sm text-muted-foreground mb-3">
                  定义智能体的角色、行为和回复风格
                </p>
                <textarea
                  value={createForm.prompt}
                  onChange={(e) => setCreateForm({ ...createForm, prompt: e.target.value })}
                  placeholder="例如：你是一个专业的编程助手，擅长帮助用户解决编程问题。你的回复应该：
1. 简洁明了，重点突出
2. 提供代码示例
3. 解释关键概念
4. 给出最佳实践建议"
                  rows={10}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  开场白
                </label>
                <textarea
                  value={createForm.welcomeMessage}
                  onChange={(e) => setCreateForm({ ...createForm, welcomeMessage: e.target.value })}
                  placeholder="智能体第一次对话时的问候语..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              <div className="bg-accent/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-foreground mb-2">提示词模板</h4>
                <div className="space-y-2">
                  {[
                    { name: '编程助手', prompt: '你是一个专业的编程助手...' },
                    { name: '文案写作', prompt: '你是一个创意文案撰写专家...' },
                    { name: '客服助手', prompt: '你是一个友好的客服助手...' },
                  ].map((template) => (
                    <button
                      key={template.name}
                      onClick={() => setCreateForm({ ...createForm, prompt: template.prompt })}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors"
                    >
                      <span className="font-medium">{template.name}</span>
                      <span className="text-muted-foreground ml-2">- {template.prompt.slice(0, 30)}...</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 步骤 3: 技能与工具 */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  选择能力
                </label>
                <p className="text-sm text-muted-foreground mb-3">
                  为智能体配置专业能力
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'web-search', name: '联网搜索', icon: Globe, desc: '实时搜索互联网信息' },
                    { id: 'code-exec', name: '代码执行', icon: Play, desc: '运行代码并返回结果' },
                    { id: 'knowledge', name: '知识库', icon: Database, desc: '访问私有知识库' },
                    { id: 'image-gen', name: '图像生成', icon: Sparkles, desc: '生成AI图像' },
                    { id: 'voice', name: '语音交互', icon: Mic, desc: '支持语音输入输出' },
                    { id: 'workflow', name: '工作流', icon: Zap, desc: '执行自动化工作流' },
                  ].map((cap) => (
                    <button
                      key={cap.id}
                      onClick={() => {
                        const caps = createForm.capabilities.includes(cap.id)
                          ? createForm.capabilities.filter(c => c !== cap.id)
                          : [...createForm.capabilities, cap.id];
                        setCreateForm({ ...createForm, capabilities: caps });
                      }}
                      className={cn(
                        'flex items-start gap-3 p-4 rounded-lg border text-left transition-all',
                        createForm.capabilities.includes(cap.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <cap.icon className={cn(
                        'w-5 h-5 mt-0.5',
                        createForm.capabilities.includes(cap.id) ? 'text-primary' : 'text-muted-foreground'
                      )} />
                      <div>
                        <div className="font-medium text-sm">{cap.name}</div>
                        <div className="text-xs text-muted-foreground">{cap.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 步骤 4: 预览与发布 */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center text-3xl">
                    {createForm.avatar}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{createForm.name || '未命名智能体'}</h3>
                    <p className="text-sm text-muted-foreground">{createForm.model}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {createForm.description || '暂无简介'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {createForm.capabilities.map((cap) => (
                    <span key={cap} className="px-2 py-1 bg-accent text-accent-foreground rounded text-xs">
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-accent/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-foreground mb-3">发布设置</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" name="publish" defaultChecked className="w-4 h-4" />
                    <div>
                      <div className="text-sm font-medium">仅自己可见</div>
                      <div className="text-xs text-muted-foreground">只有您可以与智能体对话</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" name="publish" className="w-4 h-4" />
                    <div>
                      <div className="text-sm font-medium">团队可见</div>
                      <div className="text-xs text-muted-foreground">团队成员可以使用</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" name="publish" className="w-4 h-4" />
                    <div>
                      <div className="text-sm font-medium">公开发布</div>
                      <div className="text-xs text-muted-foreground">所有人都可以发现和使用</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="border-t border-border bg-card p-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            上一步
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('list')}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              取消
            </button>
            {currentStep < 3 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                下一步
              </button>
            ) : (
              <button
                onClick={handleSaveAgent}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                创建智能体
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 智能体卡片组件
function AgentCard({ 
  agent, 
  onEdit, 
  onDelete, 
  onChat 
}: { 
  agent: Agent; 
  onEdit: () => void; 
  onDelete: () => void;
  onChat: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

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
              <span className="text-xs text-muted-foreground">{agent.model}</span>
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded',
                agent.status === 'published' ? 'bg-green-100 text-green-700' :
                agent.status === 'testing' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              )}>
                {agent.status === 'published' ? '已发布' : agent.status === 'testing' ? '测试中' : '草稿'}
              </span>
            </div>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 hover:bg-accent rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="w-4 h-4 text-muted-foreground" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-card border border-border rounded-lg shadow-lg py-1 z-10">
              <button
                onClick={() => { onEdit(); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <Edit2 className="w-4 h-4" /> 编辑
              </button>
              <button
                onClick={() => setShowMenu(false)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <Copy className="w-4 h-4" /> 复制
              </button>
              <button
                onClick={() => { onDelete(); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors"
              >
                <Trash2 className="w-4 h-4" /> 删除
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{agent.description}</p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {agent.capabilities.slice(0, 3).map((cap) => (
          <span key={cap} className="px-2 py-0.5 bg-accent text-accent-foreground rounded text-xs">
            {cap}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onChat}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
        >
          <MessageSquare className="w-4 h-4" />
          对话
        </button>
        <button
          onClick={onEdit}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm"
        >
          <Settings className="w-4 h-4" />
          配置
        </button>
      </div>
    </div>
  );
}
