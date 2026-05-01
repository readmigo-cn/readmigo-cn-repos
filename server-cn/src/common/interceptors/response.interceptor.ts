import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

/**
 * 响应包装：所有成功返回包成 { code: 0, message: 'ok', data }
 * 已经是这个结构的（含 code 字段）则透传。
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(_ctx: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && 'code' in (data as object)) {
          return data;
        }
        return { code: 0, message: 'ok', data };
      }),
    );
  }
}
