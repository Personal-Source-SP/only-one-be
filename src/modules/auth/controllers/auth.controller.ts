import { Body, Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Auth, PostRestApi } from '../../../decorators';
import { CreateUserRequestDto } from '../../user/dtos/requests';
import { UserDto } from '../../user/dtos/user.dto';
import { RefreshTokenRequestDto, SignInRequestDto } from '../dtos/requests/auth.request.dto';
import { RefreshTokenResponseDto, SignInResponseDto } from '../dtos/responses/auth.response.dto';
import { AuthService } from '../services/auth.service';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @PostRestApi({
        path: 'signup',
        summary: 'Sign up',
        responseDto: UserDto,
    })
    async signUp(@Body() dto: CreateUserRequestDto): Promise<UserDto> {
        const result = await this.authService.signUp(dto);
        return result;
    }

    @PostRestApi({
        path: 'login',
        summary: 'Sign in',
        responseDto: SignInResponseDto,
    })
    async signIn(@Body() dto: SignInRequestDto): Promise<SignInResponseDto> {
        const result = await this.authService.login(dto);
        return result;
    }

    @Auth()
    @PostRestApi({
        path: 'refresh-token',
        summary: 'Refresh token',
        responseDto: RefreshTokenResponseDto,
    })
    async refreshToken(@Body() dto: RefreshTokenRequestDto): Promise<RefreshTokenResponseDto> {
        const result = await this.authService.refreshToken(dto);
        return result;
    }
}
