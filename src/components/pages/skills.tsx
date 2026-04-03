'use client';

import { useState, useEffect } from 'react';
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
  ExternalLink,
  Bell,
  Calendar,
  Play,
  Settings,
  Check,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CustomSkillDialog } from '@/components/custom-skill-dialog';
import { CustomSkill } from '@/types/custom-skill';

// 内置技能数据
const builtInSkills = [
  {
    id: 'builtin-1',
    name: '联网搜索',
    description: '实时搜索互联网信息，获取最新资讯和数据',
    icon: Globe,
    category: '信息获取',
    enabled: true,
    source: 'built-in' as const,
  },
  {
    id: 'builtin-2',
    name: '知识库检索',
    description: '从私有知识库中检索相关信息',
    icon: Database,
    category: '信息获取',
    enabled: true,
    source: 'built-in' as const,
  },
  {
    id: 'builtin-3',
    name: '图像生成',
    description: '使用 AI 生成高质量图像',
    icon: Image,
    category: '创作工具',
    enabled: false,
    source: 'built-in' as const,
  },
  {
    id: 'builtin-4',
    name: '代码执行',
    description: '安全执行 Python、JavaScript 等代码',
    icon: Code,
    category: '开发工具',
    enabled: true,
    source: 'built-in' as const,
  },
  {
    id: 'builtin-5',
    name: '文档解析',
    description: '解析 PDF、Word、Excel 等文档格式',
    icon: FileText,
    category: '信息处理',
    enabled: false,
    source: 'built-in' as const,
  },
  {
    id: 'builtin-6',
    name: '数据分析',
    description: '对数据进行统计分析并生成图表',
    icon: Calculator,
    category: '数据分析',
    enabled: true,
    source: 'built-in' as const,
  },
  {
    id: 'builtin-7',
    name: '多语言翻译',
    description: '支持 100+ 种语言的实时翻译',
    icon: Languages,
    category: '语言处理',
    enabled: true,
    source: 'built-in' as const,
  },
];

const categories = ['全部', '信息获取', '创作工具', '开发工具', '信息处理', '数据分析', '语言处理', '自动化', '企业服务'];

// 图标映射
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Globe,
  Database,
  Image,
  FileText,
  Code,
  Calculator,
  Languages,
  Zap,
  Bell,
  Calendar,
};

type ViewMode = 'list' | 'detail';

