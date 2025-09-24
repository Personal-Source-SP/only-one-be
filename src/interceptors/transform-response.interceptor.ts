import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ResponseDto } from '../common/dto/response.dto';

@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
    intercept(_: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
            map((data) => {
                const wrapped: ResponseDto<any> = {
                    data,
                    errors: null,
                    isSuccess: true,
                };

                return wrapped;
            }),
        );
    }
}
