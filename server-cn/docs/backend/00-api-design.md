# Server-CN API 设计规范

## 概述

本规范定义 server-cn（米果智读国内后端）的 API 设计原则、数据格式、认证机制、错误处理、性能约束等。所有 API 开发必须遵循本规范，确保跨团队一致性和可维护性。

核心设计哲学：**RESTful + JSON + 版本化 + 一致的错误格式**

---

## 1. 核心设计原则

### 1.1 RESTful 架构

所有 API 以资源为中心，使用标准 HTTP 方法操作资源：

| 方法 | 资源操作 | 幂等性 | 缓存安全 |
|------|---------|--------|---------|
| **GET** | 读取资源 | 是 | 是 |
| **POST** | 创建资源 / 执行动作 | 否 | 否 |
| **PATCH** | 部分更新资源 | 否 | 否 |
| **PUT** | 完整替换资源（少用） | 是 | 否 |
| **DELETE** | 删除资源 | 是 | 否 |

### 1.2 JSON 全栈

- 请求 Content-Type：`application/json`
- 响应 Content-Type：`application/json; charset=utf-8`
- 所有日期用 ISO 8601 格式（UTC）：`2026-05-01T10:30:00Z`
- 数字精度：浮点数最多 10 位小数，金额用分（整数）

### 1.3 API 版本化

所有 API 端点使用路径版本化：`/api/v1/...`

- 主版本号（v1、v2）表示向后不兼容变更
- 在 3 个主版本内保留旧版本（例 v1 至少维护 18 个月）
- 弃用前 90 天通知客户端

### 1.4 单一基础 URL

- **生产环境**：`https://api.readmigo.cn/api/v1`
- **开发环境**：`http://localhost:3000/api/v1`

### 1.5 一致的响应格式

无论成功或失败，响应体始终为 JSON 对象（不返回数组根节点）。

---

## 2. URL 命名规约

### 2.1 资源路径

**原则**：使用复数名词，小写，连字符分隔

```
✓ 好的例子
GET    /api/v1/books              # 列表
POST   /api/v1/books              # 创建
GET    /api/v1/books/:id          # 获取单个
PATCH  /api/v1/books/:id          # 更新
DELETE /api/v1/books/:id          # 删除

✓ 嵌套关系
GET    /api/v1/books/:book_id/chapters           # 书籍的章节列表
POST   /api/v1/books/:book_id/chapters           # 创建章节
GET    /api/v1/books/:book_id/chapters/:id       # 获取章节

✗ 避免
GET    /api/v1/getBooks           # 使用动词
GET    /api/v1/Books              # 大写
GET    /api/v1/book_list          # 不必要的前缀
```

### 2.2 动作端点（少数例外）

仅当操作不能映射到标准 CRUD 时使用动作动词：

```
✓ 动作端点示例
POST   /api/v1/reading-sessions/:id/pause        # 暂停阅读
POST   /api/v1/books/:id/rate                    # 评分
POST   /api/v1/users/:id/send-reset-code         # 发送重置码
POST   /api/v1/notes/:id/publish                 # 发布笔记

✗ 避免
POST   /api/v1/send-email                        # 使用 POST /api/v1/emails 替代
POST   /api/v1/generate-report                   # 使用 POST /api/v1/reports 替代
```

### 2.3 ID 使用规则

**原则**：公开 API 不暴露内部数据库 ID，使用 slug 或 UUID

```
✓ 好的例子
GET /api/v1/books/harry-potter-sorcerers-stone  # slug
GET /api/v1/books/550e8400-e29b-41d4-a716-...   # UUID

✗ 避免
GET /api/v1/books/12345                         # 数据库自增 ID 容易被爆破
```

---

## 3. 请求格式规范

### 3.1 请求头（Headers）

**必需请求头**：

| Header | 值示例 | 说明 |
|--------|--------|------|
| Content-Type | application/json | 发送 JSON 数据时必需 |
| Accept | application/json | 期望收到 JSON |

**认证请求头**：

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**可选追踪请求头**：

