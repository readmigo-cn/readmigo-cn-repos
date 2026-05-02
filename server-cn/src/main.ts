import 'reflect-metadata';

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';

import { AppModule } from './app.module.js';
import { ApiExceptionFilter } from './common/exceptions/api-exception.filter.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';

// 版本号从环境变量注入（CI 打包时传入），fallback 到 package.json 硬编码值
const APP_VERSION = process.env.APP_VERSION ?? '0.1.0';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.use(compression());

  app.setGlobalPrefix('api/v1');

  // CORS 白名单：本地开发 + 华为云正式域名
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://api.readmigo.cn',
    ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : []),
  ];
  app.enableCors({
    origin: (origin, callback) => {
      // HarmonyOS 原生 App 无 Origin，允许通过；浏览器请求则校验白名单
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // 全局 ValidationPipe：自动剥离未声明字段 + 类型转换
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // ---------------------------------------------------------------- Swagger
  // 生产环境也开启 Swagger，方便内网调试；通过网关层限制对外访问
  const serverUrl =
    process.env.SERVER_URL ??
    (process.env.NODE_ENV === 'production'
      ? 'https://api.readmigo.cn'
      : `http://localhost:${process.env.PORT ?? 3000}`);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('米果智读 API')
    .setDescription(
      'NestJS backend for Readmigo CN — HarmonyOS NEXT / Android 中国区版本',
    )
    .setVersion(APP_VERSION)
    .addServer(serverUrl, '当前环境')
    // Bearer JWT 认证方案（Authorization: Bearer <token>）
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    // 模块标签（对应各 NestJS 模块）
    .addTag('health', '健康检查')
    .addTag('auth', '认证与授权')
    .addTag('users', '用户管理')
    .addTag('books', '书籍目录')
    .addTag('bookshelf', '用户书架')
    .addTag('reading', '阅读进度与会话')
    .addTag('notes', '生词本与个人笔记')
    .addTag('sync', '数据同步')
    .addTag('ai', 'AI 助手功能')
    .addTag('subscription', '订阅与支付')
    .addTag('widget', '桌面小组件')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // /api/docs — 交互式 Swagger UI
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  // 生成 openapi.json 供客户端 SDK 自动生成（如 openapi-generator）
  // 仅在非生产环境或显式开启时写入磁盘
  if (process.env.NODE_ENV !== 'production' || process.env.EXPORT_OPENAPI === 'true') {
    try {
      const outPath = join(process.cwd(), 'dist', 'openapi.json');
      writeFileSync(outPath, JSON.stringify(document, null, 2), 'utf-8');
    } catch {
      // dist 目录可能在开发模式下不存在，忽略写入错误
    }
  }

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
