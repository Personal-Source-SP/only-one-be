import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateGoogleAuthRequestDto {
    @ApiProperty({ description: 'Google token from Google OAuth' })
    @IsString()
    @IsNotEmpty()
    accessToken: string;

    @ApiProperty({ description: 'Expires in from Google OAuth' })
    @IsNumber()
    @IsNotEmpty()
    expiresIn: number;

    @ApiProperty({ description: 'Scope from Google OAuth' })
    @IsString()
    @IsNotEmpty()
    scope: string;

    @ApiProperty({ description: 'Token type from Google OAuth' })
    @IsString()
    @IsNotEmpty()
    tokenType: string;

    @ApiPropertyOptional({ description: 'Refresh token from Google OAuth' })
    @IsString()
    @IsOptional()
    refreshToken?: string;

    @ApiPropertyOptional({ description: 'Refresh token expires in from Google OAuth' })
    @IsNumber()
    @IsOptional()
    refreshTokenExpiresIn?: number;
}
