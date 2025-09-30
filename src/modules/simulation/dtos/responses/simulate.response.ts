import { ApiResponseProperty } from '@nestjs/swagger';

export class SimulateResponse<T> {
    @ApiResponseProperty()
    isSuccess: boolean;

    @ApiResponseProperty()
    data?: T;

    @ApiResponseProperty()
    errorMessage?: string;

    constructor(data: Partial<SimulateResponse<T>>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}
