import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable, NotFoundException, Scope, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import crypto from 'crypto';
import { DataSource, Repository } from 'typeorm';

import { CreateUserRequestDto } from '@/modules/user/dtos/create-user.request.dto';
import { UserDto } from '@/modules/user/dtos/user.dto';
import { UserEntity } from '@/modules/user/entities/user.entity';
import { UserService } from '@/modules/user/services/user.service';
import { AppConfigService } from '@/shared/services/app-config.service';
import { LoggerService } from '@/shared/services/logger.service';

import { RefreshTokenRequestDto, SignInRequestDto } from '../dtos/auth.request.dto';
import { RefreshTokenResponseDto, SignInResponseDto } from '../dtos/auth.response.dto';

export class AuthenticationError extends Error {}

@Injectable({ scope: Scope.REQUEST })
export class AuthService {
    private readonly baseURL: string;
    private readonly realm: string;
    private readonly userRepository: Repository<UserEntity>;
    constructor(
        @InjectMapper() private readonly _mapper: Mapper,
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly configService: AppConfigService,
        private readonly loggerService: LoggerService,

        readonly _dataSource: DataSource,
    ) {
        this.userRepository = _dataSource.getRepository(UserEntity);
    }

    public async signUp(dto: CreateUserRequestDto): Promise<UserDto> {
        const user = await this.userService.createUser(dto);
        if (!user) {
            throw new AuthenticationError('Failed to create user');
        }
        return user;
    }

    public async login(dto: SignInRequestDto): Promise<SignInResponseDto> {
        const user = await this.userService.findByEmailWithPassword(dto.email);
        if (!user) {
            this.loggerService.warn(`Failed login attempt for email: ${dto.email}`);
            throw new AuthenticationError('Invalid email or password');
        }
        if (!user.isActive) {
            this.loggerService.warn(`Login attempt for inactive user: ${dto.email}`);
            throw new UnauthorizedException('User is not active');
        }
        const isPasswordValid = await this.userService.comparePassword(dto.password, user.password);
        if (!isPasswordValid) {
            this.loggerService.warn(`Invalid password attempt for user: ${dto.email}`);
            throw new AuthenticationError('Invalid password');
        }
        const tokens = await this.generateToken(user);
        const response = this._mapper.map(user, UserEntity, SignInResponseDto);
        response.accessToken = tokens.accessToken;
        response.refreshToken = tokens.refreshToken;
        return response;
    }

    private async generateToken(user: UserEntity): Promise<{ accessToken: string; refreshToken: string }> {
        const payload = {
            userId: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
        };
        const accessToken = await this.generateAccessToken(payload);
        const refreshToken = await this.generateRefreshToken(payload);
        return { accessToken, refreshToken };
    }

    private async generateAccessToken(payload: any): Promise<string> {
        // Implement your logic to generate access token
        return this.jwtService.sign(payload, {
            expiresIn: this.configService.get('JWT_EXPIRE'),
            secret: this.configService.get('APP_SECRET'),
        });
    }
    private async generateRefreshToken(payload: any): Promise<string> {
        return this.jwtService.sign(payload, {
            expiresIn: this.configService.get('JWT_REFRESH_EXPIRE'),
            secret: this.configService.get('APP_SECRET'),
        });
    }
    public async refreshToken(dto: RefreshTokenRequestDto): Promise<RefreshTokenResponseDto> {
        let payload;
        try {
            payload = this.jwtService.verify(dto.refreshToken, {
                secret: this.configService.get('APP_SECRET'),
            });
        } catch (error) {
            this.loggerService.error('Invalid refresh token');
            throw new UnauthorizedException('Invalid refresh token');
        }
        const user = await this.userService.findById(payload.userId);
        if (!user) {
            this.loggerService.warn(`Token refresh attempt for non-existent user ID: ${payload.userId}`);
            throw new UnauthorizedException('User not found');
        }

        if (!user.isActive) {
            this.loggerService.warn(`Token refresh attempt for inactive user: ${user.email}`);
            throw new UnauthorizedException('Account is inactive');
        }
        const tokens = await this.generateToken(user);
        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        };
    }

    async forgotPassword(email: string): Promise<boolean> {
        try {
            // Find user by email
            const user = await this.userService.findByEmail(email);

            // If no user is found, we still return success for security reasons
            // This prevents email enumeration attacks
            if (!user) {
                this.loggerService.error(`Forgot password requested for non-existent email: ${email}`);
                throw new NotFoundException('User not found');
            }

            // Check if user is active
            if (!user.isActive) {
                this.loggerService.error(`Forgot password requested for inactive user: ${user.email}`);
                throw new UnauthorizedException('User is not active');
            }

            // Generate password reset token and expiration
            const resetToken = crypto.randomBytes(32).toString('hex');
            const passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour expiration

            const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

            // Save the token and expiration to user record
            await this.userRepository.update(user.id, {
                passwordResetToken: hashedToken,
                passwordResetExpires,
            });

            // Generate reset URL for email
            // const resetUrl = `${this.baseUrl}/reset-password?token=${resetToken}`;

            return true;
        } catch (error) {
            this.loggerService.error(`Error in forgot password: ${error.message}`);
            throw new AuthenticationError('Failed to send password reset email');
        }
    }

    public async resetPassword(token: string, newPassword: string): Promise<boolean> {
        try {
            // Hash the token to compare with the stored hashed token
            const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
            // Find user by hashed token and check if the token is expired
            const user = await this.userService.findByPasswordResetToken(hashedToken);

            if (!user) {
                this.loggerService.warn('Password reset attempt with invalid token');
                throw new AuthenticationError('Invalid or expired token');
            }

            const tokenExpired = user.passwordResetExpires < new Date();
            if (tokenExpired) {
                this.loggerService.warn(`Password reset attempt with expired token for user: ${user.email}`);
                throw new UnauthorizedException('Token has expired. Please request a new password reset.');
            }
            // Hash the new password
            const salt = await this.userService.generateSalt();
            const hashedPassword = await this.userService.hashPassword(newPassword, salt);
            // Update user password and clear reset token and expiration
            await this.userRepository.update(user.id, {
                password: hashedPassword,
                passwordResetToken: null,
                passwordResetExpires: null,
            });
            return true;
        } catch (error) {
            this.loggerService.error(`Error in reset password: ${error.message}`);
            throw new AuthenticationError('Failed to reset password');
        }
    }
    public async verifyEmail(token: string): Promise<boolean> {
        try {
            const user = await this.userRepository.findOne({
                where: { emailVerificationToken: token },
            });

            if (!user) {
                throw new NotFoundException('Invalid verification token');
            }

            // Update user verification status
            await this.userRepository.update(user.id, {
                isEmailVerified: true,
                emailVerificationToken: null,
            });

            return true;
        } catch (error) {
            this.loggerService.error(error);
            throw error;
        }
    }
}