| Header | 说明 | 示例 |
|--------|------|------|
| X-Platform | 客户端平台 | ios / android / web |
| X-App-Version | 应用版本 | 1.0.0 |
| X-Correlation-Id | 请求链路追踪 ID | 550e8400-e29b-41d4-a716-... |
| Accept-Language | 语言偏好 | zh-Hans, en;q=0.9 |
| X-Custom-Lang | 覆盖 Accept-Language | zh-Hans |
| User-Agent | 客户端标识 | 自动设置 |

### 3.2 查询参数（Query String）

#### 分页

**Offset-based 分页**（推荐）：

```
GET /api/v1/books?page=1&limit=20
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | integer | 1 | 页码，从 1 开始 |
| limit | integer | 20 | 每页数量，最大 100 |

响应头包含分页元数据：

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 342,
    "totalPages": 18
  }
}
```

**Cursor-based 分页**（大数据集推荐）：

```
GET /api/v1/users?cursor=abc123xyz&limit=50
```

响应示例：

```json
{
  "data": [...],
  "pagination": {
    "cursor": "next_cursor_token",
    "limit": 50,
    "hasMore": true
  }
}
```

#### 排序

```
GET /api/v1/books?sort=-createdAt,title
```

| 参数格式 | 含义 |
|---------|------|
| `sort=field` | 升序 |
| `sort=-field` | 降序 |
| `sort=field1,field2` | 多字段排序 |

#### 过滤

```
GET /api/v1/books?language=en&level=B1&category=fiction
```

规则：
- 参数名对应资源字段
- 多值用逗号分隔：`?category=fiction,mystery`
- 范围用 `[from,to]`：`?price=[0,100]`
- 不存在的字段忽略，不报错

#### 搜索

```
GET /api/v1/books?q=harry+potter
```

| 参数 | 说明 |
|------|------|
| q | 关键词搜索，最长 100 字符 |

#### 选择字段（投影）

```
GET /api/v1/books/123?fields=id,title,cover,author
```

减少响应体大小，服务端根据需要返回子集。

### 3.3 请求体（Body）

**创建资源示例**：

```bash
POST /api/v1/books
Content-Type: application/json

{
  "title": "The Great Gatsby",
  "author": "F. Scott Fitzgerald",
  "language": "en",
  "level": "B2",
  "coverUrl": "https://cdn.readmigo.cn/...",
  "chapterCount": 9
}
```

**部分更新示例**：

```bash
PATCH /api/v1/books/123
Content-Type: application/json

{
  "title": "The Great Gatsby (Revised Edition)"
}
```

**批量操作示例**：

```bash
POST /api/v1/bookmarks/batch-create
Content-Type: application/json

{
  "bookmarks": [
    { "bookId": "book-1", "chapterIndex": 5, "page": 120 },
    { "bookId": "book-2", "chapterIndex": 10, "page": 45 }
  ]
}
```

---

## 4. 响应格式规范

### 4.1 成功响应（200, 201, 204）

**成功响应统一结构**：

```json
{
  "code": "SUCCESS",
  "data": {...},
  "message": "操作成功"
}
```

**GET 单个资源示例**：

```json
{
  "code": "SUCCESS",
  "data": {
    "id": "book-550e8400",
    "title": "The Great Gatsby",
    "author": "F. Scott Fitzgerald",
    "language": "en",
    "level": "B2",
    "chapterCount": 9,
    "createdAt": "2026-04-15T10:30:00Z",
    "updatedAt": "2026-05-01T15:45:30Z"
  },
  "message": "获取成功"
}
```

**GET 列表示例**：

```json
{
  "code": "SUCCESS",
  "data": [
    {
      "id": "book-1",
      "title": "Book 1",
      ...
    },
    {
      "id": "book-2",
      "title": "Book 2",
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 342,
    "totalPages": 18
  },
  "message": "获取成功"
}
```

**POST 创建资源（201）**：

```json
{
  "code": "RESOURCE_CREATED",
  "data": {
    "id": "book-new-uuid",
    "title": "New Book",
    "createdAt": "2026-05-01T16:00:00Z"
  },
  "message": "创建成功"
}
```

HTTP 状态码：201 Created

**DELETE 删除成功（204）**：

```
HTTP/1.1 204 No Content
```

无响应体，或返回 200 with empty data：

```json
{
  "code": "SUCCESS",
  "data": null,
  "message": "删除成功"
}
```

### 4.2 错误响应（4xx, 5xx）

