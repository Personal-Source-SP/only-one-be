import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleAuthRequestDto {
    @ApiProperty({ description: 'Authorization code from Google OAuth' })
    @IsString()
    @IsNotEmpty()
    code: string;

    @ApiProperty({ description: 'Redirect URI used in OAuth flow' })
    @IsString()
    @IsNotEmpty()
    redirectUri: string;
}
