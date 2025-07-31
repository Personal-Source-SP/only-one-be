/* eslint-disable import/namespace */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Body, Controller, HttpCode, HttpStatus, Post, Version } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ResponseDto } from '@/common/dto/response.dto';
import { CreateUserRequestDto } from '@/modules/user/dtos/create-user.request.dto';
import { UserDto } from '@/modules/user/dtos/user.dto';

import { BaseController } from '../../../common/base.controller';
import { RefreshTokenRequestDto, SignInRequestDto, SignUpRequestDto } from '../dtos/auth.request.dto';
import { RefreshTokenResponseDto, SignInResponseDto } from '../dtos/auth.response.dto';
import { AuthService } from '../services/auth.service';

@Controller('auth')
@ApiTags('auth')
export class AuthController extends BaseController {
    constructor(private readonly authService: AuthService) {
        super();
    }
    // Implement your controller methods here
    // For example:

    @ApiOperation({ summary: 'Sign up' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('signup')
    public async signUp(@Body() dto: CreateUserRequestDto): Promise<ResponseDto<UserDto>> {
        const result = await this.authService.signUp(dto);
        return this.getResponse(true, result);
    }

    @ApiOperation({ summary: 'Sign in' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('login')
    public async signIn(@Body() dto: SignInRequestDto): Promise<ResponseDto<SignInResponseDto>> {
        const result = await this.authService.login(dto);
        return this.getResponse(true, result);
    }

    @ApiOperation({ summary: 'Refresh token' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('refresh-token')
    public async refreshToken(@Body() dto: RefreshTokenRequestDto): Promise<ResponseDto<RefreshTokenResponseDto>> {
        const result = await this.authService.refreshToken(dto);
        return this.getResponse(true, result);
    }
}