统一错误格式（所有错误都返回 JSON）：

```json
{
  "code": "INVALID_ARGUMENT",
  "message": "用户友好的错误描述（支持国际化）",
  "details": {
    "field": "email",
    "reason": "invalid_format",
    "value": "not-an-email"
  },
  "traceId": "trace-550e8400-e29b-41d4-a716"
}
```

**常见错误响应示例**：

**400 Bad Request（参数验证失败）**：

```json
{
  "code": "INVALID_ARGUMENT",
  "message": "请求参数无效",
  "details": {
    "field": "email",
    "reason": "invalid_format"
  },
  "traceId": "trace-xxx"
}
```

**401 Unauthorized（未认证）**：

```json
{
  "code": "UNAUTHORIZED",
  "message": "令牌无效或已过期，请重新登录",
  "traceId": "trace-xxx"
}
```

**403 Forbidden（权限不足）**：

```json
{
  "code": "PERMISSION_DENIED",
  "message": "您没有权限执行此操作",
  "details": {
    "requiredRole": "admin",
    "userRole": "user"
  },
  "traceId": "trace-xxx"
}
```

**404 Not Found（资源不存在）**：

```json
{
  "code": "NOT_FOUND",
  "message": "资源不存在",
  "details": {
    "resourceId": "book-123",
    "resourceType": "Book"
  },
  "traceId": "trace-xxx"
}
```

**409 Conflict（资源冲突）**：

```json
{
  "code": "RESOURCE_CONFLICT",
  "message": "资源已存在或冲突",
  "details": {
    "field": "email",
    "reason": "duplicate"
  },
  "traceId": "trace-xxx"
}
```

**422 Unprocessable Entity（业务验证失败）**：

```json
{
  "code": "BUSINESS_VALIDATION_FAILED",
  "message": "业务规则校验失败",
  "details": {
    "reason": "insufficient_balance",
    "required": 100,
    "available": 50
  },
  "traceId": "trace-xxx"
}
```

**429 Too Many Requests（限流）**：

```json
{
  "code": "RATE_LIMITED",
  "message": "请求过于频繁，请稍后再试",
  "details": {
    "retryAfter": 60,
    "limit": "100 requests per minute"
  },
  "traceId": "trace-xxx"
}
```

**500 Internal Server Error（服务器错误）**：

```json
{
  "code": "INTERNAL_ERROR",
  "message": "服务器内部错误，请稍后重试",
  "traceId": "trace-xxx"
}
```

**502 Bad Gateway / 503 Service Unavailable**：

```json
{
  "code": "SERVICE_UNAVAILABLE",
  "message": "依赖的外部服务暂不可用，请稍后重试",
  "traceId": "trace-xxx"
}
```

### 4.3 HTTP 状态码映射

| 业务 code | HTTP 状态码 | 说明 |
|----------|----------|------|
| SUCCESS | 200 | 一般成功 |
| RESOURCE_CREATED | 201 | 资源创建成功 |
| RESOURCE_DELETED | 204 | 资源删除成功（无响应体） |
| INVALID_ARGUMENT | 400 | 请求参数错误 |
| UNAUTHORIZED | 401 | 未认证或令牌过期 |
| PERMISSION_DENIED | 403 | 权限不足 |
| NOT_FOUND | 404 | 资源不存在 |
| RESOURCE_CONFLICT | 409 | 资源冲突（如重复） |
| BUSINESS_VALIDATION_FAILED | 422 | 业务规则校验失败 |
| RATE_LIMITED | 429 | 请求限流 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |
| SERVICE_UNAVAILABLE | 503 | 外部服务不可用 |

---

## 5. 认证 & 鉴权

### 5.1 JWT Bearer Token

所有受保护的 API 通过 HTTP Authorization 头传递 JWT：

```
GET /api/v1/users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**JWT 结构**：

```json
{
  "sub": "user-550e8400",        // 用户 ID
  "email": "user@example.com",
  "role": "user",
  "iat": 1672531200,             // 签发时间
  "exp": 1672617600              // 过期时间（1 小时后）
}
```

### 5.2 访问令牌 (Access Token) 与刷新令牌 (Refresh Token)

**访问令牌**：
- 短生命周期（1 小时）
- 用于所有 API 请求
- 过期后用 Refresh Token 换取新 Access Token

**刷新令牌**：
- 长生命周期（30 天）
- 存储在 HTTP-Only Cookie 或安全存储中
- 用于无缝续期

**刷新流程**：

```bash
POST /api/v1/auth/refresh
Cookie: refreshToken=eyJ...

