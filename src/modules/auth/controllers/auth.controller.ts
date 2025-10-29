import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { CreateUserRequestDto } from '../../user/dtos/requests';
import { UserDto } from '../../user/dtos/user.dto';
import { RefreshTokenRequestDto, SignInRequestDto } from '../dtos/requests/auth.request.dto';
import { RefreshTokenResponseDto, SignInResponseDto } from '../dtos/responses/auth.response.dto';
import { AuthService } from '../services/auth.service';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @ApiOperation({ summary: 'Sign up' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('signup')
    @BaseApiOkResponse(UserDto)
    public async signUp(@Body() dto: CreateUserRequestDto): Promise<UserDto> {
        const result = await this.authService.signUp(dto);
        return result;
    }

    @ApiOperation({ summary: 'Sign in' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('login')
    @BaseApiOkResponse(SignInResponseDto)
    public async signIn(@Body() dto: SignInRequestDto): Promise<SignInResponseDto> {
        const result = await this.authService.login(dto);
        return result;
    }

    @ApiOperation({ summary: 'Refresh token' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post('refresh-token')
    @BaseApiOkResponse(RefreshTokenResponseDto)
    public async refreshToken(@Body() dto: RefreshTokenRequestDto): Promise<RefreshTokenResponseDto> {
        const result = await this.authService.refreshToken(dto);
        return result;
    }
}
