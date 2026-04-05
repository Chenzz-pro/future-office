/**
 * 组织架构管理 API
 * 提供机构、部门、岗位、人员的增删改查功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { orgElementRepository } from '@/lib/database/repositories/org-element.repository';
import { orgPersonRepository } from '@/lib/database/repositories/org-person.repository';
import { OrgElementType, OrgElementDTO, OrgPersonDTO, OrgTreeNode, OrgPerson } from '@/types/org-structure';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const type = searchParams.get('type'); // organization, department, position, person

    switch (action) {
      case 'tree':
        // 获取组织架构树
        const treeType = type as OrgElementType | undefined;
        const rootId = searchParams.get('rootId') || undefined;
        const tree = await orgElementRepository.getTree(treeType, rootId);
        return NextResponse.json({ success: true, data: tree });

      case 'list':
        // 获取列表
        if (type === 'person') {
          // 获取人员列表
          const deptId = searchParams.get('deptId') || undefined;
          const postId = searchParams.get('postId') || undefined;
          const keyword = searchParams.get('keyword') || undefined;
          const page = parseInt(searchParams.get('page') || '1');
          const pageSize = parseInt(searchParams.get('pageSize') || '20');

          const result = await orgPersonRepository.findList({
            fd_dept_id: deptId,
            fd_post_id: postId,
            keyword,
            page,
            pageSize
          });
          return NextResponse.json({ success: true, data: result });
        } else {
          // 获取机构/部门/岗位列表
          const orgType = type ? parseInt(type) as OrgElementType : undefined;
          const parentId = searchParams.get('parentId') || undefined;
          const parentOrgId = searchParams.get('parentOrgId') || undefined;
          const keyword = searchParams.get('keyword') || undefined;

          const elements = await orgElementRepository.findList({
            fd_org_type: orgType,
            fd_parentid: parentId,
            fd_parentorgid: parentOrgId,
            keyword
          });
          return NextResponse.json({ success: true, data: elements });
        }

      case 'detail':
        // 获取详情
        const id = searchParams.get('id');
        if (!id) {
          return NextResponse.json({ success: false, error: '缺少ID参数' }, { status: 400 });
        }

        if (type === 'person') {
          const person = await orgPersonRepository.findById(id);
          if (!person) {
            return NextResponse.json({ success: false, error: '人员不存在' }, { status: 404 });
          }
          return NextResponse.json({ success: true, data: person });
        } else {
          const element = await orgElementRepository.findById(id);
          if (!element) {
            return NextResponse.json({ success: false, error: '组织元素不存在' }, { status: 404 });
          }
          return NextResponse.json({ success: true, data: element });
        }

      default:
        return NextResponse.json({ success: false, error: '无效的操作' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('组织架构API错误:', error);
    return NextResponse.json(
      { success: false, error: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, type, data } = body;

    switch (action) {
      case 'create':
        // 创建
        if (type === 'person') {
          const personDTO = data as OrgPersonDTO;
          const personId = await orgPersonRepository.create(personDTO);
          const person = await orgPersonRepository.findById(personId);
          return NextResponse.json({ success: true, data: person });
        } else {
          const elementDTO = data as OrgElementDTO;
          const elementId = await orgElementRepository.create(elementDTO);
          const element = await orgElementRepository.findById(elementId);
          return NextResponse.json({ success: true, data: element });
        }

      case 'update':
        // 更新
        const { id } = body;
        if (!id) {
          return NextResponse.json({ success: false, error: '缺少ID参数' }, { status: 400 });
        }

        if (type === 'person') {
          await orgPersonRepository.update(id, data);
          const person = await orgPersonRepository.findById(id);
          return NextResponse.json({ success: true, data: person });
        } else {
          await orgElementRepository.update(id, data);
          const element = await orgElementRepository.findById(id);
          return NextResponse.json({ success: true, data: element });
        }

      case 'delete':
        // 删除
        const { id: deleteId } = body;
        if (!deleteId) {
          return NextResponse.json({ success: false, error: '缺少ID参数' }, { status: 400 });
        }

        if (type === 'person') {
          await orgPersonRepository.delete(deleteId);
        } else {
          await orgElementRepository.delete(deleteId);
        }
        return NextResponse.json({ success: true, message: '删除成功' });

      default:
        return NextResponse.json({ success: false, error: '无效的操作' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('组织架构API错误:', error);
    return NextResponse.json(
      { success: false, error: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}
