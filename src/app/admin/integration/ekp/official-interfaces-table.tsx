'use client';

import { useState, useEffect } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Search, Edit, Play, MoreVertical, Loader2,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function OfficialInterfacesTable({ onRefresh }: { onRefresh?: () => void }) {
  const [interfaces, setInterfaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    loadInterfaces();
  }, []);

  const loadInterfaces = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/ekp-interfaces?type=official');
      const data = await res.json();
      if (data.success) {
        setInterfaces(data.data || []);
      }
    } catch (error) {
      console.error('加载接口失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 过滤接口
  const filteredInterfaces = interfaces.filter((item: any) =>
    !searchKeyword ||
    item.code.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    item.name.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 搜索栏 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索接口代码、名称..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* 接口列表 */}
      {filteredInterfaces.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          {searchKeyword ? '未找到匹配的接口' : '暂无官方接口'}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">接口代码</TableHead>
                <TableHead>接口名称</TableHead>
                <TableHead className="w-[120px]">分类</TableHead>
                <TableHead className="w-[300px]">API路径</TableHead>
                <TableHead className="w-[120px]">服务标识</TableHead>
                <TableHead className="w-[80px]">方法</TableHead>
                <TableHead className="w-[80px]">状态</TableHead>
                <TableHead className="w-[100px]">版本</TableHead>
                <TableHead className="w-[120px] text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInterfaces.map((item: any) => (
                <TableRow key={item.id || item.code}>
                  <TableCell className="font-mono text-sm">{item.code}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.name}</div>
                      {item.description && (
                        <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.category}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{item.path}</TableCell>
                  <TableCell className="font-mono text-xs">{item.serviceId}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.method}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.enabled ? 'default' : 'secondary'}>
                      {item.enabled ? '启用' : '禁用'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{item.version}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Play className="w-4 h-4 mr-2" />
                          测试
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
