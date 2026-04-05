'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2,
  Users,
  Briefcase,
  User,
  Plus,
  Search,
  RefreshCw,
  Edit,
  Trash2
} from 'lucide-react';
import { OrgElementType, OrgTreeNode, OrgElement, OrgPerson } from '@/types/org-structure';

type ViewType = 'organization' | 'department' | 'position' | 'person';

interface ViewConfig {
  type: ViewType;
  label: string;
  icon: React.ReactNode;
  orgType?: OrgElementType;
  color: string;
}

const viewConfigs: ViewConfig[] = [
  {
    type: 'organization',
    label: '机构层级',
    icon: <Building2 className="w-4 h-4" />,
    orgType: OrgElementType.ORGANIZATION,
    color: 'text-blue-600'
  },
  {
    type: 'department',
    label: '部门层级',
    icon: <Users className="w-4 h-4" />,
    orgType: OrgElementType.DEPARTMENT,
    color: 'text-green-600'
  },
  {
    type: 'position',
    label: '岗位层级',
    icon: <Briefcase className="w-4 h-4" />,
    orgType: OrgElementType.POSITION,
    color: 'text-purple-600'
  },
  {
    type: 'person',
    label: '人员层级',
    icon: <User className="w-4 h-4" />,
    color: 'text-orange-600'
  }
];

export default function OrganizationStructure() {
  const [currentView, setCurrentView] = useState<ViewType>('organization');
  const [treeData, setTreeData] = useState<OrgTreeNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<OrgTreeNode | null>(null);
  const [listData, setListData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const currentConfig = viewConfigs.find(c => c.type === currentView);

  // 加载组织架构树
  const loadTreeData = async () => {
    setLoading(true);
    try {
      const orgType = currentConfig?.orgType;
      const response = await fetch(`/api/organization?action=tree&type=${orgType || ''}`);
      const result = await response.json();
      if (result.success) {
        setTreeData(result.data);
      }
    } catch (error) {
      console.error('加载树数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载列表数据
  const loadListData = async () => {
    setLoading(true);
    try {
      let url = `/api/organization?action=list&type=${currentView}`;
      if (selectedNode) {
        url += `&parentId=${selectedNode.id}`;
      }
      if (searchKeyword) {
        url += `&keyword=${encodeURIComponent(searchKeyword)}`;
      }

      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        setListData(result.data);
      }
    } catch (error) {
      console.error('加载列表数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTreeData();
  }, [currentView]);

  useEffect(() => {
    loadListData();
  }, [currentView, selectedNode, searchKeyword]);

  const handleNodeClick = (node: OrgTreeNode) => {
    setSelectedNode(node);
  };

  const handleRefresh = () => {
    loadTreeData();
    loadListData();
  };

  const handleAdd = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除吗？')) return;

    try {
      const response = await fetch('/api/organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          type: currentView,
          id
        })
      });

      const result = await response.json();
      if (result.success) {
        loadTreeData();
        loadListData();
      } else {
        alert(result.error || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  };

  const renderTreeItem = (node: OrgTreeNode, level: number = 0) => {
    const isSelected = selectedNode?.id === node.id;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 px-3 py-2 cursor-pointer rounded-md transition-colors ${
            isSelected
              ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
              : 'hover:bg-gray-50 border-l-4 border-transparent'
          }`}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
          onClick={() => handleNodeClick(node)}
        >
          {node.children && node.children.length > 0 && (
            <span className="text-gray-400 text-xs">▼</span>
          )}
          <span className={`font-medium ${currentConfig?.color}`}>{node.typeLabel}</span>
          <span className="flex-1 truncate">{node.name}</span>
          {node.personsNumber > 0 && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {node.personsNumber}人
            </span>
          )}
        </div>
        {node.children && node.children.map(child => renderTreeItem(child, level + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">组织架构管理</h1>
          <p className="text-gray-600 mt-1">管理机构的部门、岗位和人员信息</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            新增{currentConfig?.label}
          </Button>
        </div>
      </div>

      {/* 维度切换 */}
      <Card>
        <CardHeader>
          <Tabs value={currentView} onValueChange={(v) => {
            setCurrentView(v as ViewType);
            setSelectedNode(null);
          }}>
            <TabsList className="grid w-full grid-cols-4">
              {viewConfigs.map(config => (
                <TabsTrigger key={config.type} value={config.type} className="flex items-center gap-2">
                  {config.icon}
                  {config.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
      </Card>

      {/* 主内容区 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧树形结构 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {currentConfig?.icon}
              {currentConfig?.label}树
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                加载中...
              </div>
            ) : treeData.length > 0 ? (
              <div className="space-y-1 max-h-[600px] overflow-y-auto">
                {treeData.map(node => renderTreeItem(node))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                暂无数据
              </div>
            )}
          </CardContent>
        </Card>

        {/* 右侧列表 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {selectedNode ? `${selectedNode.name} - ` : ''}
                {currentConfig?.label}列表
              </CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="搜索..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                加载中...
              </div>
            ) : listData.length > 0 ? (
              <div className="space-y-2">
                {listData.map((item: any) => (
                  <div
                    key={item.fd_id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${currentView === 'organization' ? 'from-blue-500 to-blue-600' : currentView === 'department' ? 'from-green-500 to-green-600' : currentView === 'position' ? 'from-purple-500 to-purple-600' : 'from-orange-500 to-orange-600'} flex items-center justify-center text-white`}>
                        {currentConfig?.icon}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{item.fd_name}</h3>
                        <p className="text-sm text-gray-500">
                          {item.fd_no && `编号: ${item.fd_no}`}
                          {item.fd_no && item.fd_email && ' | '}
                          {item.fd_email && `邮箱: ${item.fd_email}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(item.fd_id)} className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                暂无数据
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
