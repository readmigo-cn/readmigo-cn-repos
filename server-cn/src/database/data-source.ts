import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource, type DataSourceOptions } from 'typeorm';

dotenv.config({ path: ['.env.local', '.env'] });

const url = process.env.DATABASE_URL ?? 'postgresql://readmigo:readmigo@localhost:5432/readmigo_cn';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url,
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production' ? ['error', 'warn'] : ['error'],
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

export const AppDataSource = new DataSource(dataSourceOptions);
