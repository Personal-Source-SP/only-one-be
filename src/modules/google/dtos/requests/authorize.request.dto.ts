import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AuthorizeRequestDto {
    @ApiProperty({ description: 'Authorization code from Google OAuth' })
    @IsString()
    @IsNotEmpty()
    code: string;

    @ApiProperty({ description: 'Redirect URI used in OAuth flow' })
    @IsString()
    @IsNotEmpty()
    redirectUri: string;
}
