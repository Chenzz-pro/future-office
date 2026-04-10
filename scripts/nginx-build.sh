#!/bin/bash
# Nginx + Next.js 生产环境构建和启动脚本

set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
NGINX_PORT="${NGINX_PORT:-5000}"
NEXTJS_PORT="${NEXTJS_PORT:-5001}"

echo "========================================"
echo "  Nginx + Next.js 生产环境构建"
echo "========================================"

# 构建 Next.js
echo "[1/3] 构建 Next.js..."
cd "${COZE_WORKSPACE_PATH}"
pnpm build
echo "  ✓ Next.js 构建完成"

# 检查 Nginx 配置
echo "[2/3] 检查 Nginx 配置..."
nginx -t -c "${COZE_WORKSPACE_PATH}/nginx/nginx.conf" 2>&1 || {
    echo "ERROR: Nginx 配置验证失败"
    exit 1
}
echo "  ✓ Nginx 配置验证通过"

# 停止现有进程
echo "[3/3] 停止现有进程..."
pkill -9 nginx 2>/dev/null || true
sleep 1

echo ""
echo "========================================"
echo "  构建完成，准备启动..."
echo "========================================"
echo "  启动命令: bash scripts/nginx-start.sh"
echo ""