# 响应
{
  "code": "SUCCESS",
  "data": {
    "accessToken": "new-jwt-token",
    "expiresIn": 3600
  }
}
```

### 5.3 公开端点标注

在 NestJS 控制器中，用 `@Public()` 装饰器标注无需认证的端点：

```typescript
@Get('/health')
@Public()
async health() {
  return { status: 'ok' };
}

@Post('/auth/login')
@Public()
async login(@Body() dto: LoginDto) {
  ...
}
```

**无需认证的端点列表**：
- `GET /api/v1/health` - 健康检查
- `POST /api/v1/auth/login` - 登录
- `POST /api/v1/auth/register` - 注册
- `POST /api/v1/auth/send-reset-code` - 发送重置码
- `POST /api/v1/auth/reset-password` - 重置密码
- `GET /api/v1/books` - 书籍列表（公开数据）
- `GET /api/v1/docs` - Swagger 文档

### 5.4 角色与权限

使用 NestJS `@Roles()` 装饰器实现基于角色的访问控制（RBAC）：

```typescript
@Patch('/books/:id')
@Roles('admin')
async updateBook(@Param('id') id: string, @Body() dto: UpdateBookDto) {
  ...
}
```

**标准角色**：

| 角色 | 权限 |
|------|------|
| user | 读取公开数据，管理自己的数据（书签、笔记） |
| admin | 管理所有资源、用户、系统配置 |
| moderator | 审核内容、处理举报（W4+ 功能） |

### 5.5 数据所有权过滤

所有涉及用户数据的端点必须隐式过滤 `user_id`，防止越权访问：

```typescript
@Get('/my-bookmarks')
@UseGuards(AuthGuard)
async getMyBookmarks(@GetUser() userId: string) {
  // 自动过滤 WHERE user_id = userId
  return this.bookmarkService.findByUserId(userId);
}

// ✗ 错误：没有过滤用户 ID
@Get('/bookmarks/:id')
async getBookmark(@Param('id') id: string) {
  return this.bookmarkService.findById(id);  // 任何用户都能访问！
}

// ✓ 正确：验证所有权
@Get('/bookmarks/:id')
@UseGuards(AuthGuard)
async getBookmark(@Param('id') id: string, @GetUser() userId: string) {
  const bookmark = await this.bookmarkService.findById(id);
  if (bookmark.userId !== userId) {
    throw new ForbiddenException('Permission denied');
  }
  return bookmark;
}
```

---

## 6. 流式 API（SSE - Server-Sent Events）

用于 AI 划词解释、翻译等长流程操作。

### 6.1 SSE 端点定义

```bash
GET /api/v1/words/:id/explain?lang=zh-Hans
Accept: text/event-stream
Authorization: Bearer ...
```

### 6.2 SSE 响应格式

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

event: start
data: {"taskId": "task-123"}

event: chunk
data: {"text": "该词义为..."}

event: chunk
data: {"text": "另一含义是..."}

event: done
data: {"totalUsage": {"promptTokens": 100, "completionTokens": 50}}

# 心跳（可选，30 秒一次）
event: heartbeat
data: {}
```

### 6.3 SSE 错误处理

```
event: error
data: {"code": "RATE_LIMITED", "message": "请求过于频繁"}

# 连接关闭
```

### 6.4 客户端集成（示例）

```javascript
const eventSource = new EventSource('/api/v1/words/123/explain?lang=zh-Hans', {
  headers: { 'Authorization': 'Bearer token' }
});

eventSource.addEventListener('chunk', (event) => {
  const { text } = JSON.parse(event.data);
  console.log(text);
});

eventSource.addEventListener('done', (event) => {
  const { totalUsage } = JSON.parse(event.data);
  console.log('完成，总消耗 tokens:', totalUsage);
  eventSource.close();
});

eventSource.addEventListener('error', (event) => {
  console.error(JSON.parse(event.data));
  eventSource.close();
});
```

