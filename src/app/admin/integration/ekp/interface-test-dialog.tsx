'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface InterfaceTestDialogProps {
  open: boolean;
  onClose: () => void;
  interfaceData: any;
}

export default function InterfaceTestDialog({
  open,
  onClose,
  interfaceData,
}: InterfaceTestDialogProps) {
  const [requestBody, setRequestBody] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const handleTest = async () => {
    if (!interfaceData) return;

    setLoading(true);
    setError('');
    setResponse(null);

    try {
      const requestData = requestBody ? JSON.parse(requestBody) : {};

      const res = await fetch('/api/admin/ekp-interfaces/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: interfaceData.code,
          data: requestData,
        }),
      });

      const result = await res.json();

      if (result.success) {
        setResponse(result.data);
      } else {
        setError(result.error || '测试失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析请求失败');
    } finally {
      setLoading(false);
    }
  };

  const loadRequestTemplate = () => {
    if (interfaceData?.request) {
      setRequestBody(JSON.stringify(interfaceData.request, null, 2));
    } else {
      setRequestBody('{}');
    }
  };

  useEffect(() => {
    if (open && interfaceData) {
      loadRequestTemplate();
    }
  }, [open, interfaceData]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>测试接口</DialogTitle>
          <DialogDescription>
            {interfaceData?.name} ({interfaceData?.code})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 接口信息 */}
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{interfaceData?.method}</Badge>
              <span className="text-sm font-mono">{interfaceData?.path}</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>分类: {interfaceData?.category}</span>
              <span>服务: {interfaceData?.serviceId}</span>
              <span>版本: {interfaceData?.version || '1.0'}</span>
            </div>
          </div>

          {/* 请求参数 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="request-body">请求参数（JSON）</Label>
              <Button variant="ghost" size="sm" onClick={loadRequestTemplate}>
                加载模板
              </Button>
            </div>
            <Textarea
              id="request-body"
              value={requestBody}
              onChange={(e) => setRequestBody(e.target.value)}
              placeholder="{}"
              rows={8}
              className="font-mono text-sm"
            />
          </div>

          {/* 测试按钮 */}
          <Button onClick={handleTest} disabled={loading} className="w-full">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {loading ? '测试中...' : '执行测试'}
          </Button>

          {/* 响应结果 */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
              <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
                <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">测试失败</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {response && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
              <div className="flex items-start gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">测试成功</p>
                  <pre className="mt-2 text-sm overflow-x-auto whitespace-pre-wrap font-mono">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* 接口描述 */}
          {interfaceData?.description && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
              <div className="flex items-start gap-2 text-blue-600 dark:text-blue-400">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">接口说明</p>
                  <p className="text-sm mt-1">{interfaceData.description}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
