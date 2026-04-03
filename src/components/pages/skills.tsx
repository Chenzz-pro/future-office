'use client';

import { useState } from 'react';
import { 
  Plus, 
  Search, 
  Sparkles,
  ArrowLeft,
  Globe,
  Database,
  Zap,
  Image,
  FileText,
  Code,
  Calculator,
  Languages,
  MoreVertical,
  Edit2,
  Trash2,
  Power,
  PowerOff,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Skill {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  enabled: boolean;
  source: 'built-in' | 'custom';
}

// 模拟技能数据
const mockSkills: Skill[] = [
  {
    id: '1',
    name: '联网搜索',
    description: '实时搜索互联网信息，获取最新资讯和数据',
    icon: Globe,
    category: '信息获取',
    enabled: true,
    source: 'built-in',
  },
  {
    id: '2',
    name: '知识库检索',
    description: '从私有知识库中检索相关信息',
    icon: Database,
    category: '信息获取',
    enabled: true,
    source: 'built-in',
  },
  {
    id: '3',
    name: '图像生成',
    description: '使用 AI 生成高质量图像',
    icon: Image,
    category: '创作工具',
    enabled: false,
    source: 'built-in',
  },
  {
    id: '4',
    name: '代码执行',
    description: '安全执行 Python、JavaScript 等代码',
    icon: Code,
    category: '开发工具',
    enabled: true,
    source: 'built-in',
  },
  {
    id: '5',
    name: '文档解析',
    description: '解析 PDF、Word、Excel 等文档格式',
    icon: FileText,
    category: '信息处理',
    enabled: false,
    source: 'built-in',
  },
  {
    id: '6',
    name: '数据分析',
    description: '对数据进行统计分析并生成图表',
    icon: Calculator,
    category: '数据分析',
    enabled: true,
    source: 'built-in',
  },
  {
    id: '7',
    name: '多语言翻译',
    description: '支持 100+ 种语言的实时翻译',
    icon: Languages,
    category: '语言处理',
    enabled: true,
    source: 'built-in',
  },
  {
    id: '8',
    name: '工作流引擎',
    description: '执行自定义自动化工作流',
    icon: Zap,
    category: '自动化',
    enabled: false,
    source: 'custom',
  },
];

const categories = ['全部', '信息获取', '创作工具', '开发工具', '信息处理', '数据分析', '语言处理', '自动化'];

type ViewMode = 'list' | 'create';

export function SkillsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [skills, setSkills] = useState<Skill[]>(mockSkills);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    category: '信息获取',
    apiUrl: '',
    apiKey: '',
  });

  const filteredSkills = skills.filter(skill => {
    const matchSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = activeCategory === '全部' || skill.category === activeCategory;
    return matchSearch && matchCategory;
  });

  const toggleSkill = (id: string) => {
    setSkills(skills.map(skill =>
      skill.id === id ? { ...skill, enabled: !skill.enabled } : skill
    ));
  };

  // 渲染列表视图
  if (viewMode === 'list') {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* 头部 */}
        <div className="border-b border-border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">技能</h1>
              <p className="text-sm text-muted-foreground mt-1">管理和配置 AI 技能能力</p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://www.coze.cn/store/plugin"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-accent transition-colors text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                探索更多技能
              </a>
              <button
                onClick={() => setViewMode('create')}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                创建技能
              </button>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索技能..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* 分类标签 */}
        <div className="border-b border-border bg-card/50 px-4 py-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors',
                  activeCategory === category
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-accent text-muted-foreground hover:text-foreground'
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* 技能列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSkills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                onToggle={() => toggleSkill(skill.id)}
              />
            ))}
          </div>
        </div>

        {/* 统计信息 */}
        <div className="border-t border-border bg-card/50 px-4 py-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>共 {skills.length} 个技能</span>
            <span>已启用 {skills.filter(s => s.enabled).length} 个</span>
          </div>
        </div>
      </div>
    );
  }

  // 渲染创建视图
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
            <h1 className="text-xl font-semibold text-foreground">创建自定义技能</h1>
            <p className="text-sm text-muted-foreground">接入您的 API 作为智能体的技能</p>
          </div>
        </div>
      </div>

      {/* 表单内容 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              技能名称 <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="为您的技能起个名字"
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              技能描述
            </label>
            <textarea
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              placeholder="描述这个技能的功能..."
              rows={3}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              分类
            </label>
            <select
              value={createForm.category}
              onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {categories.filter(c => c !== '全部').map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              API 接口地址 <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={createForm.apiUrl}
              onChange={(e) => setCreateForm({ ...createForm, apiUrl: e.target.value })}
              placeholder="https://api.example.com/endpoint"
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              API Key
            </label>
            <input
              type="password"
              value={createForm.apiKey}
              onChange={(e) => setCreateForm({ ...createForm, apiKey: e.target.value })}
              placeholder="输入 API 密钥"
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-xs text-muted-foreground mt-1">
              API Key 将被安全存储，不会暴露给用户
            </p>
          </div>

          <div className="bg-accent/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-foreground mb-2">API 配置说明</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• 支持 REST API 接口，请求方式为 POST</li>
              <li>• 请求体将包含用户消息和相关上下文</li>
              <li>• 响应应为 JSON 格式，包含 result 字段</li>
              <li>• 建议接口响应时间小于 10 秒</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="border-t border-border bg-card p-4">
        <div className="flex items-center justify-end gap-3 max-w-2xl mx-auto">
          <button
            onClick={() => setViewMode('list')}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => {
              const newSkill: Skill = {
                id: Date.now().toString(),
                name: createForm.name,
                description: createForm.description,
                icon: Zap,
                category: createForm.category,
                enabled: false,
                source: 'custom',
              };
              setSkills([newSkill, ...skills]);
              setViewMode('list');
            }}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            创建技能
          </button>
        </div>
      </div>
    </div>
  );
}

// 技能卡片组件
function SkillCard({ 
  skill, 
  onToggle 
}: { 
  skill: Skill; 
  onToggle: () => void;
}) {
  const Icon = skill.icon;

  return (
    <div className={cn(
      'bg-card border rounded-xl p-4 transition-all',
      skill.enabled ? 'border-primary/50 shadow-sm' : 'border-border'
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            skill.enabled ? 'bg-primary/10' : 'bg-accent'
          )}>
            <Icon className={cn(
              'w-5 h-5',
              skill.enabled ? 'text-primary' : 'text-muted-foreground'
            )} />
          </div>
          <div>
            <h3 className="font-medium text-foreground text-sm">{skill.name}</h3>
            <span className="text-xs text-muted-foreground">{skill.category}</span>
          </div>
        </div>
        <button
          onClick={onToggle}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
            skill.enabled
              ? 'bg-primary/10 text-primary'
              : 'bg-accent text-muted-foreground hover:bg-accent/80'
          )}
        >
          {skill.enabled ? (
            <>
              <Power className="w-3 h-3" />
              已启用
            </>
          ) : (
            <>
              <PowerOff className="w-3 h-3" />
              未启用
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{skill.description}</p>

      <div className="flex items-center justify-between">
        <span className={cn(
          'text-xs px-2 py-0.5 rounded',
          skill.source === 'built-in' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
        )}>
          {skill.source === 'built-in' ? '内置' : '自定义'}
        </span>
        <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          查看详情
        </button>
      </div>
    </div>
  );
}
