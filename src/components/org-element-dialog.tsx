'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Briefcase, Users, Shield } from 'lucide-react';
import type { OrgElement, OrgPerson } from '@/types/org-structure';

interface Role {
  fd_id: string;
  fd_name: string;
  fd_code: string;
}

interface OrgElementSimple {
  fd_id: string;
  fd_name: string;
  fd_org_type: number;
}

interface OrgElementDialogProps {
  open: boolean;
  onClose: () => void;
  onSave?: (data: Record<string, unknown>) => Promise<void>;
  mode: 'create' | 'edit';
  viewType: 'organization' | 'department' | 'position' | 'person';
  initialData?: OrgElement | OrgPerson | null;
  parentId?: string;
}

export function OrgElementDialog({
  open,
  onClose,
  onSave,
  mode,
  viewType,
  initialData,
  parentId,
}: OrgElementDialogProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);

  // 角色相关
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // 机构和部门相关
  const [organizations, setOrganizations] = useState<OrgElementSimple[]>([]);
  const [departments, setDepartments] = useState<OrgElementSimple[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

  // 加载角色列表
  useEffect(() => {
    if (viewType === 'person' && open) {
      loadRoles();
    }
  }, [viewType, open]);

  const loadRoles = async () => {
    try {
      setLoadingRoles(true);
      const response = await fetch('/api/organization/role');
      const data = await response.json();
      if (data.success) {
        setRoles(data.data || []);
      }
    } catch (error) {
      console.error('加载角色列表失败:', error);
    } finally {
      setLoadingRoles(false);
    }
  };

  // 加载机构列表
  useEffect(() => {
    if (viewType === 'person' && open) {
      loadOrganizations();
    }
  }, [viewType, open]);

  const loadOrganizations = async () => {
    try {
      setLoadingOrgs(true);
      const response = await fetch('/api/organization?action=list&type=organization');
      const data = await response.json();
      if (data.success) {
        setOrganizations(data.data || []);
      }
    } catch (error) {
      console.error('加载机构列表失败:', error);
    } finally {
      setLoadingOrgs(false);
    }
  };

  // 加载部门列表（根据选中的机构）
  useEffect(() => {
    if (selectedOrgId && open) {
      loadDepartments(selectedOrgId);
    } else {
      setDepartments([]);
    }
  }, [selectedOrgId, open]);

  const loadDepartments = async (orgId: string) => {
    try {
      setLoadingOrgs(true);
      const response = await fetch(`/api/organization?action=list&type=department&parentId=${orgId}`);
      const data = await response.json();
      if (data.success) {
        setDepartments(data.data || []);
      }
    } catch (error) {
      console.error('加载部门列表失败:', error);
    } finally {
      setLoadingOrgs(false);
    }
  };

  // 初始化表单数据
  useEffect(() => {
    if (open) {
      if (initialData && mode === 'edit') {
        const data = initialData as unknown as Record<string, unknown>;
        setFormData(data);
      } else {
        setFormData({
          fd_name: '',
          fd_no: '',
          fd_order: 0,
          fd_email: '',
          fd_memo: '',
          fd_login_name: '',
          fd_mobile: '',
          fd_dept_id: '',
          fd_role: '',
        });
        setSelectedOrgId('');
      }
    }
  }, [open, initialData, mode, viewType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      console.log('[OrgElementDialog] 开始保存数据', {
        mode,
        viewType,
        formData,
        parentId,
      });

      // 如果提供了 onSave prop，使用旧的方式
      if (onSave) {
        await onSave({
          ...formData,
          ...(parentId && { fd_parentid: parentId }),
          ...(mode === 'create' && {
            fd_org_type: viewType === 'organization' ? 1 : viewType === 'department' ? 2 : 3,
          }),
        });
        console.log('[OrgElementDialog] 保存成功');
        onClose();
        return;
      }

      // 否则，直接调用 API（新方式）
      const response = await fetch('/api/organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: mode === 'create' ? 'create' : 'update',
          type: viewType === 'person' ? 'person' : viewType,
          ...(mode === 'create' ? { data: formData } : { id: initialData?.fd_id, data: formData }),
          ...(parentId && { parentId }),
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('[OrgElementDialog] 保存成功', result);

        // 如果有生成的密码，显示提示
        if (result.message && result.generatedPassword) {
          alert(`${result.message}\n\n请妥善保管登录密码！`);
        } else if (result.message) {
          alert(result.message);
        } else {
          alert('保存成功');
        }

        onClose();
      } else {
        throw new Error(result.error || '保存失败');
      }
    } catch (error) {
      console.error('[OrgElementDialog] 保存失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert(`保存失败：${errorMessage}\n\n请检查数据库连接是否正常`);
    } finally {
      setLoading(false);
    }
  };

  const viewConfigs = {
    organization: { label: '机构', icon: Building2, color: 'text-blue-600' },
    department: { label: '部门', icon: Briefcase, color: 'text-green-600' },
    position: { label: '岗位', icon: Users, color: 'text-purple-600' },
    person: { label: '人员', icon: Users, color: 'text-orange-600' },
  };

  const config = viewConfigs[viewType];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <config.icon className={`w-5 h-5 ${config.color}`} />
            {mode === 'create' ? `新建${config.label}` : `编辑${config.label}`}
          </DialogTitle>
          <div className="text-sm text-gray-500">
            当前类型：<span className={`font-medium ${config.color}`}>{config.label}</span>
            {mode === 'create' && parentId && ' | 所属父级：已选择'}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* 名称 */}
            <div className="col-span-2">
              <Label htmlFor="fd_name">
                {config.label}名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fd_name"
                value={String(formData.fd_name || '')}
                onChange={(e) => setFormData({ ...formData, fd_name: e.target.value })}
                placeholder={`请输入${config.label}名称`}
                required
              />
            </div>

            {/* 编号 */}
            <div>
              <Label htmlFor="fd_no">编号</Label>
              <Input
                id="fd_no"
                value={String(formData.fd_no || '')}
                onChange={(e) => setFormData({ ...formData, fd_no: e.target.value })}
                placeholder="请输入编号"
              />
            </div>

            {/* 排序号 */}
            <div>
              <Label htmlFor="fd_order">排序号</Label>
              <Input
                id="fd_order"
                type="number"
                value={Number(formData.fd_order || 0)}
                onChange={(e) => setFormData({ ...formData, fd_order: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            {/* 邮箱 */}
            {viewType === 'person' ? (
              <>
                {/* 机构选择 */}
                <div>
                  <Label htmlFor="fd_org_id">
                    关联机构 <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={String(formData.fd_org_id || selectedOrgId || '')}
                    onValueChange={(value) => {
                      setSelectedOrgId(value);
                      setFormData({ ...formData, fd_org_id: value, fd_dept_id: '' });
                    }}
                  >
                    <SelectTrigger id="fd_org_id">
                      <SelectValue placeholder="请选择机构" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingOrgs ? (
                        <div className="p-2 text-sm text-gray-500">加载中...</div>
                      ) : organizations.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">暂无机构</div>
                      ) : (
                        organizations.map((org) => (
                          <SelectItem key={org.fd_id} value={org.fd_id}>
                            {org.fd_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* 部门选择 */}
                <div>
                  <Label htmlFor="fd_dept_id">
                    关联部门 <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={String(formData.fd_dept_id || '')}
                    onValueChange={(value) => setFormData({ ...formData, fd_dept_id: value })}
                    disabled={!selectedOrgId && !formData.fd_org_id}
                  >
                    <SelectTrigger id="fd_dept_id">
                      <SelectValue placeholder={selectedOrgId || formData.fd_org_id ? '请选择部门' : '请先选择机构'} />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingOrgs ? (
                        <div className="p-2 text-sm text-gray-500">加载中...</div>
                      ) : departments.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">
                          {selectedOrgId || formData.fd_org_id ? '暂无部门' : '请先选择机构'}
                        </div>
                      ) : (
                        departments.map((dept) => (
                          <SelectItem key={dept.fd_id} value={dept.fd_id}>
                            {dept.fd_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* 角色选择 */}
                <div className="col-span-2">
                  <Label htmlFor="fd_role">
                    关联角色 <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={String(formData.fd_role || '')}
                    onValueChange={(value) => setFormData({ ...formData, fd_role: value })}
                  >
                    <SelectTrigger id="fd_role">
                      <SelectValue placeholder="请选择角色" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingRoles ? (
                        <div className="p-2 text-sm text-gray-500">加载中...</div>
                      ) : roles.length === 0 ? (
                        <div className="p-3">
                          <div className="text-sm text-gray-500 mb-2">
                            暂无角色数据
                          </div>
                          <div className="text-xs text-gray-400 mb-2">
                            请先在角色管理页面创建角色，或初始化角色表
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const response = await fetch('/api/database/init/role', {
                                  method: 'POST',
                                });
                                const data = await response.json();
                                if (data.success) {
                                  alert('角色表初始化成功！请重新打开对话框。');
                                  await loadRoles();
                                } else {
                                  alert('角色表初始化失败：' + data.error);
                                }
                              } catch (error) {
                                alert('角色表初始化失败：' + (error as Error).message);
                              }
                            }}
                            className="w-full px-3 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                          >
                            初始化角色表
                          </button>
                        </div>
                      ) : (
                        roles.map((role) => (
                          <SelectItem key={role.fd_id} value={role.fd_id}>
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-orange-600" />
                              {role.fd_name}
                              <span className="text-xs text-gray-500">({role.fd_code})</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="fd_email">邮箱</Label>
                  <Input
                    id="fd_email"
                    type="email"
                    value={String(formData.fd_email || '')}
                    onChange={(e) => setFormData({ ...formData, fd_email: e.target.value })}
                    placeholder="请输入邮箱"
                  />
                </div>
                <div>
                  <Label htmlFor="fd_mobile">手机号码</Label>
                  <Input
                    id="fd_mobile"
                    value={String(formData.fd_mobile || '')}
                    onChange={(e) => setFormData({ ...formData, fd_mobile: e.target.value })}
                    placeholder="请输入手机号码"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="fd_login_name">
                    登录名 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="fd_login_name"
                    value={String(formData.fd_login_name || '')}
                    onChange={(e) => setFormData({ ...formData, fd_login_name: e.target.value })}
                    placeholder="请输入登录名"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="fd_password">
                    登录密码 <span className="text-gray-500 text-xs font-normal ml-1">
                      (留空则自动生成12位随机密码)
                    </span>
                  </Label>
                  <Input
                    id="fd_password"
                    type="password"
                    value={String(formData.fd_password || '')}
                    onChange={(e) => setFormData({ ...formData, fd_password: e.target.value })}
                    placeholder="请输入登录密码（留空自动生成）"
                  />
                </div>
              </>
            ) : (
              <div className="col-span-2">
                <Label htmlFor="fd_email">组织邮箱</Label>
                <Input
                  id="fd_email"
                  type="email"
                  value={String(formData.fd_email || '')}
                  onChange={(e) => setFormData({ ...formData, fd_email: e.target.value })}
                  placeholder="请输入组织邮箱"
                />
              </div>
            )}

            {/* 备注 */}
            <div className="col-span-2">
              <Label htmlFor="fd_memo">备注</Label>
              <Textarea
                id="fd_memo"
                value={String(formData.fd_memo || '')}
                onChange={(e) => setFormData({ ...formData, fd_memo: e.target.value })}
                placeholder="请输入备注信息"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '保存中...' : mode === 'create' ? '新建' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
