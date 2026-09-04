import { HttpException, HttpStatus } from '@nestjs/common';

import { IAppError } from '../constant/error-code';

export class AppException extends HttpException {
    public readonly appError: IAppError;

    constructor(appError: IAppError, overrideStatusCode?: number) {
        const status = overrideStatusCode ?? appError.statusCode ?? HttpStatus.BAD_REQUEST;
        super(
            {
                code: appError.code,
                message: appError.message,
                params: appError.params,
                metadata: appError.metadata,
            },
            status,
        );
        this.appError = appError;
    }
}