---

## 7. 限流（Rate Limiting）

基于 Redis 的滑动窗口限流。

### 7.1 限流规则

| 端点 | 限流 | 说明 |
|------|------|------|
| **全局** | 100 req/min/IP | 防止恶意爬虫 |
| **用户级** | 500 req/min/user | 一般 API 端点 |
| **AI 端点** | 30 req/min/user | 划词解释、翻译（昂贵操作） |
| **SMS** | 1 req/min/phone | 防止短信轰炸 |
| **登录** | 5 req/min/IP | 防止暴力破解 |

### 7.2 限流响应

```json
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1672531260

{
  "code": "RATE_LIMITED",
  "message": "请求过于频繁，请在 60 秒后重试",
  "details": {
    "retryAfter": 60,
    "limit": "100 requests per minute"
  },
  "traceId": "trace-xxx"
}
```

### 7.3 NestJS 实现示例

```typescript
import { RateLimitGuard } from '@/guards/rate-limit.guard';

@Get('/words/:id/explain')
@UseGuards(RateLimitGuard)
@RateLimit({ windowMs: 60000, max: 30 })  // 60 秒内最多 30 次
async explainWord(@Param('id') id: string) {
  ...
}
```

---

## 8. 缓存策略

### 8.1 HTTP 缓存头

**可缓存数据**（书籍、章节）：

```
GET /api/v1/books/123
HTTP/1.1 200 OK
Cache-Control: public, max-age=3600
ETag: "abc123xyz"
Last-Modified: Wed, 15 Apr 2026 10:30:00 GMT
Vary: Accept-Language
```

**用户个人数据**（书签、进度）：

```
GET /api/v1/users/me/bookmarks
HTTP/1.1 200 OK
Cache-Control: private, max-age=60
ETag: "def456xyz"
```

**不可缓存数据**（实时信息）：

```
GET /api/v1/subscription/status
HTTP/1.1 200 OK
Cache-Control: no-store, no-cache, must-revalidate
Pragma: no-cache
```

### 8.2 缓存键与失效

在应用层（Redis）缓存频繁查询：

| 资源 | 缓存键 | TTL | 失效条件 |
|------|--------|-----|---------|
| 书籍列表 | `books:list:{lang}:{level}` | 1 小时 | 书籍更新 |
| 章节内容 | `chapters:{bookId}:{chapterId}` | 24 小时 | 章节更新 |
| 用户配置 | `user:{userId}:settings` | 10 分钟 | 用户更新设置 |
| AI 回复 | `ai_cache:{hash(content)}` | 7 天 | 内容相同则复用 |

### 8.3 缓存失效

**主动失效**：

```typescript
// 更新书籍后清除缓存
await this.bookService.update(id, dto);
await this.cache.del(`books:list:*`);
```

**TTL 失效**：在缓存存储时设置过期时间

---

## 9. 国际化（i18n）

### 9.1 语言协商

客户端通过请求头指定语言，优先级：

1. `X-Custom-Lang` 头（最高优先级）
2. `Accept-Language` 头
3. 用户账户配置
4. 默认 `en`（英语）

```bash
GET /api/v1/words/123
Accept-Language: zh-Hans, en;q=0.9
X-Custom-Lang: zh-Hans

# 返回中文错误消息和内容
```

### 9.2 支持的语言列表

详见[语言支持](../reference/languages.md)。

**API 返回的可国际化字段**：
- 错误消息 (`message`, `details.reason`)
- 业务文案（如订阅提示、功能说明）
- 书籍元数据（如分类、标签）

**不国际化字段**：
- ID、UUID、时间戳
- HTTP 状态码
- 技术字段名

---

## 10. API 版本管理

### 10.1 URL 路径版本化

当引入向后不兼容的变更时，创建新版本：

```
GET /api/v1/books          # v1（老版本）
GET /api/v2/books          # v2（新版本，可能有不同响应格式）
```

### 10.2 版本支持生命周期

| 版本 | 发布日期 | 支持结束 | 说明 |
|------|---------|---------|------|
| v1 | 2026-05-01 | 2027-05-01 | 当前版本，12 个月支持 |
| v2 | 2027-06-01 | 2028-06-01 | 计划版本（待定） |

### 10.3 弃用通知

