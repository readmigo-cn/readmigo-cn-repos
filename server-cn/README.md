# server-cn

国内后端最小骨架，技术形态对齐 `readmigo-repos/api`。

## 当前能力

- `GET /api/v1/health`：健康检查
- `POST /api/v1/ai/chat`：通过 `llm-adapter` 调用 `DeepSeek`
- `GET /docs`：Swagger 文档

## 本地启动

```bash
pnpm install
cp server-cn/.env.example server-cn/.env
pnpm dev:server
```

## 当前约束

- 还没有接数据库
- 还没有接鉴权
- 还没有接 AGC 服务端校验
- 还没有做日志脱敏
- 还没有迁移海外 `api` 的 `modules/*` 业务能力
