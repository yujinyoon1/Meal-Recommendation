# Multi-stage build for frontend (Vue 3 + Vite)
# build → static serve via nginx-alpine on :9514

FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM nginx:1.25-alpine AS runner
# 컨테이너 내부 정적 서빙은 :9514 — 외부 Nginx 리버스 프록시가 :443 종단
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 9514

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:9514/ >/dev/null || exit 1
