import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from './database/database.module.js';
import { AiModule } from './modules/ai/ai.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AppConfigModule } from './modules/config/config.module.js';
import { BooksModule } from './modules/books/books.module.js';
import { BookshelfModule } from './modules/bookshelf/bookshelf.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { NotesModule } from './modules/notes/notes.module.js';
import { ReadingModule } from './modules/reading/reading.module.js';
import { SubscriptionModule } from './modules/subscription/subscription.module.js';
import { SyncModule } from './modules/sync/sync.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { WidgetModule } from './modules/widget/widget.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    HealthModule,
    AppConfigModule,
    AuthModule,
    UsersModule,
    BooksModule,
    BookshelfModule,
    ReadingModule,
    NotesModule,
    SubscriptionModule,
    SyncModule,
    AiModule,
    WidgetModule,
  ],
})
export class AppModule {}
