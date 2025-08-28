import { ApiProperty } from '@nestjs/swagger';

export class RevokeAccessRequestDto {
    @ApiProperty({ description: 'User ID to revoke access for', required: false })
    userId?: string;
}
