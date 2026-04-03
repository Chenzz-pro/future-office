'use client';

import { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Clock, 
  Users,
  Circle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Play
} from 'lucide-react';

interface TeamMember {
  id: number;
  name: string;
  role: string;
  avatar: string;
  online: boolean;
}

interface Task {
  id: number;
  title: string;
  description: string;
  assignee: string;
  status: 'planned' | 'assigned' | 'in-progress' | 'review' | 'completed';
  progress: number;
  tags: string[];
  category: string;
}

const teamMembers: TeamMember[] = [
  { id: 1, name: 'Leo', role: 'CEO', avatar: '🦁', online: true },
  { id: 2, name: '思远', role: 'CSO 首席战略官', avatar: '🎯', online: true },
  { id: 3, name: '剑锋', role: 'COO', avatar: '⚔️', online: true },
  { id: 4, name: '武承泽', role: 'CFO', avatar: '💰', online: false },
  { id: 5, name: '林诗瑶', role: 'CMO', avatar: '📢', online: true },
  { id: 6, name: '素素', role: '设计师', avatar: '🎨', online: false },
  { id: 7, name: '星野', role: '内容运营', avatar: '✨', online: true },
  { id: 8, name: '顾景行', role: '产品经理', avatar: '🧭', online: true },
];

const tasks: Task[] = [
  {
    id: 1,
    title: '今日内容发布',
    description: '发布社交媒体内容',
    assignee: '星野',
    status: 'planned',
    progress: 0,
    tags: ['内容', '发布'],
    category: '营销',
  },
  {
    id: 2,
    title: '紧急需求变更评审',
    description: '临时插入紧急需求，需要变更评审',
    assignee: '顾景行',
    status: 'planned',
    progress: 0,
    tags: ['需求', '变更', '紧急'],
    category: '产品',
  },
  {
    id: 3,
    title: '首页加载超时处理',
    description: '首屏加载超过3秒，需紧急优化',
    assignee: '恒岳',
    status: 'in-progress',
    progress: 57,
    tags: ['性能', '延期', '阻塞'],
    category: '开发',
  },
  {
    id: 4,
    title: '用户反馈汇总',
    description: '汇总用户反馈建议',
    assignee: '顾景行',
    status: 'in-progress',
    progress: 32,
    tags: ['反馈'],
    category: '产品',
  },
  {
    id: 5,
    title: '系统监控检查',
    description: '检查系统运行状态',
    assignee: '陈志宇',
    status: 'review',
    progress: 99,
    tags: ['运维', '监控'],
    category: '开发',
  },
  {
    id: 6,
    title: '系统监测试验证',
    description: '验证系统监控功能正常工作',
    assignee: '张强',
    status: 'review',
    progress: 95,
    tags: ['测试'],
    category: '测试',
  },
];