export function SkillsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [customSkills, setCustomSkills] = useState<CustomSkill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<CustomSkill | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<CustomSkill | null>(null);
  const [executing, setExecuting] = useState(false);
  const [executeResult, setExecuteResult] = useState<{ success: boolean; message: string; data: unknown } | null>(null);

  // 加载自定义技能
  useEffect(() => {
    loadCustomSkills();
  }, []);

  const loadCustomSkills = async () => {
    try {
      const response = await fetch('/api/custom-skill?action=list');
      const data = await response.json();
      if (data.success) {
        setCustomSkills(data.data || []);
      }
    } catch (err) {
      console.error('加载技能失败:', err);
    }
  };

  // 合并内置技能和自定义技能
  const allSkills = [
    ...builtInSkills,
    ...customSkills.map(skill => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      icon: iconMap[skill.icon] || Bell,
      category: skill.category,
      enabled: skill.enabled,
      source: 'custom' as const,
    })),
  ];

  const filteredSkills = allSkills.filter(skill => {
    const matchSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = activeCategory === '全部' || skill.category === activeCategory;
    return matchSearch && matchCategory;
  });

  const toggleSkill = async (id: string) => {
    // 如果是自定义技能，更新状态
    const customSkill = customSkills.find(s => s.id === id);
    if (customSkill) {
      const updatedSkill = { ...customSkill, enabled: !customSkill.enabled };
      await saveCustomSkill(updatedSkill);
    }
  };

  // 保存自定义技能
  const saveCustomSkill = async (skill: CustomSkill) => {
    try {
      const response = await fetch('/api/custom-skill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', skill }),
      });
      const data = await response.json();
      if (data.success) {
        await loadCustomSkills();
      }
    } catch (err) {
      console.error('保存技能失败:', err);
    }
  };

  // 删除自定义技能
  const deleteCustomSkill = async (id: string) => {
    if (!confirm('确定要删除这个技能吗？')) return;
    
    try {
      const response = await fetch('/api/custom-skill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', skillId: id }),
      });
      const data = await response.json();
      if (data.success) {
        await loadCustomSkills();
      }
    } catch (err) {
      console.error('删除技能失败:', err);
    }
  };

  // 执行技能
  const executeSkillAction = async (skill: CustomSkill) => {
    setExecuting(true);
    setExecuteResult(null);
    
    try {
      // 构建默认参数
      const params: Record<string, unknown> = {};
      for (const param of skill.requestParams) {
        if (param.defaultValue !== undefined) {
          params[param.name] = param.defaultValue;
        } else if (param.name === 'loginName' && skill.authConfig.type === 'basic') {
          params[param.name] = skill.authConfig.username;
        }
      }

      const response = await fetch('/api/custom-skill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute',
          skillId: skill.id,
          params,
        }),
      });
      const data = await response.json();
      setExecuteResult(data);
    } catch (err) {
      setExecuteResult({
        success: false,
        message: `执行失败：${err instanceof Error ? err.message : '未知错误'}`,
        data: null,
      });
    } finally {
      setExecuting(false);
    }
  };

  // 打开创建对话框
  const handleCreate = () => {
    setEditingSkill(null);
    setDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEdit = (skill: CustomSkill) => {
    setEditingSkill(skill);
    setDialogOpen(true);
  };

  // 查看技能详情
  const handleViewDetail = (skillId: string) => {
    const skill = customSkills.find(s => s.id === skillId);
    if (skill) {
      setSelectedSkill(skill);
      setViewMode('detail');
      setExecuteResult(null);
    }
  };

  // 保存对话框回调
  const handleDialogSave = async (skill: CustomSkill) => {
    await saveCustomSkill(skill);
    setDialogOpen(false);
    setEditingSkill(null);
  };

  // 渲染详情视图
  if (viewMode === 'detail' && selectedSkill) {
    const Icon = iconMap[selectedSkill.icon] || Bell;
    
    return (
      <div className="h-full flex flex-col bg-background">
        {/* 头部 */}
        <div className="border-b border-border bg-card p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setViewMode('list');
                setSelectedSkill(null);
              }}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                selectedSkill.enabled ? 'bg-primary/10' : 'bg-accent'
              )}>
                <Icon className={cn(
                  'w-6 h-6',
                  selectedSkill.enabled ? 'text-primary' : 'text-muted-foreground'
                )} />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">{selectedSkill.name}</h1>
                <span className="text-sm text-muted-foreground">{selectedSkill.category}</span>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => handleEdit(selectedSkill)}
                className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm"
              >
                <Settings className="w-4 h-4" />
                配置
              </button>
              <button
                onClick={() => executeSkillAction(selectedSkill)}
                disabled={executing || !selectedSkill.enabled}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm disabled:opacity-50"
              >
                {executing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    执行中...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    执行
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* 基本信息 */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-medium mb-3">基本信息</h3>
              <p className="text-sm text-muted-foreground">{selectedSkill.description}</p>
            </div>

            {/* API 配置 */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-medium mb-3">API 配置</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">服务地址：</span>
                  <span className="font-mono">{selectedSkill.apiConfig.baseUrl}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">服务路径：</span>
                  <span className="font-mono">{selectedSkill.apiConfig.path}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">请求方法：</span>
                  {selectedSkill.apiConfig.method}
                </div>
                <div>
                  <span className="text-muted-foreground">Content-Type：</span>
                  {selectedSkill.apiConfig.contentType}
                </div>
              </div>
            </div>

            {/* 请求参数 */}
            {selectedSkill.requestParams.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-medium mb-3">请求参数</h3>
                <div className="space-y-2">
                  {selectedSkill.requestParams.map((param, index) => (
                    <div key={index} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                      <div>
                        <span className="font-medium">{param.label}</span>
                        <span className="text-muted-foreground ml-2">({param.name})</span>
                        {param.required && <span className="text-destructive ml-1">*</span>}
                      </div>
                      <div className="text-muted-foreground">
                        {param.defaultValue ? `默认: ${param.defaultValue}` : '无默认值'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 执行结果 */}
            {executeResult && (
              <div className={cn(
                'bg-card border rounded-lg p-4',
                executeResult.success ? 'border-green-500/50' : 'border-red-500/50'
              )}>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  {executeResult.success ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <Zap className="w-5 h-5 text-red-500" />
                  )}
                  执行结果
                </h3>
                <p className={cn(
                  'text-sm mb-2',
                  executeResult.success ? 'text-green-600' : 'text-red-600'
                )}>
                  {executeResult.message}
                </p>
                {executeResult.data !== null && executeResult.data !== undefined && (
                  <pre className="text-xs bg-accent p-3 rounded overflow-x-auto">
                    {JSON.stringify(executeResult.data, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 渲染列表视图
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
              onClick={handleCreate}
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
              onEdit={() => handleEdit(skill as unknown as CustomSkill)}
              onDelete={() => deleteCustomSkill(skill.id)}
              onViewDetail={() => handleViewDetail(skill.id)}
            />
          ))}
        </div>
      </div>

      {/* 统计信息 */}
      <div className="border-t border-border bg-card/50 px-4 py-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>共 {allSkills.length} 个技能（自定义 {customSkills.length} 个）</span>
          <span>已启用 {allSkills.filter(s => s.enabled).length} 个</span>
        </div>
      </div>

      {/* 创建/编辑对话框 */}
      <CustomSkillDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingSkill(null);
        }}
        onSave={handleDialogSave}
        initialSkill={editingSkill}
      />
    </div>
  );
}

// 技能卡片组件
function SkillCard({ 
  skill, 
  onToggle,
  onEdit,
  onDelete,
  onViewDetail,
}: { 
  skill: {
    id: string;
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    category: string;
    enabled: boolean;
    source: 'built-in' | 'custom';
  };
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewDetail: () => void;
}) {
  const Icon = skill.icon;
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className={cn(
      'bg-card border rounded-xl p-4 transition-all relative group',
      skill.enabled ? 'border-primary/50 shadow-sm' : 'border-border'
    )}>
      {/* 自定义技能的更多操作按钮 */}
      {skill.source === 'custom' && (
        <div className="absolute top-2 right-2">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 hover:bg-accent rounded transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="w-4 h-4 text-muted-foreground" />
          </button>
          
          {showMenu && (
            <div className="absolute top-8 right-0 bg-card border border-border rounded-lg shadow-lg py-1 z-10 min-w-[100px]">
              <button
                onClick={() => {
                  onEdit();
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent flex items-center gap-2"
              >
                <Edit2 className="w-3 h-3" />
                编辑
              </button>
              <button
                onClick={() => {
                  onDelete();
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent text-destructive flex items-center gap-2"
              >
                <Trash2 className="w-3 h-3" />
                删除
              </button>
            </div>
          )}
        </div>
      )}

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
      </div>

      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{skill.description}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-xs px-2 py-0.5 rounded',
            skill.source === 'built-in' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
          )}>
            {skill.source === 'built-in' ? '内置' : '自定义'}
          </span>
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

        {skill.source === 'custom' && (
          <button 
            onClick={onViewDetail}
            className="text-xs text-primary hover:underline"
          >
            查看详情
          </button>
        )}
      </div>
    </div>
  );
}
