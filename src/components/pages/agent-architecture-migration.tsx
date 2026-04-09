/**
 * 智能体架构迁移工具
 * 
 * 新架构：从旧架构迁移到新架构的迁移工具
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowRight,
  Check,
  X,
  AlertCircle,
  Database,
  Loader2,
  FileText
} from 'lucide-react';

interface MigrationStatus {
  hasOldAgents: boolean;
  oldAgents: any[];
  hasNewAgents: boolean;
  newAgents: any[];
  canMigrate: boolean;
  errors: string[];
}

export function AgentArchitectureMigrationTool() {
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any>(null);

  // 检查迁移状态
  const checkStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/database/migrate/agent-architecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check' }),
      });

      const result = await response.json();
      setStatus(result.data);
    } catch (error) {
      console.error('[Migration] 检查失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 执行迁移
  const migrate = async () => {
    setMigrating(true);
    setMigrationResult(null);

    try {
      const response = await fetch('/api/database/migrate/agent-architecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'migrate' }),
      });

      const result = await response.json();
      setMigrationResult(result);

      if (result.success) {
        // 迁移成功后重新检查状态
        await checkStatus();
      }
    } catch (error) {
      console.error('[Migration] 迁移失败:', error);
      setMigrationResult({ error: '迁移失败' });
    } finally {
      setMigrating(false);
    }
  };

  // 回滚迁移
  const rollback = async () => {
    if (!confirm('确定要回滚迁移吗？这将恢复到旧架构。')) return;

    setMigrating(true);
    try {
      const response = await fetch('/api/database/migrate/agent-architecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rollback' }),
      });

      const result = await response.json();
      setMigrationResult(result);

      if (result.success) {
        await checkStatus();
      }
    } catch (error) {
      console.error('[Migration] 回滚失败:', error);
      setMigrationResult({ error: '回滚失败' });
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">智能体架构迁移工具</h1>
          <p className="text-muted-foreground mt-2">
            从旧架构迁移到新的多Agent协作架构
          </p>
        </div>
        <Button 
          onClick={checkStatus} 
          variant="outline" 
          disabled={loading || migrating}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              检查中...
            </>
          ) : (
            <>
              <Database className="h-4 w-4 mr-2" />
              检查状态
            </>
          )}
        </Button>
      </div>

      {/* 架构对比 */}
      <Card>
        <CardHeader>
          <CardTitle>架构对比</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {/* 旧架构 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">旧架构</Badge>
                <h3 className="text-lg font-semibold">单Agent架构</h3>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <X className="h-4 w-4 mr-2 text-red-500 mt-0.5" />
                  <span>所有Agent共享相同架构</span>
                </li>
                <li className="flex items-start">
                  <X className="h-4 w-4 mr-2 text-red-500 mt-0.5" />
                  <span>权限规则硬编码</span>
                </li>
                <li className="flex items-start">
                  <X className="h-4 w-4 mr-2 text-red-500 mt-0.5" />
                  <span>业务数据直接进入LLM</span>
                </li>
                <li className="flex items-start">
                  <X className="h-4 w-4 mr-2 text-red-500 mt-0.5" />
                  <span>缺乏统一的意图识别</span>
                </li>
              </ul>
            </div>

            <Separator orientation="vertical" className="hidden md:block" />

            {/* 新架构 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Badge variant="default">新架构</Badge>
                <h3 className="text-lg font-semibold">多Agent协作架构</h3>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <Check className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                  <span>RootAgent统一调度</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                  <span>权限规则动态配置</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                  <span>业务数据零进LLM</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                  <span>统一的意图识别和话术润色</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 迁移状态 */}
      {status && (
        <Card>
          <CardHeader>
            <CardTitle>迁移状态</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 旧架构状态 */}
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                旧架构 Agent
              </h3>
              {status.hasOldAgents ? (
                <>
                  <Badge variant="secondary">
                    {status.oldAgents.length} 个旧Agent
                  </Badge>
                  <div className="bg-muted p-4 rounded max-h-32 overflow-auto">
                    <pre className="text-xs">
                      {JSON.stringify(status.oldAgents, null, 2)}
                    </pre>
                  </div>
                </>
              ) : (
                <Badge variant="outline">未发现旧Agent</Badge>
              )}
            </div>

            <Separator />

            {/* 新架构状态 */}
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center">
                <Database className="h-4 w-4 mr-2" />
                新架构 Agent
              </h3>
              {status.hasNewAgents ? (
                <>
                  <Badge variant="default">
                    {status.newAgents.length} 个新Agent
                  </Badge>
                  <div className="bg-muted p-4 rounded max-h-32 overflow-auto">
                    <pre className="text-xs">
                      {JSON.stringify(status.newAgents, null, 2)}
                    </pre>
                  </div>
                </>
              ) : (
                <Badge variant="outline">未发现新Agent</Badge>
              )}
            </div>

            <Separator />

            {/* 迁移按钮 */}
            <div className="flex items-center space-x-4">
              {status.canMigrate && (
                <Button 
                  onClick={migrate} 
                  disabled={migrating}
                  className="flex-1"
                >
                  {migrating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      迁移中...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      执行迁移
                    </>
                  )}
                </Button>
              )}

              {status.hasNewAgents && (
                <Button 
                  onClick={rollback} 
                  variant="destructive"
                  disabled={migrating}
                >
                  {migrating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      回滚中...
                    </>
                  ) : (
                    '回滚迁移'
                  )}
                </Button>
              )}
            </div>

            {/* 错误信息 */}
            {status.errors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive rounded p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-destructive">迁移错误</h4>
                    <ul className="mt-2 space-y-1">
                      {status.errors.map((error, index) => (
                        <li key={index} className="text-sm text-destructive">
                          {index + 1}. {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 迁移结果 */}
      {migrationResult && (
        <Card>
          <CardHeader>
            <CardTitle>迁移结果</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm overflow-auto bg-muted p-4 rounded">
              {JSON.stringify(migrationResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
