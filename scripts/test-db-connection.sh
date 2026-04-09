#!/bin/bash

# 数据库连接测试脚本

echo "====================================="
echo "数据库连接测试"
echo "====================================="
echo ""

# 配置信息
HOST="ts708yr65368.vicp.fun"
PORT=33787
DATABASE="newwork"
USERNAME="root"

echo "数据库配置："
echo "  主机：$HOST"
echo "  端口：$PORT"
echo "  数据库：$DATABASE"
echo "  用户名：$USERNAME"
echo ""

# 提示输入密码
read -sp "请输入数据库密码：" PASSWORD
echo ""

# 测试连接
echo "正在测试数据库连接..."
echo ""

# 使用curl调用诊断API
RESPONSE=$(curl -s -X POST http://localhost:5000/api/database/diagnose \
  -H "Content-Type: application/json" \
  -d "{
    \"host\": \"$HOST\",
    \"port\": $PORT,
    \"databaseName\": \"$DATABASE\",
    \"username\": \"$USERNAME\",
    \"password\": \"$PASSWORD\"
  }")

# 显示结果
echo "测试结果："
echo "$RESPONSE" | jq .

# 检查是否成功
SUCCESS=$(echo "$RESPONSE" | jq -r '.success')

if [ "$SUCCESS" == "true" ]; then
  echo ""
  echo "✅ 数据库连接成功！"

  # 检查admin账户
  ADMIN_EXISTS=$(echo "$RESPONSE" | jq -r '.adminExists')
  if [ "$ADMIN_EXISTS" == "true" ]; then
    echo "✅ 检测到admin账户存在"
  else
    echo "⚠️ 未检测到admin账户"
  fi
else
  echo ""
  echo "❌ 数据库连接失败"
  ERROR=$(echo "$RESPONSE" | jq -r '.error')
  ERROR_TYPE=$(echo "$RESPONSE" | jq -r '.errorType')

  echo "错误信息：$ERROR"
  echo "错误类型：$ERROR_TYPE"

  case $ERROR_TYPE in
    "access_denied")
      echo ""
      echo "💡 解决方案："
      echo "   1. 检查用户名和密码是否正确"
      echo "   2. 确认数据库用户权限"
      echo "   3. 如果密码已更改，请更新配置文件"
      ;;
    "connection_refused")
      echo ""
      echo "💡 解决方案："
      echo "   1. 检查数据库服务器是否启动"
      echo "   2. 检查网络连接"
      echo "   3. 确认主机地址和端口正确"
      ;;
    "database_not_found")
      echo ""
      echo "💡 解决方案："
      echo "   1. 确认数据库名称正确"
      echo "   2. 如果数据库不存在，请先创建数据库"
      ;;
    *)
      echo ""
      echo "💡 解决方案："
      echo "   1. 检查所有配置信息"
      echo "   2. 查看数据库服务器日志"
      echo "   3. 联系数据库管理员"
      ;;
  esac
fi

echo ""
echo "====================================="
