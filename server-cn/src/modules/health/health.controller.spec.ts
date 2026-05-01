// health.controller.spec.ts
// W1-C6 unit test for HealthController. /health endpoint must always return
// HTTP 200 with `ok: true` so Checkly probes (api.readmigo.cn) stay green.
import { Test, TestingModule } from '@nestjs/testing';

import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: jest.Mocked<Pick<HealthService, 'getStatus' | 'getReady' | 'getMetrics'>>;

  beforeEach(async () => {
    healthService = {
      getStatus: jest.fn(),
      getReady: jest.fn(),
      getMetrics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: healthService }],
    }).compile();

    controller = module.get(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('GET /health returns service identity payload (HTTP 200 by Nest default)', () => {
    healthService.getStatus.mockReturnValue({
      ok: true,
      service: 'readmigo-backend-cn',
      region: 'cn',
      timestamp: '2026-05-01T00:00:00.000Z',
    });
    const result = controller.getHealth();
    expect(result.ok).toBe(true);
    expect(result.service).toBe('readmigo-backend-cn');
    expect(result.region).toBe('cn');
  });

  it('GET /health/ready reports DB readiness boolean', async () => {
    healthService.getReady.mockResolvedValue({ ok: true, db: true });
    const result = await controller.getReady();
    expect(result.ok).toBe(true);
    expect(result.db).toBe(true);
    expect(healthService.getReady).toHaveBeenCalledTimes(1);
  });

  it('GET /health/metrics returns a memory/uptime snapshot', () => {
    healthService.getMetrics.mockReturnValue({
      uptimeSec: 42,
      memMb: 100,
      heapMb: 50,
      pid: 1,
      nodeVersion: 'v22.0.0',
    });
    const result = controller.getMetrics();
    expect(result.uptimeSec).toBeGreaterThanOrEqual(0);
    expect(result.memMb).toBeGreaterThanOrEqual(0);
  });
});
