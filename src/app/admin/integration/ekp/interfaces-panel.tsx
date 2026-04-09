'use client';

import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Download, RefreshCw, Loader2 } from 'lucide-react';
import OfficialInterfacesTable from './official-interfaces-table';
import CustomInterfacesTable from './custom-interfaces-table';

export default function EKPInterfacesPanel() {
  const [activeTab, setActiveTab] = useState<'official' | 'custom'>('official');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);

  // 使用 ref 来调用表格组件的方法
  const officialTableRef = useRef<{ handleAdd: () => void }>(null);
  const customTableRef = useRef<{ handleAdd: () => void }>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/ekp-interfaces');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('加载统计信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReload = async () => {
    try {
      setIsReloading(true);
      const res = await fetch('/api/admin/ekp-interfaces/reload', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        loadStats();
        alert('配置已重新加载');
      } else {
        alert('重载失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      alert('重载失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsReloading(false);
    }
  };

  const handleAdd = () => {
    if (activeTab === 'official' && officialTableRef.current) {
      officialTableRef.current.handleAdd();
    } else if (activeTab === 'custom' && customTableRef.current) {
      customTableRef.current.handleAdd();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 操作栏 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">EKP接口管理</h2>
          <p className="text-sm text-gray-600 mt-1">
            管理所有蓝凌EKP接口的配置信息
            {stats && (
              <span className="ml-2 text-xs text-gray-500">
                (总计 {stats.total} 个：官方 {stats.official} 个，二开 {stats.custom} 个)
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReload} disabled={isReloading}>
            {isReloading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                重载中...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                重载配置
              </>
            )}
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            导入配置
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            导出配置
          </Button>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            添加接口
          </Button>
        </div>
      </div>

      {/* 接口分类Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="official">
            官方接口
            {stats && stats.official > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                {stats.official}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="custom">
            二开接口
            {stats && stats.custom > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                {stats.custom}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="official" className="mt-4">
          <OfficialInterfacesTable ref={officialTableRef} />
        </TabsContent>

        <TabsContent value="custom" className="mt-4">
          <CustomInterfacesTable ref={customTableRef} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
