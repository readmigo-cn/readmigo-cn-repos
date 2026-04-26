import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AiModule } from './modules/ai/ai.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AppConfigModule } from './modules/config/config.module.js';
import { BooksModule } from './modules/books/books.module.js';
import { BookshelfModule } from './modules/bookshelf/bookshelf.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { ReadingModule } from './modules/reading/reading.module.js';
import { SyncModule } from './modules/sync/sync.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    HealthModule,
    AppConfigModule,
    AuthModule,
    UsersModule,
    BooksModule,
    BookshelfModule,
    ReadingModule,
    SyncModule,
    AiModule,
  ],
})
export class AppModule {}
