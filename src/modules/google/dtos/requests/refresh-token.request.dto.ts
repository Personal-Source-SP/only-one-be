import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenRequestDto {
    @ApiProperty({ description: 'User ID to refresh token for', required: false })
    userId?: string;
}
