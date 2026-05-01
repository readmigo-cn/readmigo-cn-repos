// auth.controller.spec.ts
// W1-C6 unit test for AuthController. Real SMS/JWT flows are mocked; Phase 2
// will add integration coverage against an in-memory repository.
import { Test, TestingModule } from '@nestjs/testing';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<Pick<AuthService, 'sendSmsCode' | 'loginByCode'>>;

  beforeEach(async () => {
    authService = {
      sendSmsCode: jest.fn(),
      loginByCode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('sendSms() delegates to AuthService.sendSmsCode with the dto phone', async () => {
    authService.sendSmsCode.mockResolvedValue({ sent: true });
    const result = await controller.sendSms({ phone: '13800001234' } as never);
    expect(authService.sendSmsCode).toHaveBeenCalledWith('13800001234');
    expect(result).toEqual({ sent: true });
  });

  it('loginByCode() delegates to AuthService.loginByCode with phone + code', async () => {
    authService.loginByCode.mockResolvedValue({
      token: 't',
      refreshToken: 'r',
      userId: 'u-1',
    });
    const result = await controller.loginByCode({
      phone: '13800001234',
      code: '123456',
    } as never);
    expect(authService.loginByCode).toHaveBeenCalledWith('13800001234', '123456');
    expect(result.userId).toBe('u-1');
  });

  it('huaweiLogin() returns a Phase-4 placeholder payload', () => {
    const result = controller.huaweiLogin({ authCode: 'abc' });
    expect(result.status).toBe('todo');
    expect(result.provider).toBe('huawei-account');
    expect(result.authCode).toBe('abc');
  });

  it('logout() returns ok=true', () => {
    expect(controller.logout()).toEqual({ ok: true });
  });
});
