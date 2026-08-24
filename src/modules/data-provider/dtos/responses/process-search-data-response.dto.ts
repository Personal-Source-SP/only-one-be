import { ApiProperty } from '@nestjs/swagger';

export class ProcessSearchDataProviderError {
    @ApiProperty()
    dataProviderName: string;

    @ApiProperty()
    errorMessage: string;

    @ApiProperty({ required: false })
    searchQuery?: string;
}

export class ProcessSearchDataResponse {
    @ApiProperty()
    process: number;

    @ApiProperty()
    success: number;

    @ApiProperty()
    error: number;

    @ApiProperty({ required: false })
    errorsMessage?: string;

    @ApiProperty({ type: [ProcessSearchDataProviderError], required: false })
    errors?: ProcessSearchDataProviderError[];

    @ApiProperty()
    totalDraftsCreated: number;

    constructor(data?: Partial<ProcessSearchDataResponse>) {
        if (data) Object.assign(this, data);
    }
}
