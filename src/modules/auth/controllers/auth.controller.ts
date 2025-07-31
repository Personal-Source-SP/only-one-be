import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { ResponseDto } from '../../../common/dto/response.dto';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { CreateUserRequestDto } from '../../user/dtos/requests';
import { UserDto } from '../../user/dtos/user.dto';
import { RefreshTokenRequestDto, SignInRequestDto } from '../dtos/requests/auth.request.dto';
import { RefreshTokenResponseDto, SignInResponseDto } from '../dtos/responses/auth.response.dto';
import { AuthService } from '../services/auth.service';

@Controller('auth')
@ApiTags('auth')
export class AuthController extends BaseController {
    constructor(private readonly authService: AuthService) {
        super();
    }

    @ApiOperation({ summary: 'Sign up' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @BaseApiOkResponse(UserDto)
    @Post('signup')
    public async signUp(@Body() dto: CreateUserRequestDto): Promise<ResponseDto<UserDto>> {
        const result = await this.authService.signUp(dto);
        return this.getResponse(Boolean(result), result);
    }

    @ApiOperation({ summary: 'Sign in' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @BaseApiOkResponse(SignInResponseDto)
    @Post('login')
    public async signIn(@Body() dto: SignInRequestDto): Promise<ResponseDto<SignInResponseDto>> {
        const result = await this.authService.login(dto);
        return this.getResponse(Boolean(result), result);
    }

    @ApiOperation({ summary: 'Refresh token' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @BaseApiOkResponse(RefreshTokenResponseDto)
    @Post('refresh-token')
    public async refreshToken(@Body() dto: RefreshTokenRequestDto): Promise<ResponseDto<RefreshTokenResponseDto>> {
        const result = await this.authService.refreshToken(dto);
        return this.getResponse(Boolean(result), result);
    }
}
