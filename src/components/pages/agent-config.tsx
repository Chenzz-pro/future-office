/**
 * Agent 配置界面
 * 
 * 新架构：Agent配置管理界面，支持业务Agent的配置和测试
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { 
  Bot, 
  Check, 
  X, 
  Settings, 
  Play,
  FileText,
  Calendar,
  Database,
  MessageSquare,
  Shield,
  Key,
  Code
} from 'lucide-react';

interface AgentConfig {
  id: string;
  type: string;
  agentType: string;
  name: string;
  description: string;
  avatar: string;
  enabled: boolean;
  skillsConfig?: any;
  permissionRules?: any;
  businessRules?: any;
  version: number;
}

export function AgentConfigPanel() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  // 加载 Agent 列表
  const loadAgents = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/agents');
      const result = await response.json();

      if (result.success) {
        setAgents(result.data.agents || []);
      }
    } catch (error) {
      console.error('[AgentConfig] 加载失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载 Agent 详情
  const loadAgentDetail = async (agentId: string) => {
    try {
      const response = await fetch(`/api/agents/${agentId}`);
      const result = await response.json();

      if (result.success) {
        setSelectedAgent(result.data);
      }
    } catch (error) {
      console.error('[AgentConfig] 加载详情失败:', error);
    }
  };

  // 测试 Agent
  const testAgent = async () => {
    if (!selectedAgent || !testMessage) return;

    setTestLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/agents/root', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: localStorage.getItem('current-user-id'),
          message: testMessage,
        }),
      });

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      console.error('[AgentConfig] 测试失败:', error);
      setTestResult({ error: '测试失败' });
    } finally {
      setTestLoading(false);
    }
  };

  // 获取 Agent 图标
  const getAgentIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      approval: <FileText className="h-5 w-5" />,
      meeting: <Calendar className="h-5 w-5" />,
      data: <Database className="h-5 w-5" />,
      assistant: <MessageSquare className="h-5 w-5" />,
    };
    return icons[type] || <Bot className="h-5 w-5" />;
  };

  // 获取 Agent 类型名称
  const getAgentTypeName = (type: string) => {
    const names: Record<string, string> = {
      approval: '审批Agent',
      meeting: '会议Agent',
      data: '数据Agent',
      assistant: '助理Agent',
    };
    return names[type] || type;
  };

  useEffect(() => {
    loadAgents();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent 配置中心</h1>
          <p className="text-muted-foreground mt-2">
            管理和配置业务Agent，支持权限规则、业务规则的动态配置
          </p>
        </div>
        <Button onClick={loadAgents} variant="outline" disabled={loading}>
          <Settings className="h-4 w-4 mr-2" />
          刷新列表
        </Button>
      </div>

      {/* Agent 列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {agents.map((agent) => (
          <Card
            key={agent.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedAgent?.id === agent.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => loadAgentDetail(agent.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  {getAgentIcon(agent.type)}
                  <CardTitle className="text-lg">{agent.name}</CardTitle>
                </div>
                <Badge variant={agent.enabled ? 'default' : 'secondary'}>
                  {agent.enabled ? '启用' : '禁用'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground mb-2">
                {agent.description}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{getAgentTypeName(agent.type)}</span>
                <span>v{agent.version}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Agent 详情 */}
      {selectedAgent && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getAgentIcon(selectedAgent.type)}
                <div>
                  <CardTitle className="text-2xl">{selectedAgent.name}</CardTitle>
                  <p className="text-muted-foreground text-sm mt-1">
                    {selectedAgent.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={selectedAgent.enabled ? 'default' : 'secondary'}>
                  {selectedAgent.enabled ? '启用' : '禁用'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="config" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="config">配置信息</TabsTrigger>
                <TabsTrigger value="permissions">权限规则</TabsTrigger>
                <TabsTrigger value="rules">业务规则</TabsTrigger>
                <TabsTrigger value="test">测试</TabsTrigger>
              </TabsList>

              {/* 配置信息 */}
              <TabsContent value="config" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Agent ID</Label>
                    <Input value={selectedAgent.id} disabled />
                  </div>
                  <div>
                    <Label>Agent 类型</Label>
                    <Input value={selectedAgent.type} disabled />
                  </div>
                  <div>
                    <Label>业务类型</Label>
                    <Input value={selectedAgent.agentType} disabled />
                  </div>
                  <div>
                    <Label>版本号</Label>
                    <Input value={selectedAgent.version.toString()} disabled />
                  </div>
                </div>
                <div>
                  <Label>描述</Label>
                  <Textarea
                    value={selectedAgent.description}
                    disabled
                    rows={3}
                  />
                </div>
              </TabsContent>

              {/* 权限规则 */}
              <TabsContent value="permissions" className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Shield className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">权限规则配置</h3>
                </div>
                <Card>
                  <CardContent className="p-4">
                    <pre className="text-sm overflow-auto bg-muted p-4 rounded">
                      {JSON.stringify(selectedAgent.permissionRules, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 业务规则 */}
              <TabsContent value="rules" className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Code className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">业务规则配置</h3>
                </div>
                <Card>
                  <CardContent className="p-4">
                    <pre className="text-sm overflow-auto bg-muted p-4 rounded">
                      {JSON.stringify(selectedAgent.businessRules, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 测试 */}
              <TabsContent value="test" className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Play className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">测试 Agent</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>测试消息</Label>
                    <Textarea
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      placeholder="输入测试消息，例如：我想申请请假..."
                      rows={3}
                    />
                  </div>
                  <Button 
                    onClick={testAgent} 
                    disabled={testLoading || !testMessage}
                    className="w-full"
                  >
                    {testLoading ? '测试中...' : '执行测试'}
                  </Button>

                  {/* 测试结果 */}
                  {testResult && (
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-2">测试结果</h4>
                        <pre className="text-sm overflow-auto bg-muted p-4 rounded">
                          {JSON.stringify(testResult, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
