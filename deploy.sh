#!/bin/bash

# 奶牛线性评定系统 - 一键部署脚本
# 使用方法: ./deploy.sh

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置变量
SERVER_USER="ecs-user"
SERVER_HOST="39.96.189.27"
SSH_KEY="./linear-scoring.pem"
REMOTE_DIR="/home/ecs-user/dairy-scoring"
LOCAL_SERVER_DIR="./server"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}奶牛线性评定系统 - 部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}⚠️  安全提示：${NC}"
echo -e "${YELLOW}   本脚本仅修改 $REMOTE_DIR 目录${NC}"
echo -e "${YELLOW}   不会影响服务器上的其他项目${NC}"
echo ""

# 步骤 1: 检查本地文件
echo -e "${YELLOW}[1/8] 检查本地文件...${NC}"
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}错误: SSH密钥文件不存在: $SSH_KEY${NC}"
    exit 1
fi

if [ ! -f "$LOCAL_SERVER_DIR/.env" ]; then
    echo -e "${RED}错误: .env配置文件不存在: $LOCAL_SERVER_DIR/.env${NC}"
    exit 1
fi

chmod 400 "$SSH_KEY"
echo -e "${GREEN}✓ 本地文件检查完成${NC}"
echo ""

# 步骤 2: 测试SSH连接
echo -e "${YELLOW}[2/8] 测试SSH连接...${NC}"
ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "echo '连接成功'" || {
    echo -e "${RED}错误: SSH连接失败${NC}"
    exit 1
}
echo -e "${GREEN}✓ SSH连接正常${NC}"
echo ""

# 步骤 3: 在服务器上安装Node.js和PM2
echo -e "${YELLOW}[3/8] 安装Node.js和PM2...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" << 'EOF'
# 检查Node.js是否已安装
if ! command -v node &> /dev/null; then
    echo "安装Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "Node.js已安装: $(node --version)"
fi

# 检查PM2是否已安装
if ! command -v pm2 &> /dev/null; then
    echo "安装PM2..."
    sudo npm install -g pm2
else
    echo "PM2已安装: $(pm2 --version)"
fi

# 验证安装
node --version
npm --version
pm2 --version
EOF
echo -e "${GREEN}✓ Node.js和PM2安装完成${NC}"
echo ""

# 步骤 4: 创建远程目录
echo -e "${YELLOW}[4/8] 创建远程目录...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" << EOF
mkdir -p $REMOTE_DIR
mkdir -p $REMOTE_DIR/logs
EOF
echo -e "${GREEN}✓ 远程目录创建完成${NC}"
echo ""

# 步骤 5: 同步代码到服务器
echo -e "${YELLOW}[5/8] 同步代码到服务器...${NC}"
rsync -avz --progress \
    -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'logs' \
    --exclude '.DS_Store' \
    "$LOCAL_SERVER_DIR/" "$SERVER_USER@$SERVER_HOST:$REMOTE_DIR/"
echo -e "${GREEN}✓ 代码同步完成${NC}"
echo ""

# 步骤 6: 安装依赖
echo -e "${YELLOW}[6/8] 安装npm依赖...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" << EOF
cd $REMOTE_DIR
npm install --production
EOF
echo -e "${GREEN}✓ 依赖安装完成${NC}"
echo ""

# 步骤 7: 初始化数据库
echo -e "${YELLOW}[7/8] 初始化数据库...${NC}"
read -p "是否需要初始化数据库？这将创建表结构和测试数据 (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" << EOF
cd $REMOTE_DIR
node src/scripts/init-db.js
EOF
    echo -e "${GREEN}✓ 数据库初始化完成${NC}"
else
    echo -e "${YELLOW}⊘ 跳过数据库初始化${NC}"
fi
echo ""

# 步骤 8: 启动/重启应用
echo -e "${YELLOW}[8/8] 启动应用...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" << EOF
cd $REMOTE_DIR

# 停止旧进程（如果存在）
pm2 stop dairy-scoring-api 2>/dev/null || true
pm2 delete dairy-scoring-api 2>/dev/null || true

# 启动新进程
pm2 start pm2.config.js

# 保存PM2进程列表
pm2 save

# 设置开机自启动
sudo env PATH=\$PATH:/usr/bin pm2 startup systemd -u $SERVER_USER --hp /home/$SERVER_USER

# 显示状态
pm2 status
pm2 logs dairy-scoring-api --lines 20 --nostream
EOF
echo -e "${GREEN}✓ 应用启动完成${NC}"
echo ""

# 完成
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}后续步骤:${NC}"
echo "1. 配置Nginx反向代理（参考 server/nginx.conf）"
echo "2. 测试API端点: https://api.genepop.com/health"
echo "3. 查看应用日志: ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST 'pm2 logs dairy-scoring-api'"
echo "4. 查看应用状态: ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST 'pm2 status'"
echo ""
echo -e "${YELLOW}常用命令:${NC}"
echo "- 重启应用: ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST 'pm2 restart dairy-scoring-api'"
echo "- 停止应用: ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST 'pm2 stop dairy-scoring-api'"
echo "- 查看日志: ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST 'pm2 logs dairy-scoring-api'"
echo ""
