import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getStatus() {
    return {
      ok: true,
      service: 'readmigo-backend-cn',
      region: 'cn',
      timestamp: new Date().toISOString(),
    };
  }
}
