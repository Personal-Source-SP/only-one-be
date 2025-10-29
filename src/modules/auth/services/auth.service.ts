import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable, Scope, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AppConfigService } from '../../../shared/services/app-config.service';
import { LoggerService } from '../../../shared/services/logger.service';
import { UtilsService } from '../../../shared/services/utils.service';
import { CreateUserRequestDto } from '../../user/dtos/requests';
import { UserDto } from '../../user/dtos/user.dto';
import { UserEntity } from '../../user/entities/user.entity';
import { UserService } from '../../user/services/user.service';
import { RefreshTokenRequestDto, SignInRequestDto } from '../dtos/requests/auth.request.dto';
import { RefreshTokenResponseDto, SignInResponseDto } from '../dtos/responses/auth.response.dto';

@Injectable({ scope: Scope.REQUEST })
export class AuthService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly userService: UserService,
        private readonly loggerService: LoggerService,
        private readonly configService: AppConfigService,
        @InjectMapper() private readonly mapper: Mapper,
    ) {}

    async signUp(dto: CreateUserRequestDto): Promise<UserDto> {
        const user = await this.userService.create(dto);
        return user;
    }

    async login(dto: SignInRequestDto): Promise<SignInResponseDto> {
        const user = await this.userService.getUserLogin(dto.email);
        if (!user) throw new UnauthorizedException('Invalid email or password');

        if (!user.isActive) throw new UnauthorizedException('User is not active');

        const isPasswordValid = await UtilsService.validateHash(dto.password, user.password);
        if (!isPasswordValid) throw new UnauthorizedException('Invalid password');

        const response = this.mapper.map(user, UserEntity, SignInResponseDto);

        const tokens = await this.generateToken(user);
        response.accessToken = tokens.accessToken;
        response.refreshToken = tokens.refreshToken;

        return response;
    }

    async refreshToken(dto: RefreshTokenRequestDto): Promise<RefreshTokenResponseDto> {
        let payload;
        try {
            payload = this.jwtService.verify(dto.refreshToken, {
                secret: this.configService.get('APP_SECRET'),
            });
        } catch (error) {
            this.loggerService.error('Invalid refresh token');
            throw new UnauthorizedException('Invalid refresh token');
        }

        const user = await this.userService.getUserRefreshToken(payload.userId);

        if (!user) throw new UnauthorizedException('User not found');

        if (!user.isActive) throw new UnauthorizedException('Account is inactive');

        return await this.generateToken(user);
    }

    private async generateToken(user: UserEntity): Promise<RefreshTokenResponseDto> {
        const payload = {
            id: user.id,
            email: user.email,
            lastName: user.lastName,
            firstName: user.firstName,
        };

        const accessToken = await this.generateAccessToken(payload);
        const refreshToken = await this.generateRefreshToken(payload);

        return { accessToken, refreshToken };
    }

    private async generateAccessToken(payload: Partial<UserEntity>): Promise<string> {
        return this.jwtService.sign(payload, {
            secret: this.configService.get('APP_SECRET'),
            expiresIn: this.configService.get('JWT_EXPIRE'),
        });
    }

    private async generateRefreshToken(payload: Partial<UserEntity>): Promise<string> {
        return this.jwtService.sign(payload, {
            secret: this.configService.get('APP_SECRET'),
            expiresIn: this.configService.get('JWT_REFRESH_EXPIRE'),
        });
    }
}
