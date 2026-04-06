'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { OrgElementDialog } from '@/components/org-element-dialog';
import {
  Search,
  ChevronRight,
  ChevronDown,
  Folder,
  Building2,
  Users,
  Briefcase,
  Plus,
  ArrowUpDown,
  X,
  RefreshCw,
  Edit,
  Trash2,
  User,
} from 'lucide-react';
import { OrgElement, OrgPerson, OrgTreeNode } from '@/types/org-structure';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// 视图类型
type ViewType = 'organization' | 'department' | 'position' | 'person';

// 视图配置
const viewConfigs = [
  { type: 'organization' as ViewType, label: '机构', icon: Building2, color: 'from-blue-500 to-blue-600' },
  { type: 'department' as ViewType, label: '部门', icon: Briefcase, color: 'from-green-500 to-green-600' },
  { type: 'position' as ViewType, label: '岗位', icon: Users, color: 'from-purple-500 to-purple-600' },
  { type: 'person' as ViewType, label: '人员', icon: User, color: 'from-orange-500 to-orange-600' },
];

export default function OrganizationStructurePage() {
  // 状态管理
  const [treeData, setTreeData] = useState<OrgTreeNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<OrgTreeNode | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('department');
  const [listData, setListData] = useState<(OrgElement | OrgPerson)[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // 对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [dialogInitialData, setDialogInitialData] = useState<OrgElement | OrgPerson | null>(null);

  // 删除确认对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<(OrgElement | OrgPerson) | null>(null);

  // 加载树数据
  const loadTreeData = async () => {
    try {
      setLoading(true);
      // type=2：显示机构和部门（不显示人员和岗位）
      const response = await fetch('/api/organization?action=tree&type=2');
      const data = await response.json();
      if (data.success) {
        setTreeData(data.data || []);
        // 默认不展开任何节点，让用户手动点击展开
        // 如果需要默认展开第一个节点，可以取消下面的注释
        // if (data.data && data.data.length > 0) {
        //   setExpandedNodes(new Set([data.data[0].id]));
        // }
      }
    } catch (error) {
      console.error('加载树数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载列表数据
  const loadListData = async () => {
    if (!selectedNode) {
      setListData([]);
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams({
        type: currentView,
        parentId: selectedNode.id,
        ...(searchKeyword && { keyword: searchKeyword }),
      });

      const response = await fetch(`/api/organization?action=list&${params}`);
      const data = await response.json();
      if (data.success) {
        setListData(data.data || []);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      setListData([]);
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    loadTreeData();
  }, []);

  // 监听选择节点和视图变化，重新加载列表
  useEffect(() => {
    loadListData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode, currentView, searchKeyword]);

  // 节点展开/折叠
  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // 选择节点
  const handleSelectNode = (node: OrgTreeNode) => {
    setSelectedNode(node);

    // 如果节点有子节点且未展开，自动展开该节点
    if (node.children && node.children.length > 0 && !expandedNodes.has(node.id)) {
      const newExpanded = new Set(expandedNodes);
      newExpanded.add(node.id);
      setExpandedNodes(newExpanded);
    }
  };

  // 打开新建对话框
  const handleCreate = () => {
    // 根据当前视图类型判断是否需要选择父节点
    const needsParent = ['department', 'position', 'person'].includes(currentView);

    if (needsParent && !selectedNode) {
      // 使用更明显的提示
      const message = `创建${viewConfigs.find(c => c.type === currentView)?.label}需要先选择父级组织`;
      alert(message);
      return;
    }

    console.log('[handleCreate] 打开新建对话框', { currentView, selectedNode, needsParent });
    setDialogMode('create');
    setDialogInitialData(null);
    setDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEdit = (item: OrgElement | OrgPerson) => {
    setDialogMode('edit');
    setDialogInitialData(item);
    setDialogOpen(true);
  };

  // 保存数据
  const handleSave = async (data: Record<string, unknown>) => {
    console.log('[handleSave] 开始保存', {
      action: dialogMode === 'create' ? 'create' : 'update',
      type: currentView,
      data,
    });

    try {
      const response = await fetch('/api/organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: dialogMode === 'create' ? 'create' : 'update',
          type: currentView,
          data,
        }),
      });

      console.log('[handleSave] 响应状态:', response.status);

      const result = await response.json();
      console.log('[handleSave] 响应数据:', result);

      if (!result.success) {
        throw new Error(result.error || '保存失败');
      }

      // 刷新数据
      await loadTreeData();
      await loadListData();
    } catch (error) {
      console.error('[handleSave] 保存失败:', error);
      throw error;
    }
  };

  // 打开删除确认对话框
  const handleDelete = (item: OrgElement | OrgPerson) => {
    setDeleteItem(item);
    setDeleteDialogOpen(true);
  };

  // 确认删除
  const handleConfirmDelete = async () => {
    if (!deleteItem) return;

    try {
      const response = await fetch('/api/organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          type: currentView,
          id: deleteItem.fd_id,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '删除失败');
      }

      // 刷新数据
      await loadTreeData();
      await loadListData();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    }
  };

  // 其他按钮处理
  const handleQuickSort = () => {
    alert('快速排序功能开发中');
  };

  const handleSetInvalid = () => {
    alert('置为无效功能开发中');
  };

  const handleChangeParent = () => {
    alert('快捷调换上级功能开发中');
  };

  // 渲染树节点
  const renderTreeNode = (node: OrgTreeNode, level: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedNode?.id === node.id;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id}>
        {/* 节点本身 */}
        <div
          className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 rounded-md transition-colors ${
            isSelected ? 'bg-blue-50 text-blue-600' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => handleSelectNode(node)}
        >
          {/* 展开/折叠图标 */}
          {hasChildren ? (
            <div
              className="flex-shrink-0 w-4 h-4 flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </div>
          ) : (
            <div className="w-4 h-4 flex-shrink-0" />
          )}

          {/* 图标：机构用蓝色，部门用绿色 */}
          <div
            className={`w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white flex-shrink-0 ${
              node.type === 1 ? 'from-blue-500 to-blue-600' : 'from-green-500 to-green-600'
            }`}
          >
            {node.type === 1 ? (
              <Building2 className="w-4 h-4" />
            ) : (
              <Briefcase className="w-4 h-4" />
            )}
          </div>

          {/* 节点名称 */}
          <span className="text-sm font-medium truncate flex-1">{node.name}</span>

          {/* 人员数量 */}
          {node.personCount !== undefined && node.personCount > 0 && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {node.personCount}
            </span>
          )}
        </div>

        {/* 子节点 */}
        {isExpanded && hasChildren && node.children && (
          <div>
            {node.children.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* 左侧树形结构 */}
      <Card className="w-80 flex flex-col overflow-hidden">
        {/* 树形结构头部 */}
        <div className="p-4 border-b bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Folder className="w-4 h-4" />
            组织架构树
          </h3>
        </div>

        {/* 树形结构内容 */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading && treeData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              加载中...
            </div>
          ) : treeData.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-8">
              暂无数据
            </div>
          ) : (
            <div className="space-y-1">
              {treeData.map((node) => renderTreeNode(node))}
            </div>
          )}
        </div>

        {/* 刷新按钮 */}
        <div className="p-3 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={loadTreeData}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </Card>

      {/* 右侧内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部搜索栏 */}
        <Card className="p-4">
          <div className="flex gap-3">
            <div className="flex-1 flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                placeholder="请输入关键字（可根据编号、名称、名称拼音查询）"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="flex-1"
              />
            </div>
            <Button variant="outline">搜索</Button>
            <Button variant="ghost" size="sm">
              展开筛选
            </Button>
          </div>
        </Card>

        {/* 功能切换与排序栏 */}
        <Card className="p-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* 视图切换下拉 */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">当前显示：</span>
                <Select value={currentView} onValueChange={(v) => setCurrentView(v as ViewType)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {viewConfigs.map((config) => (
                      <SelectItem key={config.type} value={config.type}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 排序控制 */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">排序：</span>
                <span className="font-medium">排序号</span>
                <Button variant="ghost" size="sm" className="text-gray-500">
                  <ArrowUpDown className="w-4 h-4 mr-1" />
                  更多排序
                </Button>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={['department', 'position', 'person'].includes(currentView) && !selectedNode}
                title={
                  ['department', 'position', 'person'].includes(currentView) && !selectedNode
                    ? `请先在左侧选择一个${viewConfigs.find(c => c.type === currentView)?.label === 'department' ? '机构' : viewConfigs.find(c => c.type === currentView)?.label === 'position' ? '部门' : '部门'}作为父级`
                    : `新建${viewConfigs.find(c => c.type === currentView)?.label}`
                }
              >
                <Plus className="w-4 h-4 mr-1" />
                新建
              </Button>
              {/* 提示信息 */}
              {['department', 'position', 'person'].includes(currentView) && !selectedNode && (
                <span className="text-xs text-gray-500">
                  提示：请先在左侧选择父级组织
                </span>
              )}
              <Button variant="outline" size="sm" onClick={handleQuickSort}>
                快速排序
              </Button>
              <Button variant="outline" size="sm" onClick={handleSetInvalid}>
                置为无效
              </Button>
              <Button variant="outline" size="sm" onClick={handleChangeParent}>
                快捷调换上级
              </Button>
            </div>
          </div>
        </Card>

        {/* 数据展示区 */}
        <Card className="flex-1 mt-4 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                加载中...
              </div>
            ) : !selectedNode ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Users className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg font-medium mb-2">请在左侧选择层级</p>
                <p className="text-sm">选择层级后，可查看该层级的机构、部门、岗位或人员信息</p>
              </div>
            ) : listData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <X className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg font-medium mb-2">很抱歉，未找到符合条件的记录！</p>
                <p className="text-sm">请尝试其他查询条件</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {listData.map((item: any) => (
                  <Card
                    key={item.fd_id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* 图标 */}
                        <div
                          className={`w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-white ${
                            currentView === 'organization' ? 'from-blue-500 to-blue-600' :
                            currentView === 'department' ? 'from-green-500 to-green-600' :
                            currentView === 'position' ? 'from-purple-500 to-purple-600' :
                            'from-orange-500 to-orange-600'
                          }`}
                        >
                          {currentView === 'organization' && <Building2 className="w-5 h-5" />}
                          {currentView === 'department' && <Briefcase className="w-5 h-5" />}
                          {currentView === 'position' && <Users className="w-5 h-5" />}
                          {currentView === 'person' && <User className="w-5 h-5" />}
                        </div>

                        {/* 信息 */}
                        <div>
                          <h4 className="font-medium text-gray-900">{item.fd_name}</h4>
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          <p className="text-sm text-gray-500 mt-1">
                            {item.fd_no && `编号: ${item.fd_no}`}
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {item.fd_no && ((item as any).fd_email || (item as any).fd_org_email) && ' | '}
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {((item as any).fd_email || (item as any).fd_org_email) && `邮箱: ${((item as any).fd_email || (item as any).fd_org_email)}`}
                          </p>
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(item)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 新建/编辑对话框 */}
      <OrgElementDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          // 关闭对话框后刷新数据
          loadTreeData();
          loadListData();
        }}
        mode={dialogMode}
        viewType={currentView}
        initialData={dialogInitialData}
        parentId={selectedNode?.id}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除&quot;{deleteItem?.fd_name}&quot;吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
