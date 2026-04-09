'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { OrgElementDialog } from '@/components/org-element-dialog';
import {
  Search,
  ChevronRight,
  ChevronDown,
  Folder,
  Building2,
  Users,
  BriefcaseBusiness,
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  User,
  X,
  Eye,
  EyeOff,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

export default function OrganizationStructurePage() {
  // 状态管理
  const [treeData, setTreeData] = useState<OrgTreeNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<OrgTreeNode | null>(null);
  const [selectedNodeName, setSelectedNodeName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // 列表数据状态
  const [orgList, setOrgList] = useState<OrgElement[]>([]); // 子机构列表
  const [deptList, setDeptList] = useState<OrgElement[]>([]); // 子部门列表
  const [postList, setPostList] = useState<OrgElement[]>([]);
  const [personList, setPersonList] = useState<OrgPerson[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentTab, setCurrentTab] = useState<'org' | 'dept' | 'posts' | 'persons'>('org');

  // 分页状态
  const [orgPagination, setOrgPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 0 });
  const [deptPagination, setDeptPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 0 });
  const [postPagination, setPostPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 0 });
  const [personPagination, setPersonPagination] = useState({ page: 1, pageSize: 50, total: 0, totalPages: 0 });

  // 对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [dialogInitialData, setDialogInitialData] = useState<OrgElement | OrgPerson | null>(null);
  const [dialogViewType, setDialogViewType] = useState<'organization' | 'department' | 'position' | 'person'>('department');

  // 删除确认对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<OrgElement | OrgPerson | null>(null);
  const [deleteItemType, setDeleteItemType] = useState<'org' | 'dept' | 'post' | 'person'>('dept');

  // 查看详情对话框状态
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewItem, setViewItem] = useState<OrgElement | OrgPerson | null>(null);
  const [viewItemType, setViewItemType] = useState<'org' | 'dept' | 'post' | 'person'>('dept');

  // 加载树数据
  const loadTreeData = async () => {
    try {
      setLoading(true);
      // type=2：显示机构和部门（不显示岗位，岗位在右侧显示）
      const response = await fetch('/api/organization?action=tree&type=2');
      const data = await response.json();
      if (data.success) {
        setTreeData(data.data || []);
      }
    } catch (error) {
      console.error('加载树数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载子机构列表
  const loadOrgList = async (parentId: string, page: number = 1) => {
    try {
      const params = new URLSearchParams({
        type: 'organization',
        parentId: parentId,
        page: page.toString(),
        pageSize: orgPagination.pageSize.toString(),
        ...(searchKeyword && { keyword: searchKeyword }),
      });

      const response = await fetch(`/api/organization?action=list&${params}`);
      const data = await response.json();
      if (data.success) {
        setOrgList(data.data || []);
        setOrgPagination(prev => ({
          ...prev,
          page: data.page,
          total: data.total,
          totalPages: data.totalPages,
        }));
      }
    } catch (error) {
      console.error('加载子机构数据失败:', error);
      setOrgList([]);
    }
  };

  // 加载子部门列表
  const loadDeptList = async (parentId: string, page: number = 1) => {
    try {
      const params = new URLSearchParams({
        type: 'department',
        parentId: parentId,
        page: page.toString(),
        pageSize: deptPagination.pageSize.toString(),
        ...(searchKeyword && { keyword: searchKeyword }),
      });

      const response = await fetch(`/api/organization?action=list&${params}`);
      const data = await response.json();
      if (data.success) {
        setDeptList(data.data || []);
        setDeptPagination(prev => ({
          ...prev,
          page: data.page,
          total: data.total,
          totalPages: data.totalPages,
        }));
      }
    } catch (error) {
      console.error('加载子部门数据失败:', error);
      setDeptList([]);
    }
  };

  // 加载岗位列表
  const loadPostList = async (parentId: string, page: number = 1) => {
    try {
      const params = new URLSearchParams({
        type: 'post',
        parentId: parentId,
        page: page.toString(),
        pageSize: postPagination.pageSize.toString(),
        ...(searchKeyword && { keyword: searchKeyword }),
      });

      const response = await fetch(`/api/organization?action=list&${params}`);
      const data = await response.json();
      if (data.success) {
        setPostList(data.data || []);
        setPostPagination(prev => ({
          ...prev,
          page: data.page,
          total: data.total,
          totalPages: data.totalPages,
        }));
      }
    } catch (error) {
      console.error('加载岗位数据失败:', error);
      setPostList([]);
    }
  };

  // 加载人员列表
  const loadPersonList = async (parentId: string, page: number = 1) => {
    try {
      const params = new URLSearchParams({
        type: 'person',
        parentId: parentId,
        page: page.toString(),
        pageSize: personPagination.pageSize.toString(),
        ...(searchKeyword && { keyword: searchKeyword }),
      });

      const response = await fetch(`/api/organization?action=list&${params}`);
      const data = await response.json();
      if (data.success) {
        setPersonList(data.data || []);
        setPersonPagination(prev => ({
          ...prev,
          page: data.page,
          total: data.total,
          totalPages: data.totalPages,
        }));
      }
    } catch (error) {
      console.error('加载人员数据失败:', error);
      setPersonList([]);
    }
  };

  // 初始化加载
  useEffect(() => {
    loadTreeData();
  }, []);

  // 监听选择节点变化，加载子机构、子部门、岗位和人员
  useEffect(() => {
    if (selectedNode) {
      loadOrgList(selectedNode.id);
      loadDeptList(selectedNode.id);
      loadPostList(selectedNode.id);
      loadPersonList(selectedNode.id);
    } else {
      setOrgList([]);
      setDeptList([]);
      setPostList([]);
      setPersonList([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode]);

  // 监听搜索关键词变化
  useEffect(() => {
    if (selectedNode) {
      loadOrgList(selectedNode.id);
      loadDeptList(selectedNode.id);
      loadPostList(selectedNode.id);
      loadPersonList(selectedNode.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKeyword]);

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
    setSelectedNodeName(node.name);
    setCurrentTab('org'); // 切换到机构Tab

    // 如果节点有子节点且未展开，自动展开该节点
    if (node.children && node.children.length > 0 && !expandedNodes.has(node.id)) {
      const newExpanded = new Set(expandedNodes);
      newExpanded.add(node.id);
      setExpandedNodes(newExpanded);
    }
  };

  // 打开新建对话框
  const handleCreate = (viewType: 'organization' | 'department' | 'position' | 'person') => {
    // 机构类型允许在没有选择节点时创建（顶层机构）
    if (!selectedNode && viewType !== 'organization') {
      alert('请先在左侧选择一个部门');
      return;
    }

    setDialogViewType(viewType);
    setDialogMode('create');
    setDialogInitialData(null);
    setDialogOpen(true);
  };

  // 打开查看详情对话框
  const handleView = (item: OrgElement | OrgPerson, itemType: 'org' | 'dept' | 'post' | 'person') => {
    setViewItem(item);
    setViewItemType(itemType);
    setViewDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEdit = (item: OrgElement | OrgPerson, itemType: 'org' | 'dept' | 'post' | 'person') => {
    if (itemType === 'org') {
      setDeleteItemType('org');
      setDialogViewType('organization'); // 机构使用organization类型
    } else if (itemType === 'dept') {
      setDeleteItemType('dept');
      setDialogViewType('department'); // 部门使用department类型
    } else {
      setDeleteItemType(itemType === 'post' ? 'post' : 'person');
      setDialogViewType(itemType === 'post' ? 'position' : 'person');
    }
    setDialogMode('edit');
    setDialogInitialData(item);
    setDialogOpen(true);
  };

  // 保存数据
  const handleSave = async (data: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: dialogMode === 'create' ? 'create' : 'update',
          type: dialogViewType,
          data,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '保存失败');
      }

      // 刷新数据
      await loadTreeData();
      if (selectedNode) {
        await loadOrgList(selectedNode.id);
        await loadDeptList(selectedNode.id);
        await loadPostList(selectedNode.id);
        await loadPersonList(selectedNode.id);
      }
    } catch (error) {
      console.error('[handleSave] 保存失败:', error);
      throw error;
    }
  };

  // 打开删除确认对话框
  const handleDelete = (item: OrgElement | OrgPerson, itemType: 'org' | 'dept' | 'post' | 'person') => {
    setDeleteItem(item);
    setDeleteItemType(itemType);
    setDeleteDialogOpen(true);
  };

  // 确认删除
  const handleConfirmDelete = async () => {
    if (!deleteItem) return;

    try {
      // 根据删除类型确定API类型
      let apiType = 'position';
      if (deleteItemType === 'person') {
        apiType = 'person';
      } else if (deleteItemType === 'org') {
        apiType = 'organization';
      } else if (deleteItemType === 'dept') {
        apiType = 'department';
      }

      const response = await fetch('/api/organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          type: apiType,
          id: deleteItem.fd_id,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '删除失败');
      }

      // 刷新数据
      await loadTreeData();
      if (selectedNode) {
        await loadOrgList(selectedNode.id);
        await loadDeptList(selectedNode.id);
        await loadPostList(selectedNode.id);
        await loadPersonList(selectedNode.id);
      }
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    }
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
              <BriefcaseBusiness className="w-4 h-4" />
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

  // 渲染列表项
  const renderListItem = (
    item: OrgElement | OrgPerson,
    itemType: 'post' | 'person',
    index: number
  ) => {
    const isPost = itemType === 'post';
    const element = item as OrgElement;
    const person = item as OrgPerson;

    return (
      <Card
        key={item.fd_id}
        className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={() => handleView(item, itemType)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* 序号 */}
            <span className="text-sm text-gray-400 w-6">{index + 1}</span>
            
            {/* 图标 */}
            <div
              className={`w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-white ${
                isPost ? 'from-purple-500 to-purple-600' : 'from-orange-500 to-orange-600'
              }`}
            >
              {isPost ? <Users className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>

            {/* 信息 */}
            <div>
              <h4 className="font-medium text-gray-900">{item.fd_name}</h4>
              <p className="text-sm text-gray-500 mt-1">
                {item.fd_no && `编号: ${item.fd_no}`}
                {isPost && element.fd_org_email && item.fd_no && ' | '}
                {isPost && element.fd_org_email && `邮箱: ${element.fd_org_email}`}
                {!isPost && person.fd_email && item.fd_no && ' | '}
                {!isPost && person.fd_email && `邮箱: ${person.fd_email}`}
                {!isPost && person.fd_mobile && (
                  <>
                    {item.fd_no || person.fd_email ? ' | ' : ''}
                    {`手机: ${person.fd_mobile}`}
                  </>
                )}
                {!isPost && person.fd_login_name && (
                  <>
                    {item.fd_no || person.fd_email || person.fd_mobile ? ' | ' : ''}
                    {`登录名: ${person.fd_login_name}`}
                  </>
                )}
              </p>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" onClick={() => handleView(item, itemType)} title="查看详情">
              <Eye className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleEdit(item, itemType)} title="编辑">
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(item, itemType)} title="删除">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  // 渲染机构/部门列表项
  const renderOrgListItem = (item: OrgElement, index: number, itemType: 'org' | 'dept') => {
    const isOrg = itemType === 'org'; // 根据传入的类型参数判断

    return (
      <Card
        key={item.fd_id}
        className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={() => handleView(item, itemType)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* 序号 */}
            <span className="text-sm text-gray-400 w-6">{index + 1}</span>
            
            {/* 图标 */}
            <div
              className={`w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-white ${
                isOrg ? 'from-blue-500 to-blue-600' : 'from-green-500 to-green-600'
              }`}
            >
              {isOrg ? <Building2 className="w-5 h-5" /> : <BriefcaseBusiness className="w-5 h-5" />}
            </div>

            {/* 信息 */}
            <div>
              <h4 className="font-medium text-gray-900">{item.fd_name}</h4>
              <p className="text-sm text-gray-500 mt-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  isOrg ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }`}>
                  {isOrg ? '机构' : '部门'}
                </span>
                {item.fd_no && <span className="ml-2">编号: {item.fd_no}</span>}
                {item.fd_org_email && <span className="ml-2">邮箱: {item.fd_org_email}</span>}
              </p>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" onClick={() => handleView(item, itemType)} title="查看详情">
              <Eye className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleEdit(item, itemType)} title="编辑">
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(item, itemType)} title="删除">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* 左侧树形结构 */}
      <Card className="w-80 flex flex-col overflow-hidden">
        {/* 树形结构头部 */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Folder className="w-4 h-4" />
              组织架构树
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCreate('organization')}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              title="新建顶层机构"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 树形结构内容 */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading && treeData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              加载中...
            </div>
          ) : treeData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <p className="text-sm mb-2">暂无机构</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCreate('organization')}
              >
                <Plus className="w-4 h-4 mr-1" />
                新建顶层机构
              </Button>
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
          <div className="flex gap-3 items-center">
            {/* 当前选中节点提示 */}
            {selectedNode ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg text-blue-700">
                <Building2 className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {selectedNode.type === 1 ? '机构' : '部门'}：{selectedNodeName}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-gray-500">
                <span className="text-sm">请在左侧选择一个部门</span>
              </div>
            )}

            <div className="flex-1 flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索岗位/人员..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        </Card>

        {/* Tab切换与操作按钮 */}
        <Card className="p-4 mt-4">
          <div className="flex items-center justify-between">
            <Tabs value={currentTab} onValueChange={(v) => setCurrentTab(v as 'org' | 'dept' | 'posts' | 'persons')}>
              <TabsList>
                <TabsTrigger value="org" className="flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  机构 ({orgList.length})
                </TabsTrigger>
                <TabsTrigger value="dept" className="flex items-center gap-1">
                  <BriefcaseBusiness className="w-4 h-4" />
                  部门 ({deptList.length})
                </TabsTrigger>
                <TabsTrigger value="posts" className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  岗位 ({postList.length})
                </TabsTrigger>
                <TabsTrigger value="persons" className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  人员 ({personList.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => handleCreate('organization')}
                disabled={!selectedNode}
                title={!selectedNode ? '请先选择一个部门' : '新建子机构'}
              >
                <Plus className="w-4 h-4 mr-1" />
                新建机构
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCreate('department')}
                disabled={!selectedNode}
                title={!selectedNode ? '请先选择一个部门' : '新建子部门'}
              >
                <Plus className="w-4 h-4 mr-1" />
                新建部门
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCreate('position')}
                disabled={!selectedNode}
                title={!selectedNode ? '请先选择一个部门' : '新建岗位'}
              >
                <Plus className="w-4 h-4 mr-1" />
                新建岗位
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCreate('person')}
                disabled={!selectedNode}
                title={!selectedNode ? '请先选择一个部门' : '新建人员'}
              >
                <Plus className="w-4 h-4 mr-1" />
                新建人员
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
                <Building2 className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg font-medium mb-2">请在左侧选择部门</p>
                <p className="text-sm">选择部门后，可查看该部门的子机构、子部门、岗位和人员信息</p>
              </div>
            ) : (
              <Tabs value={currentTab} onValueChange={(v) => setCurrentTab(v as 'org' | 'dept' | 'posts' | 'persons')}>
                {/* 机构 Tab */}
                <TabsContent value="org" className="m-0 space-y-2">
                  {orgList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                      <Building2 className="w-12 h-12 mb-3 opacity-30" />
                      <p className="text-sm">该部门暂无子机构</p>
                      <p className="text-xs mt-1">点击"新建机构"添加</p>
                    </div>
                  ) : (
                    <>
                      {orgList.map((item, index) => renderOrgListItem(item, index, 'org'))}
                      {orgPagination.totalPages > 1 && (
                        <div className="mt-4 flex justify-center">
                          <Pagination>
                            <PaginationContent>
                              <PaginationItem>
                                <PaginationPrevious 
                                  onClick={() => selectedNode && loadOrgList(selectedNode.id, Math.max(1, orgPagination.page - 1))}
                                  className={orgPagination.page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                              </PaginationItem>
                              {Array.from({ length: Math.min(5, orgPagination.totalPages) }, (_, i) => {
                                const startPage = Math.max(1, Math.min(orgPagination.page - 2, orgPagination.totalPages - 4));
                                const page = startPage + i;
                                return (
                                  <PaginationItem key={page}>
                                    <PaginationLink 
                                      onClick={() => selectedNode && loadOrgList(selectedNode.id, page)}
                                      className={`cursor-pointer ${orgPagination.page === page ? 'bg-blue-100 text-blue-600' : ''}`}
                                    >
                                      {page}
                                    </PaginationLink>
                                  </PaginationItem>
                                );
                              })}
                              <PaginationItem>
                                <PaginationNext 
                                  onClick={() => selectedNode && loadOrgList(selectedNode.id, Math.min(orgPagination.totalPages, orgPagination.page + 1))}
                                  className={orgPagination.page >= orgPagination.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                              </PaginationItem>
                            </PaginationContent>
                          </Pagination>
                        </div>
                      )}
                      <div className="mt-2 text-center text-sm text-gray-500">
                        共 {orgPagination.total} 条记录，第 {orgPagination.page}/{orgPagination.totalPages} 页
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* 部门 Tab */}
                <TabsContent value="dept" className="m-0 space-y-2">
                  {deptList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                      <BriefcaseBusiness className="w-12 h-12 mb-3 opacity-30" />
                      <p className="text-sm">该部门暂无子部门</p>
                      <p className="text-xs mt-1">点击"新建部门"添加</p>
                    </div>
                  ) : (
                    <>
                      {deptList.map((item, index) => renderOrgListItem(item, index, 'dept'))}
                      {deptPagination.totalPages > 1 && (
                        <div className="mt-4 flex justify-center">
                          <Pagination>
                            <PaginationContent>
                              <PaginationItem>
                                <PaginationPrevious 
                                  onClick={() => selectedNode && loadDeptList(selectedNode.id, Math.max(1, deptPagination.page - 1))}
                                  className={deptPagination.page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                              </PaginationItem>
                              {Array.from({ length: Math.min(5, deptPagination.totalPages) }, (_, i) => {
                                const startPage = Math.max(1, Math.min(deptPagination.page - 2, deptPagination.totalPages - 4));
                                const page = startPage + i;
                                return (
                                  <PaginationItem key={page}>
                                    <PaginationLink 
                                      onClick={() => selectedNode && loadDeptList(selectedNode.id, page)}
                                      className={`cursor-pointer ${deptPagination.page === page ? 'bg-blue-100 text-blue-600' : ''}`}
                                    >
                                      {page}
                                    </PaginationLink>
                                  </PaginationItem>
                                );
                              })}
                              <PaginationItem>
                                <PaginationNext 
                                  onClick={() => selectedNode && loadDeptList(selectedNode.id, Math.min(deptPagination.totalPages, deptPagination.page + 1))}
                                  className={deptPagination.page >= deptPagination.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                              </PaginationItem>
                            </PaginationContent>
                          </Pagination>
                        </div>
                      )}
                      <div className="mt-2 text-center text-sm text-gray-500">
                        共 {deptPagination.total} 条记录，第 {deptPagination.page}/{deptPagination.totalPages} 页
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* 岗位 Tab */}
                <TabsContent value="posts" className="m-0 space-y-2">
                  {postList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                      <Users className="w-12 h-12 mb-3 opacity-30" />
                      <p className="text-sm">该部门暂无岗位</p>
                    </div>
                  ) : (
                    <>
                      {postList.map((item, index) => renderListItem(item, 'post', index))}
                      {postPagination.totalPages > 1 && (
                        <div className="mt-4 flex justify-center">
                          <Pagination>
                            <PaginationContent>
                              <PaginationItem>
                                <PaginationPrevious 
                                  onClick={() => selectedNode && loadPostList(selectedNode.id, Math.max(1, postPagination.page - 1))}
                                  className={postPagination.page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                              </PaginationItem>
                              {Array.from({ length: Math.min(5, postPagination.totalPages) }, (_, i) => {
                                const startPage = Math.max(1, Math.min(postPagination.page - 2, postPagination.totalPages - 4));
                                const page = startPage + i;
                                return (
                                  <PaginationItem key={page}>
                                    <PaginationLink 
                                      onClick={() => selectedNode && loadPostList(selectedNode.id, page)}
                                      className={`cursor-pointer ${postPagination.page === page ? 'bg-blue-100 text-blue-600' : ''}`}
                                    >
                                      {page}
                                    </PaginationLink>
                                  </PaginationItem>
                                );
                              })}
                              <PaginationItem>
                                <PaginationNext 
                                  onClick={() => selectedNode && loadPostList(selectedNode.id, Math.min(postPagination.totalPages, postPagination.page + 1))}
                                  className={postPagination.page >= postPagination.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                              </PaginationItem>
                            </PaginationContent>
                          </Pagination>
                        </div>
                      )}
                      <div className="mt-2 text-center text-sm text-gray-500">
                        共 {postPagination.total} 条记录，第 {postPagination.page}/{postPagination.totalPages} 页
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* 人员 Tab */}
                <TabsContent value="persons" className="m-0 space-y-2">
                  {personList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                      <User className="w-12 h-12 mb-3 opacity-30" />
                      <p className="text-sm">该部门暂无人员</p>
                    </div>
                  ) : (
                    <>
                      {personList.map((item, index) => renderListItem(item, 'person', index))}
                      {personPagination.totalPages > 1 && (
                        <div className="mt-4 flex justify-center">
                          <Pagination>
                            <PaginationContent>
                              <PaginationItem>
                                <PaginationPrevious 
                                  onClick={() => selectedNode && loadPersonList(selectedNode.id, Math.max(1, personPagination.page - 1))}
                                  className={personPagination.page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                              </PaginationItem>
                              {Array.from({ length: Math.min(5, personPagination.totalPages) }, (_, i) => {
                                const startPage = Math.max(1, Math.min(personPagination.page - 2, personPagination.totalPages - 4));
                                const page = startPage + i;
                                return (
                                  <PaginationItem key={page}>
                                    <PaginationLink 
                                      onClick={() => selectedNode && loadPersonList(selectedNode.id, page)}
                                      className={`cursor-pointer ${personPagination.page === page ? 'bg-blue-100 text-blue-600' : ''}`}
                                    >
                                      {page}
                                    </PaginationLink>
                                  </PaginationItem>
                                );
                              })}
                              <PaginationItem>
                                <PaginationNext 
                                  onClick={() => selectedNode && loadPersonList(selectedNode.id, Math.min(personPagination.totalPages, personPagination.page + 1))}
                                  className={personPagination.page >= personPagination.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                              </PaginationItem>
                            </PaginationContent>
                          </Pagination>
                        </div>
                      )}
                      <div className="mt-2 text-center text-sm text-gray-500">
                        共 {personPagination.total} 条记录，第 {personPagination.page}/{personPagination.totalPages} 页
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </Card>
      </div>
      {/* 新建/编辑对话框 */}
      <OrgElementDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          loadTreeData();
          if (selectedNode) {
            loadOrgList(selectedNode.id);
            loadDeptList(selectedNode.id);
            loadPostList(selectedNode.id);
            loadPersonList(selectedNode.id);
          }
        }}
        mode={dialogMode}
        viewType={dialogViewType}
        initialData={dialogInitialData}
        parentId={selectedNode?.id}
      />

      {/* 查看详情对话框 */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewItemType === 'org' && <Building2 className="w-5 h-5 text-blue-600" />}
              {viewItemType === 'dept' && <BriefcaseBusiness className="w-5 h-5 text-green-600" />}
              {viewItemType === 'post' && <Users className="w-5 h-5 text-purple-600" />}
              {viewItemType === 'person' && <User className="w-5 h-5 text-orange-600" />}
              {viewItemType === 'org' && '机构详情'}
              {viewItemType === 'dept' && '部门详情'}
              {viewItemType === 'post' && '岗位详情'}
              {viewItemType === 'person' && '人员详情'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-sm text-gray-500">名称</div>
              <div className="col-span-2 text-sm font-medium">{viewItem?.fd_name}</div>
            </div>
            {viewItem?.fd_no && (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-sm text-gray-500">编号</div>
                <div className="col-span-2 text-sm">{viewItem.fd_no}</div>
              </div>
            )}
            {(viewItem as OrgElement)?.fd_org_email && (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-sm text-gray-500">邮箱</div>
                <div className="col-span-2 text-sm">{(viewItem as OrgElement).fd_org_email}</div>
              </div>
            )}
            {viewItem?.fd_order !== undefined && (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-sm text-gray-500">排序号</div>
                <div className="col-span-2 text-sm">{viewItem.fd_order}</div>
              </div>
            )}
            {viewItem?.fd_memo && (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-sm text-gray-500">备注</div>
                <div className="col-span-2 text-sm">{viewItem.fd_memo}</div>
              </div>
            )}
            {/* 人员特有字段 */}
            {viewItemType === 'person' && (
              <>
                {(viewItem as OrgPerson).fd_login_name && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-sm text-gray-500">登录名</div>
                    <div className="col-span-2 text-sm">{(viewItem as OrgPerson).fd_login_name}</div>
                  </div>
                )}
                {(viewItem as OrgPerson).fd_email && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-sm text-gray-500">邮箱</div>
                    <div className="col-span-2 text-sm">{(viewItem as OrgPerson).fd_email}</div>
                  </div>
                )}
                {(viewItem as OrgPerson).fd_mobile && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-sm text-gray-500">手机</div>
                    <div className="col-span-2 text-sm">{(viewItem as OrgPerson).fd_mobile}</div>
                  </div>
                )}
              </>
            )}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-sm text-gray-500">ID</div>
              <div className="col-span-2 text-xs text-gray-400 break-all">{viewItem?.fd_id}</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>关闭</Button>
            <Button
              onClick={() => {
                setViewDialogOpen(false);
                handleEdit(viewItem!, viewItemType);
              }}
            >
              编辑
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
