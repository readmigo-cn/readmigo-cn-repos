#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> 启动本地依赖（postgres + redis + adminer）"
docker compose up -d postgres redis adminer

echo "==> 等待 Postgres 就绪..."
until docker compose exec -T postgres pg_isready -U readmigo -d readmigo_cn >/dev/null 2>&1; do
  sleep 1
done
echo "    Postgres ready."

if [ ! -f .env ]; then
  echo "==> 复制 .env.example -> .env（首次启动）"
  cp .env.example .env
fi

echo "==> 跑 migration"
pnpm db:migrate

echo "==> 启动 server-cn (http://localhost:3001/api/v1/)"
echo "    Swagger: http://localhost:3001/docs"
echo "    Adminer: http://localhost:8080  (server=postgres user=readmigo pwd=readmigo db=readmigo_cn)"
exec pnpm dev
