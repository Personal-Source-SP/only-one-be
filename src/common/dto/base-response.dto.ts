import { ApiProperty } from '@nestjs/swagger';

export class BaseResponseDto {
    @ApiProperty({ description: 'Success status' })
    success: boolean;

    @ApiProperty({ description: 'Response message' })
    message: string;

    @ApiProperty({ description: 'Response data', required: false })
    data?: any;
}
