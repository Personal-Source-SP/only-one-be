import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class GoogleAuthRequestDto {
    @ApiProperty({ description: 'User ID to authorize' })
    @IsUUID()
    @IsNotEmpty()
    userId: string;

    @ApiProperty({ description: 'Authorization code from Google OAuth' })
    @IsString()
    @IsNotEmpty()
    code: string;

    @ApiProperty({ description: 'Redirect URI used in OAuth flow' })
    @IsString()
    @IsNotEmpty()
    redirectUri: string;
}
