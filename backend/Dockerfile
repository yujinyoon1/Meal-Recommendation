# Multi-stage build for backend (Node 20 LTS)
# build → run. dist만 운영 이미지에 포함.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=9534

# 운영 의존성만
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY src/db/migrations ./dist/db/migrations
COPY src/db/seeds ./dist/db/seeds

# 비루트
RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 9534

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:9534/health/live || exit 1

CMD ["node", "dist/server.js"]