```
HTTP/1.1 200 OK
Deprecation: true
Sunset: Wed, 01 May 2027 00:00:00 GMT
Link: </api/v2/books>; rel="successor-version"

{
  "code": "SUCCESS",
  "data": [...]
}
```

---

## 11. OpenAPI / Swagger 文档

每个端点必须用 NestJS Swagger 装饰器注解：

```typescript
@Get('/:id')
@ApiOperation({ summary: '获取书籍详情' })
@ApiParam({
  name: 'id',
  type: String,
  description: '书籍 ID 或 slug',
  example: 'harry-potter-sorcerers-stone'
})
@ApiResponse({
  status: 200,
  description: '获取成功',
  schema: {
    example: {
      code: 'SUCCESS',
      data: {
        id: 'book-123',
        title: 'Harry Potter',
        author: 'J.K. Rowling',
        ...
      }
    }
  }
})
@ApiResponse({
  status: 404,
  description: '书籍不存在',
  schema: {
    example: {
      code: 'NOT_FOUND',
      message: '资源不存在'
    }
  }
})
async getBook(@Param('id') id: string) {
  ...
}
```

自动生成的 Swagger 文档可在 `/docs` 访问，用于：
- 客户端集成参考
- API 测试
- SDK 代码生成

---

## 12. 错误代码完整列表

### 认证错误（1000-1999）

| Code | HTTP | 说明 |
|------|------|------|
| AUTH_INVALID_TOKEN | 401 | JWT 无效或格式错误 |
| AUTH_TOKEN_EXPIRED | 401 | JWT 已过期 |
| AUTH_REFRESH_EXPIRED | 401 | Refresh Token 已过期，需重新登录 |
| AUTH_INVALID_CREDS | 401 | 用户名/密码错误 |
| AUTH_USER_NOT_FOUND | 404 | 用户不存在 |
| AUTH_EMAIL_EXISTS | 409 | 邮箱已被注册 |
| AUTH_PHONE_EXISTS | 409 | 手机号已被注册 |

### 资源错误（2000-2999）

| Code | HTTP | 说明 |
|------|------|------|
| NOT_FOUND | 404 | 资源不存在 |
| RESOURCE_CONFLICT | 409 | 资源已存在或冲突 |
| INVALID_STATE | 422 | 资源状态不允许此操作 |

### 业务错误（3000-3999）

| Code | HTTP | 说明 |
|------|------|------|
| BUSINESS_VALIDATION_FAILED | 422 | 业务规则校验失败 |
| QUOTA_EXCEEDED | 422 | 配额超限（如字符数） |
| SUBSCRIPTION_REQUIRED | 403 | 功能需要订阅 |
| FEATURE_LOCKED | 403 | 功能未解锁 |
| PAYMENT_FAILED | 422 | 支付失败 |
| INSUFFICIENT_BALANCE | 422 | 余额不足 |

### 参数错误（4000-4999）

| Code | HTTP | 说明 |
|------|------|------|
| INVALID_ARGUMENT | 400 | 请求参数无效 |
| MISSING_REQUIRED_FIELD | 400 | 缺少必需字段 |
| INVALID_FIELD_VALUE | 400 | 字段值格式错误 |

### 权限错误（5000-5999）

| Code | HTTP | 说明 |
|------|------|------|
| PERMISSION_DENIED | 403 | 用户没有权限 |
| UNAUTHORIZED | 401 | 未认证 |

### 限流错误（6000-6999）

| Code | HTTP | 说明 |
|------|------|------|
| RATE_LIMITED | 429 | 请求过于频繁 |
| SMS_RATE_LIMITED | 429 | 短信发送过于频繁 |

### 外部服务错误（7000-7999）

| Code | HTTP | 说明 |
|------|------|------|
| EXTERNAL_SERVICE_DOWN | 503 | 依赖服务不可用 |
| DEEPSEEK_ERROR | 503 | DeepSeek API 异常 |
| QWEN_ERROR | 503 | 通义千问 API 异常 |
| ALIYUN_OSS_ERROR | 503 | 阿里云 OBS 异常 |

### 系统错误（8000-8999）

