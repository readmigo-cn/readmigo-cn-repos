import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  getStatus() {
    return {
      ok: true,
      service: 'readmigo-backend-cn',
      region: 'cn',
      timestamp: new Date().toISOString(),
    };
  }

  async getReady(): Promise<{ ok: boolean; db: boolean }> {
    let db = false;
    try {
      await this.ds.query('SELECT 1');
      db = true;
    } catch (_e) {
      db = false;
    }
    return { ok: db, db };
  }

  getMetrics() {
    const mem = process.memoryUsage();
    return {
      uptimeSec: Math.round(process.uptime()),
      memMb: Math.round(mem.rss / 1024 / 1024),
      heapMb: Math.round(mem.heapUsed / 1024 / 1024),
      pid: process.pid,
      nodeVersion: process.version,
    };
  }
}
