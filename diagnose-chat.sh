# 对话功能问题诊断脚本

#!/bin/bash

echo "======================================"
echo "对话功能问题诊断"
echo "======================================"
echo ""

# 测试 1: 检查服务运行
echo -e "测试 1: 检查服务运行"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 2>/dev/null)
if [ "$RESPONSE" = "200" ]; then
    echo "✅ 服务运行正常"
else
    echo "❌ 服务未运行"
    exit 1
fi
echo ""

# 测试 2: 检查 LLM 配置 API
echo -e "测试 2: 检查 LLM 配置"
LLM_CONFIG=$(curl -s http://localhost:5000/api/config/llm 2>/dev/null)
echo "LLM 配置响应:"
echo "$LLM_CONFIG" | python3 -m json.tool 2>/dev/null || echo "$LLM_CONFIG"
echo ""

# 测试 3: 检查数据库连接
echo -e "测试 3: 检查数据库连接"
DB_STATUS=$(curl -s http://localhost:5000/api/database 2>/dev/null)
echo "数据库状态:"
echo "$DB_STATUS" | python3 -m json.tool 2>/dev/null || echo "$DB_STATUS"
echo ""

# 测试 4: 检查 API Keys
echo -e "测试 4: 检查 API Keys"
API_KEYS=$(curl -s http://localhost:5000/api/admin/api-keys 2>/dev/null)
echo "API Keys 列表:"
echo "$API_KEYS" | python3 -m json.tool 2>/dev/null || echo "$API_KEYS"
echo ""

# 测试 5: 测试对话 API（如果有 API Key）
echo -e "测试 5: 测试对话 API"
if echo "$LLM_CONFIG" | grep -q '"success":true'; then
    echo "检测到 LLM 配置，测试对话 API..."
    TEST_RESPONSE=$(curl -s -X POST http://localhost:5000/api/chat \
        -H "Content-Type: application/json" \
        -d '{
            "messages": [
                {"role": "system", "content": "你是一个有帮助的 AI 助手。"},
                {"role": "user", "content": "1+1=?"}
            ],
            "model": "gpt-4o",
            "apiKey": "test-key",
            "baseUrl": "https://api.openai.com/v1",
            "provider": "openai"
        }' 2>/dev/null)
    echo "对话 API 响应:"
    echo "$TEST_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$TEST_RESPONSE"
else
    echo "⚠️ 未检测到 LLM 配置，跳过对话 API 测试"
fi
echo ""

echo "======================================"
echo "诊断完成"
echo "======================================"
echo ""
echo "可能的问题："
echo "1. 没有配置 API Key → 需要在管理员后台添加 API Key"
echo "2. 数据库未连接 → 需要在管理员后台配置数据库"
echo "3. API Key 无效 → 需要检查 API Key 是否正确"
echo ""
echo "解决步骤："
echo "1. 访问管理员后台: http://localhost:5000/admin/database"
echo "2. 连接数据库"
echo "3. 访问: http://localhost:5000/admin/integration/llm"
echo "4. 添加 API Key（豆包、OpenAI 等）"
echo "5. 刷新普通用户页面，测试对话功能"
echo ""
