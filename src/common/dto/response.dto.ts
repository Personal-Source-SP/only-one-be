import { ApiResponseProperty } from '@nestjs/swagger';

import { ErrorResponse } from '../interfaces/error.response';

export class ResponseDto<T> {
    @ApiResponseProperty()
    data: T;

    @ApiResponseProperty()
    isSuccess: boolean;

    @ApiResponseProperty()
    errors: ErrorResponse[];

    constructor(data?: Partial<ResponseDto<T>>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}
