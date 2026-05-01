import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        url: cfg.get<string>('DATABASE_URL') ?? 'postgresql://readmigo:readmigo@localhost:5432/readmigo_cn',
        autoLoadEntities: true,
        synchronize: false,
        logging: cfg.get<string>('NODE_ENV') !== 'production' ? ['error', 'warn'] : ['error'],
        ssl: cfg.get<string>('DATABASE_SSL') === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),
  ],
})
export class DatabaseModule {}
