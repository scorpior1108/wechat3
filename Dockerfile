# 使用官方Node.js 20 Alpine镜像作为基础镜像
FROM node:20-alpine AS base

# 构建参数
ARG NODE_ENV=production

# 检查https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine
RUN apk add --no-cache libc6-compat

# 构建阶段
FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production
COPY . .

# 设置环境变量
ENV NODE_ENV=${NODE_ENV}

# 运行阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 wechatapp

# 复制依赖和应用文件
COPY --from=builder --chown=wechatapp:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=wechatapp:nodejs /app/server ./server
COPY --from=builder --chown=wechatapp:nodejs /app/public ./public
COPY --from=builder --chown=wechatapp:nodejs /app/char.txt ./char.txt
COPY --from=builder --chown=wechatapp:nodejs /app/char01.txt ./char01.txt
COPY --from=builder --chown=wechatapp:nodejs /app/package.json ./package.json

USER wechatapp

EXPOSE 4444

ENV PORT 4444

# 启动应用
CMD ["node", "server/app.js"]