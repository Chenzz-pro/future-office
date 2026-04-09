#!/bin/bash
# 测试脚本：验证外键约束修复

echo "======================================"
echo "外键约束修复验证测试"
echo "======================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试数据库连接（如果有配置）
echo -e "${YELLOW}测试 1: 检查服务是否运行${NC}"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 2>/dev/null)
if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ 服务运行正常 (HTTP $RESPONSE)${NC}"
else
    echo -e "${RED}❌ 服务未运行或响应异常 (HTTP $RESPONSE)${NC}"
fi
echo ""

echo -e "${YELLOW}测试 2: 检查 TypeScript 编译${NC}"
cd /workspace/projects
if pnpm ts-check > /dev/null 2>&1; then
    echo -e "${GREEN}✅ TypeScript 编译通过${NC}"
else
    echo -e "${RED}❌ TypeScript 编译失败${NC}"
fi
echo ""

echo -e "${YELLOW}测试 3: 检查 system 用户 ID 定义${NC}"
if grep -r "00000000-0000-0000-0000-000000000000" src/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ system 用户 ID 定义正确${NC}"
    echo "   找到的文件："
    grep -l "00000000-0000-0000-0000-000000000000" src/ | head -5
else
    echo -e "${RED}❌ 未找到 system 用户 ID 定义${NC}"
fi
echo ""

echo -e "${YELLOW}测试 4: 检查是否还有使用 'system' 字符串的地方${NC}"
COUNT=$(grep -r "userId.*'system'" src/ 2>/dev/null | grep -v "00000000-0000-0000-0000-000000000000" | wc -l)
if [ "$COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ 没有发现旧的 'system' 字符串使用${NC}"
else
    echo -e "${RED}❌ 发现 $COUNT 处使用旧的 'system' 字符串${NC}"
    grep -rn "userId.*'system'" src/ | grep -v "00000000-0000-0000-0000-000000000000"
fi
echo ""

echo -e "${YELLOW}测试 5: 检查数据库 Schema 是否包含 system 用户${NC}"
if grep -q "00000000-0000-0000-0000-000000000000" database-schema.sql 2>/dev/null; then
    echo -e "${GREEN}✅ 数据库 Schema 包含 system 用户${NC}"
else
    echo -e "${RED}❌ 数据库 Schema 不包含 system 用户${NC}"
fi
echo ""

echo -e "${YELLOW}测试 6: 检查迁移脚本是否存在${NC}"
if [ -f "migrations/20260405_fix_system_user_id.sql" ]; then
    echo -e "${GREEN}✅ 迁移脚本存在${NC}"
else
    echo -e "${RED}❌ 迁移脚本不存在${NC}"
fi
echo ""

echo -e "${YELLOW}测试 7: 检查自动迁移逻辑是否存在${NC}"
if grep -q "migrateSystemUserId" src/lib/database/manager.ts 2>/dev/null; then
    echo -e "${GREEN}✅ 自动迁移逻辑已实现${NC}"
else
    echo -e "${RED}❌ 自动迁移逻辑不存在${NC}"
fi
echo ""

echo "======================================"
echo "测试完成"
echo "======================================"
echo ""
echo "📚 相关文档："
echo "  - FOREIGN_KEY_FIX.md - 详细修复说明"
echo "  - migrations/20260405_fix_system_user_id.sql - 手动迁移脚本"
echo ""
echo "🔧 手动测试步骤："
echo "  1. 访问管理员后台：http://localhost:5000/admin/integration/llm"
echo "  2. 点击 '添加 API 密钥'"
echo "  3. 填写豆包 API Key 信息并提交"
echo "  4. 验证是否成功添加，不再出现外键约束错误"
echo ""
