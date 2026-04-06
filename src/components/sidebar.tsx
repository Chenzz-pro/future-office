'use client';

import {
  MessageSquarePlus,
  LayoutDashboard,
  Bot,
  Sparkles,
  History,
  Settings,
  User,
  ChevronRight,
  Key,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserSettingsDialog } from './user-settings-dialog';
import { useChatHistory, ChatSession } from '@/hooks/use-chat-history';

interface ApiKey {
  id: string;
  name: string;
  provider: 'openai' | 'claude' | 'deepseek' | 'doubao' | 'custom';
  apiKey: string;
  baseUrl?: string;
  isActive: boolean;
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  onSelectSession: (session: ChatSession) => void;
}

const menuItems = [
  { id: 'new-chat', label: '新对话', icon: MessageSquarePlus, shortcut: 'Ctrl+K' },
  { id: 'task-center', label: '任务控制中心', icon: LayoutDashboard },
  { id: 'agents', label: '智能体', icon: Bot },
  { id: 'skills', label: '技能', icon: Sparkles },
];

export function Sidebar({ activeTab, setActiveTab, showHistory, setShowHistory, onSelectSession }: SidebarProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [currentUser, setCurrentUser] = useState<{ username: string; role: string } | null>(null);
  const router = useRouter();
  const { sessions, getRecentSessions } = useChatHistory();

  const activeKey = apiKeys.find(k => k.isActive);
  const recentSessions = getRecentSessions(5);

  // 加载 API Keys
  useEffect(() => {
    const savedKeys = localStorage.getItem('ai-api-keys');
    if (savedKeys) {
      try {
        setApiKeys(JSON.parse(savedKeys));
      } catch {
        setApiKeys([]);
      }
    }

    // 加载当前用户信息
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch {
        setCurrentUser(null);
      }
    }
  }, []);

  // 退出登录
  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('current-user-id');
    router.push('/login');
  };

  return (
    <>
      <div className="w-64 h-full bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Logo区域 */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <div>
              <h1 className="font-semibold text-sidebar-foreground">未来办公</h1>
              <p className="text-xs text-muted-foreground">AI 协作平台</p>
            </div>
          </div>
        </div>

        {/* 功能菜单 */}
        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-3 mb-4">
            <p className="text-xs text-muted-foreground px-2 mb-2">功能</p>
            <nav className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                    activeTab === item.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.shortcut && (
                    <span className="text-xs text-muted-foreground bg-sidebar-accent/30 px-1.5 py-0.5 rounded">
                      {item.shortcut}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* 历史对话 */}
          <div className="px-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
            >
              <History className="w-4 h-4" />
              <span className="flex-1 text-left">历史对话</span>
              <ChevronRight className={cn(
                "w-4 h-4 transition-transform",
                showHistory && "rotate-90"
              )} />
            </button>
            
            {showHistory && (
              <div className="mt-2 space-y-1">
                {recentSessions.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">暂无历史对话</p>
                ) : (
                  recentSessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => {
                        setActiveTab('new-chat');
                        onSelectSession(session);
                      }}
                      className="w-full px-3 py-2 text-sm text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/30 rounded-lg text-left truncate transition-colors"
                      title={session.title}
                    >
                      {session.title}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* 底部用户区域 */}
        <div className="p-4 border-t border-sidebar-border">
          {/* API 状态指示 */}
          <div
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg bg-sidebar-accent/30 cursor-pointer hover:bg-sidebar-accent/50 transition-colors"
          >
            <Key className={cn("w-4 h-4", activeKey ? "text-green-500" : "text-muted-foreground")} />
            <span className="text-xs text-muted-foreground">
              {activeKey ? `${activeKey.name} (${activeKey.provider})` : '未配置 API'}
            </span>
          </div>

          {/* 用户信息 */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {currentUser?.username || '用户'}
              </p>
              <p className="text-xs text-muted-foreground">
                {currentUser?.role === 'admin' ? '管理员' : '在线'}
              </p>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 hover:bg-sidebar-accent rounded-lg transition-colors"
              title="设置"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* 设置弹窗 */}
      <UserSettingsDialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onKeysChange={setApiKeys}
      />
    </>
  );
}
