'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  Bot,
  Sparkles,
  Users,
  Settings,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Search,
  Bell,
  Database
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  subItems?: SubMenuItem[];
}

interface SubMenuItem {
  id: string;
  label: string;
  path: string;
}

const menuItems: MenuItem[] = [
  {
    id: 'overview',
    label: '系统概览',
    icon: <LayoutDashboard className="w-5 h-5" />,
    path: '/admin/overview',
  },
  {
    id: 'agents',
    label: '智能体',
    icon: <Bot className="w-5 h-5" />,
    path: '/admin/agents',
    subItems: [
      { id: 'agents-list', label: '智能体列表', path: '/admin/agents/list' },
      { id: 'agents-create', label: '创建智能体', path: '/admin/agents/create' },
    ],
  },
  {
    id: 'skills',
    label: '技能',
    icon: <Sparkles className="w-5 h-5" />,
    path: '/admin/skills',
    subItems: [
      { id: 'skills-list', label: '技能列表', path: '/admin/skills/list' },
      { id: 'skills-templates', label: '技能模板', path: '/admin/skills/templates' },
    ],
  },
  {
    id: 'organization',
    label: '组织权限管理',
    icon: <Users className="w-5 h-5" />,
    path: '/admin/organization',
    subItems: [
      { id: 'org-structure', label: '组织架构', path: '/admin/organization/structure' },
      { id: 'org-permissions', label: '权限管理', path: '/admin/organization/permissions' },
    ],
  },
  {
    id: 'integration',
    label: '集成中心',
    icon: <Settings className="w-5 h-5" />,
    path: '/admin/integration',
    subItems: [
      { id: 'int-overview', label: '集成概览', path: '/admin/integration/overview' },
      { id: 'int-llm', label: '大模型配置', path: '/admin/integration/llm' },
      { id: 'int-ekp', label: '蓝凌EKP配置', path: '/admin/integration/ekp' },
      { id: 'int-api', label: 'API 管理', path: '/admin/integration/api' },
      { id: 'int-webhook', label: 'Webhook 配置', path: '/admin/integration/webhook' },
    ],
  },
  {
    id: 'database',
    label: '数据库配置',
    icon: <Database className="w-5 h-5" />,
    path: '/admin/database',
  },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; role: string; email: string } | null>(null);

  useEffect(() => {
    // 检查用户登录状态和角色
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userStr);
    if (user.role !== 'admin') {
      router.push('/');
      return;
    }

    setCurrentUser(user);

    // 自动展开当前路径所在的菜单
    const expanded = new Set<string>();
    menuItems.forEach(item => {
      if (item.subItems && pathname.startsWith(item.path)) {
        expanded.add(item.id);
      }
    });
    setExpandedMenus(expanded);
  }, [router, pathname]);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    router.push('/login');
  };

  const toggleMenu = (menuId: string) => {
    const newExpanded = new Set(expandedMenus);
    if (newExpanded.has(menuId)) {
      newExpanded.delete(menuId);
    } else {
      newExpanded.add(menuId);
    }
    setExpandedMenus(newExpanded);
  };

  const isActive = (path: string) => {
    if (path === pathname) return true;
    return pathname.startsWith(path + '/');
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 左侧侧边栏 */}
      <aside
        className={cn(
          'bg-slate-900 text-slate-300 flex flex-col transition-all duration-300',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span className="font-semibold text-white">未来办公</span>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {sidebarCollapsed ? (
              <Menu className="w-5 h-5" />
            ) : (
              <X className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* 菜单 */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-2">
            {menuItems.map((item) => (
              <div key={item.id}>
                <button
                  onClick={() => item.subItems ? toggleMenu(item.id) : router.push(item.path)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors',
                    isActive(item.path) && !item.subItems
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-slate-800'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    {!sidebarCollapsed && <span className="font-medium text-sm">{item.label}</span>}
                  </div>
                  {item.subItems && !sidebarCollapsed && (
                    <ChevronRight
                      className={cn(
                        'w-4 h-4 transition-transform',
                        expandedMenus.has(item.id) && 'rotate-90'
                      )}
                    />
                  )}
                </button>

                {/* 子菜单 */}
                {item.subItems && expandedMenus.has(item.id) && !sidebarCollapsed && (
                  <div className="mt-1 ml-4 space-y-1">
                    {item.subItems.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => router.push(subItem.path)}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                          pathname === subItem.path
                            ? 'bg-blue-600/20 text-blue-400'
                            : 'hover:bg-slate-800'
                        )}
                      >
                        {subItem.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </ScrollArea>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部导航栏 */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">系统管理后台</h1>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-gray-600">
              <Search className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-600">
              <Bell className="w-5 h-5" />
            </Button>

            <div className="h-8 w-px bg-gray-200" />

            <div className="flex items-center gap-3">
              <Avatar className="w-9 h-9 bg-blue-600">
                <AvatarFallback className="text-white font-medium">
                  {currentUser.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900">{currentUser.username}</p>
                <p className="text-xs text-gray-500">管理员</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-gray-600 hover:text-red-600"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* 内容区域 */}
        <main className="flex-1 overflow-auto p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