| Code | HTTP | 说明 |
|------|------|------|
| INTERNAL_ERROR | 500 | 服务器内部错误 |
| DATABASE_ERROR | 500 | 数据库异常 |
| CACHE_ERROR | 500 | 缓存异常 |

---

## 13. 米果智读 (Server-CN) 特定约定

### 13.1 端点命名空间

所有 API 按功能模块分组：

| 模块 | 前缀 | 说明 |
|------|------|------|
| 认证 | /api/v1/auth | 登录、注册、令牌刷新 |
| 用户 | /api/v1/users | 用户资料、设置、账户 |
| 书籍 | /api/v1/books | 书籍列表、详情、搜索 |
| 书架 | /api/v1/bookshelf | 个人书架、收藏 |
| 阅读 | /api/v1/reading | 阅读进度、笔记、书签 |
| 笔记 | /api/v1/notes | 创建、编辑、管理笔记 |
| 同步 | /api/v1/sync | 数据同步、离线支持 |
| AI 功能 | /api/v1/ai | 划词解释、翻译、智能推荐 |
| 订阅 | /api/v1/subscription | 订阅状态、购买、续期 |
| Widget | /api/v1/widgets | 小组件数据（iOS/Android） |

### 13.2 健康检查

```bash
GET /api/v1/health
HTTP/1.1 200 OK

{
  "code": "SUCCESS",
  "data": {
    "status": "healthy",
    "database": "connected",
    "redis": "connected",
    "timestamp": "2026-05-01T16:00:00Z"
  }
}
```

### 13.3 避免内部 ID 泄露

**✓ 好的做法**：

```json
{
  "id": "book-550e8400-e29b-41d4-a716",  // UUID
  "slug": "harry-potter-sorcerers-stone"
}
```

**✗ 避免**：

```json
{
  "id": 12345,  // 自增 ID，容易被爆破
  "databaseId": 12345
}
```

### 13.4 用户数据隐式过滤

所有用户相关的端点必须用 `@GetUser()` 自动注入当前用户 ID，并过滤数据：

```typescript
@Get('/my-notes')
@UseGuards(AuthGuard)
async getMyNotes(@GetUser() userId: string) {
  // 自动 WHERE user_id = userId
  return this.noteService.findByUserId(userId);
}
```

---

## 14. 测试与文档

### 14.1 API 测试覆盖

- 单元测试：DTO 验证、业务逻辑
- 集成测试：HTTP 请求 → 响应
- 端到端测试：完整工作流（登录 → 创建 → 删除）

### 14.2 API 文档维护

- 修改 API 时必须同时更新 Swagger 注解
- 定期检查 Swagger 文档准确性（`GET /docs`）
- 将重大 API 变更写入[变更日志](../CHANGELOG.md)

---

## 15. 性能指标

| 指标 | 目标 | 监控工具 |
|------|------|---------|
| P95 响应时间 | < 200ms | Sentry |
| P99 响应时间 | < 500ms | Sentry |
| 错误率 | < 0.1% | Sentry |
| 可用性 | > 99.9% | Checkly + 云监控 |
| API 吞吐量 | > 1000 req/s | 压力测试 |

---

## 16. 安全最佳实践

- 始终使用 HTTPS，禁止 HTTP
- 敏感字段（密码、令牌）不出现在日志
- 输入验证（class-validator），防止 SQL 注入
- 输出编码（JSON 自动处理）
- CORS 策略：仅允许 readmigo.app 及其子域
- 定期安全审计（OWASP Top 10）

---

## 检查清单

新增 API 端点前请确认：

- [ ] 端点命名符合规范（RESTful，小写连字符）
- [ ] 添加了 Swagger @ApiOperation / @ApiResponse 注解
- [ ] 所有查询/路径参数都在 DTO 中定义并用 class-validator 验证
- [ ] 认证与鉴权：@UseGuards(AuthGuard) 和 @Roles() 正确应用
- [ ] 用户数据有 user_id 过滤，无越权风险
- [ ] 使用统一的响应格式（code + data + message）
- [ ] 错误返回正确的 HTTP 状态码和业务 code
- [ ] 添加了单元测试 + 集成测试
- [ ] 性能测试 P95 < 200ms
- [ ] 文档字符串完整（方法说明、参数说明）
- [ ] 限流规则应用（如需要）

---

*最后更新：2026-05-01*
