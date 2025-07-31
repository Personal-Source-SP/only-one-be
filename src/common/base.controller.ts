import { Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';

import { ResponseDto } from './dto/response.dto';
import { ErrorResponse } from './interfaces/error.response';

export class BaseController {
    @Inject(REQUEST)
    private _request;

    protected getResponse<T>(isSuccess: boolean, data: T = null, errors: ErrorResponse[] = null): ResponseDto<T> {
        const result: ResponseDto<T> = {
            data: data,
            isSuccess: isSuccess,
            errors: errors,
        };
        return result;
    }

    protected getRequest() {
        const user = this._request?.user;
        return user;
    }
}
