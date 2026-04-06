'use client';

import { NewChatPage } from './pages/new-chat';
import { TaskCenterPage } from './pages/task-center';
import { AgentsPage } from './pages/agents';
import { SkillsPage } from './pages/skills';

interface MainContentProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onNewChat?: () => void;
  selectedSessionId?: string | null;
}

export function MainContent({ activeTab, setActiveTab, onNewChat, selectedSessionId }: MainContentProps) {
  const renderContent = () => {
    switch (activeTab) {
      case 'new-chat':
        // 移除 key，避免组件重新创建导致状态丢失
        return <NewChatPage />;
      case 'task-center':
        return <TaskCenterPage />;
      case 'agents':
        return <AgentsPage />;
      case 'skills':
        return <SkillsPage />;
      default:
        return <NewChatPage />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* 顶部标签栏 */}
      <div className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="flex items-center h-12 px-4">
          <div className="flex items-center gap-1">
            <TabButton 
              active={activeTab === 'new-chat'} 
              onClick={() => setActiveTab('new-chat')}
            >
              新对话
            </TabButton>
            <TabButton 
              active={activeTab === 'task-center'} 
              onClick={() => setActiveTab('task-center')}
            >
              任务控制中心
            </TabButton>
            <TabButton 
              active={activeTab === 'agents'} 
              onClick={() => setActiveTab('agents')}
            >
              智能体
            </TabButton>
            <TabButton 
              active={activeTab === 'skills'} 
              onClick={() => setActiveTab('skills')}
            >
              技能
            </TabButton>
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}

function TabButton({ 
  children, 
  active, 
  onClick 
}: { 
  children: React.ReactNode; 
  active: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
        active
          ? 'bg-primary text-primary-foreground font-medium'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
      }`}
    >
      {children}
    </button>
  );
}
