import { Body, Controller, HttpCode, HttpStatus, Post, Version } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Auth, BaseApiOkResponse } from '../../../decorators';
import { CreateUserRequestDto } from '../../user/dtos/requests';
import { UserDto } from '../../user/dtos/user.dto';
import { RefreshTokenRequestDto, SignInRequestDto } from '../dtos/requests/auth.request.dto';
import { RefreshTokenResponseDto, SignInResponseDto } from '../dtos/responses/auth.response.dto';
import { AuthService } from '../services/auth.service';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @ApiOperation({ summary: 'Sign up' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('signup')
    @BaseApiOkResponse(UserDto)
    async signUp(@Body() dto: CreateUserRequestDto): Promise<UserDto> {
        const result = await this.authService.signUp(dto);
        return result;
    }

    @ApiOperation({ summary: 'Sign in' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('login')
    @BaseApiOkResponse(SignInResponseDto)
    async signIn(@Body() dto: SignInRequestDto): Promise<SignInResponseDto> {
        const result = await this.authService.login(dto);
        return result;
    }

    @ApiOperation({ summary: 'Refresh token' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Auth()
    @Post('refresh-token')
    @BaseApiOkResponse(RefreshTokenResponseDto)
    async refreshToken(@Body() dto: RefreshTokenRequestDto): Promise<RefreshTokenResponseDto> {
        const result = await this.authService.refreshToken(dto);
        return result;
    }
}