const statusConfig = {
  planned: { label: '计划中', color: 'bg-yellow-500', textColor: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  assigned: { label: '已分配', color: 'bg-blue-500', textColor: 'text-blue-600', bgColor: 'bg-blue-50' },
  'in-progress': { label: '执行中', color: 'bg-orange-500', textColor: 'text-orange-600', bgColor: 'bg-orange-50' },
  review: { label: '审核中', color: 'bg-purple-500', textColor: 'text-purple-600', bgColor: 'bg-purple-50' },
  completed: { label: '已完成', color: 'bg-green-500', textColor: 'text-green-600', bgColor: 'bg-green-50' },
};

export function TaskCenterPage() {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('zh-CN', { hour12: false }));
      setCurrentDate(now.toLocaleDateString('zh-CN', { 
        month: 'long', 
        day: 'numeric', 
        weekday: 'long' 
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const onlineCount = teamMembers.filter(m => m.online).length;
  const plannedCount = tasks.filter(t => t.status === 'planned').length;
  const assignedCount = tasks.filter(t => t.status === 'assigned').length;
  const inProgressCount = tasks.filter(t => t.status === 'in-progress').length;
  const reviewCount = tasks.filter(t => t.status === 'review').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* 顶部信息栏 */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="text-2xl font-mono font-semibold text-foreground">
                {currentTime}
              </div>
              <div className="text-sm text-muted-foreground">
                {currentDate}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">28s</span>
              <button className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                <RefreshCw className="w-4 h-4" />
                刷新
              </button>
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Circle className="w-2 h-2 fill-current" />
                在线
              </div>
            </div>
          </div>

          {/* 统计卡片 */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            <StatCard 
              icon={Users} 
              value={onlineCount} 
              label="活跃成员" 
              color="bg-yellow-100 text-yellow-700" 
            />
            <StatCard value={plannedCount} label="计划中" color="bg-yellow-50 text-yellow-600" />
            <StatCard value={assignedCount} label="已分配" color="bg-blue-50 text-blue-600" />
            <StatCard value={inProgressCount} label="执行中" color="bg-orange-50 text-orange-600" />
            <StatCard value={reviewCount} label="审核中" color="bg-purple-50 text-purple-600" />
            <StatCard value={completedCount} label="已完成" color="bg-green-50 text-green-600" />
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="p-4 flex gap-4">
        {/* 左侧团队成员 */}
        <div className="w-64 shrink-0">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">项目AI团队成员</h3>
              <span className="text-sm text-muted-foreground">{teamMembers.length}</span>
            </div>
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-xl">
                      {member.avatar}
                    </div>
                    {member.online && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧任务看板 */}
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 min-w-max">
            {/* 计划中 */}
            <TaskColumn 
              title="计划中" 
              count={plannedCount} 
              status="planned"
              tasks={tasks.filter(t => t.status === 'planned')}
            />
            {/* 已分配 */}
            <TaskColumn 
              title="已分配" 
              count={assignedCount} 
              status="assigned"
              tasks={tasks.filter(t => t.status === 'assigned')}
            />
            {/* 执行中 */}
            <TaskColumn 
              title="执行中" 
              count={inProgressCount} 
              status="in-progress"
              tasks={tasks.filter(t => t.status === 'in-progress')}
            />
            {/* 审核中 */}
            <TaskColumn 
              title="审核中" 
              count={reviewCount} 
              status="review"
              tasks={tasks.filter(t => t.status === 'review')}
            />
            {/* 已完成 */}
            <TaskColumn 
              title="已完成" 
              count={completedCount} 
              status="completed"
              tasks={tasks.filter(t => t.status === 'completed')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ 
  icon: Icon, 
  value, 
  label, 
  color 
}: { 
  icon?: React.ComponentType<{ className?: string }>; 
  value: number; 
  label: string; 
  color: string;
}) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${color}`}>
      {Icon && <Icon className="w-4 h-4" />}
      <span className="font-semibold">{value}</span>
      <span className="text-sm">{label}</span>
    </div>
  );
}

function TaskColumn({ 
  title, 
  count, 
  status, 
  tasks 
}: { 
  title: string; 
  count: number; 
  status: Task['status'];
  tasks: Task[];
}) {
  const config = statusConfig[status];

  return (
    <div className="w-72 shrink-0">
      <div className="bg-card border border-border rounded-xl">
        <div className={`p-3 border-b border-border ${config.bgColor}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${config.color}`} />
              <span className={`font-medium ${config.textColor}`}>{title}</span>
            </div>
            <span className="text-sm text-muted-foreground">{count}</span>
          </div>
        </div>
        <div className="p-3 space-y-3 min-h-[200px]">
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              暂无任务
            </div>
          ) : (
            tasks.map((task) => <TaskCard key={task.id} task={task} />)
          )}
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const config = statusConfig[task.status];

  return (
    <div className="bg-background border border-border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-medium text-foreground flex-1">{task.title}</h4>
        <span className={`text-xs px-2 py-0.5 rounded ${config.bgColor} ${config.textColor}`}>
          {task.assignee}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{task.description}</p>
      
      {task.progress > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">进度</span>
            <span className="font-medium">{task.progress}%</span>
          </div>
          <div className="h-1.5 bg-accent rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map((tag, index) => (
            <span 
              key={index} 
              className="text-xs px-2 py-0.5 bg-accent text-accent-foreground rounded"
            >
              {tag}
            </span>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{task.category}</span>
      </div>
    </div>
  );
}
