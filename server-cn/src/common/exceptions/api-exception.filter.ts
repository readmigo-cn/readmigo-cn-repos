import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * 全局异常归一：所有错误返回 {code, message, data:null}
 * - HttpException 透传 status + message
 * - 其余错误打日志并返回 500 + 通用文案，不泄漏 stack
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = -1;
    let message = 'internal_error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      code = status;
      if (typeof r === 'string') {
        message = r;
      } else if (r && typeof r === 'object') {
        const m = (r as Record<string, unknown>).message;
        message = Array.isArray(m) ? m.join(', ') : (typeof m === 'string' ? m : exception.message);
      }
    } else if (exception instanceof Error) {
      this.logger.error(`${req.method} ${req.url} -> ${exception.message}`, exception.stack);
    }

    res.status(status).json({ code, message, data: null });
  }
}
