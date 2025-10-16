import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ResponseDto } from '../common/dto/response.dto';
import { Paginated } from 'nestjs-paginate';

@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
    intercept(_: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
            map((data) => {
                if (data?.data && data?.meta && data?.links) {
                    return data;
                }

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
