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
import { Building2, Briefcase, Users } from 'lucide-react';
import type { OrgElement, OrgPerson } from '@/types/org-structure';

interface OrgElementDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
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

  // 初始化表单数据
  useEffect(() => {
    if (open) {
      if (initialData && mode === 'edit') {
        setFormData(initialData as unknown as Record<string, unknown>);
      } else {
        setFormData({
          fd_name: '',
          fd_no: '',
          fd_order: 0,
          fd_email: '',
          fd_memo: '',
          fd_login_name: '',
          fd_mobile: '',
        });
      }
    }
  }, [open, initialData, mode]);

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

      await onSave({
        ...formData,
        ...(parentId && { fd_parentid: parentId }),
        ...(mode === 'create' && {
          fd_org_type: viewType === 'organization' ? 1 : viewType === 'department' ? 2 : 3,
        }),
      });

      console.log('[OrgElementDialog] 保存成功');
      onClose();
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
