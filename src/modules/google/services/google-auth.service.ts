import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isEmpty } from 'lodash';
import { Repository } from 'typeorm';
import { BaseService } from '../../../common/base.service';
import { BaseHttpService } from '../../../shared/services/base-http.service';
import { LoggerService } from '../../../shared/services/logger.service';
import { GoogleAuthDto } from '../dtos/google-auth.dto';
import { UpdateGoogleAuthRequestDto } from '../dtos/requests';
import { GoogleAuthEntity } from '../entities/google-auth.entity';
import { GoogleApiType, GoogleApiUrl } from '../enums';
import { IGoogleApiParams, IGoogleApiRequest, IGoogleApiResponse } from '../interfaces';

@Injectable()
export class GoogleAuthService extends BaseService<GoogleAuthEntity> {
    constructor(
        private readonly loggerService: LoggerService,
        private readonly httpClient: BaseHttpService,

        @InjectMapper() private readonly mapper: Mapper,

        @InjectRepository(GoogleAuthEntity)
        private readonly googleAuthRepository: Repository<GoogleAuthEntity>,
    ) {
        super(googleAuthRepository);
    }

    async getGoogleAuth(userId: string): Promise<GoogleAuthDto> {
        const googleAuth = await this.findOneByFilter({ userId });

        if (!googleAuth) {
            this.loggerService.error(`No Google auth found for user ${userId}`);
            return null;
        }

        const expired = this.isExpiredToken(googleAuth.googleExpiresAt);
        if (expired) {
            this.loggerService.error(`Google auth expired for user ${userId}`);
            return null;
        }

        const dto = this.mapper.map(googleAuth, GoogleAuthEntity, GoogleAuthDto);
        return dto;
    }

    async updateGoogleAuth(request: UpdateGoogleAuthRequestDto, userId: string): Promise<boolean> {
        const { accessToken, expiresIn, scope, tokenType, refreshToken, refreshTokenExpiresIn } = request;

        const existingGoogleAuth = await this.findOneByFilter({ userId });

        // Generate expires at
        const googleExpiresAt = this.generateExpiresAt(expiresIn);
        const googleRefreshTokenExpiresAt = refreshTokenExpiresIn ? this.generateExpiresAt(refreshTokenExpiresIn) : null;

        if (existingGoogleAuth) {
            await this.update(existingGoogleAuth.id, {
                isActive: true,
                googleExpiresAt,
                googleScope: scope,
                googleTokenType: tokenType,
                googleAccessToken: accessToken,
                googleRefreshToken: refreshToken,
                googleRefreshTokenExpiresAt,
            });

            return true;
        }

        const entity = this.googleAuthRepository.create({
            userId,
            isActive: true,
            googleExpiresAt,
            googleScope: scope,
            googleTokenType: tokenType,
            googleAccessToken: accessToken,
            googleRefreshToken: refreshToken,
            googleRefreshTokenExpiresAt,
        });

        const saved = await this.create(entity);
        return !!saved;
    }

    async getAuthHeaders(userId: string, googleAuthId: string): Promise<Record<string, string>> {
        const googleAuth = await this.findOneByFilter({ userId, id: googleAuthId });

        if (!googleAuth) {
            this.loggerService.error(`No Google auth found for user ${userId}`);
            throw new NotFoundException('No Google token found for user');
        }

        if (!googleAuth.googleAccessToken && !googleAuth.googleRefreshToken) {
            this.loggerService.error(`No access token found for user ${userId}`);
            throw new NotFoundException('No access token found for user');
        }

        let token = googleAuth.googleAccessToken;

        const isExpiredToken = this.isExpiredToken(googleAuth.googleExpiresAt);
        if (isExpiredToken) {
            this.loggerService.error(`Google auth expired for user ${userId}`);
            throw new NotFoundException('Google auth expired for user');
        }

        return { Authorization: `Bearer ${token}` };
    }

    async callGoogleApi<T>(request: IGoogleApiRequest): Promise<IGoogleApiResponse<T>> {
        const { userId, googleAuthId, apiType, params } = request;

        const headers = await this.getAuthHeaders(userId, googleAuthId);

        let url = '';

        switch (apiType) {
            case GoogleApiType.GOOGLE_DRIVE: {
                url = GoogleApiUrl.GOOGLE_DRIVE;
                break;
            }

            default: {
                this.loggerService.error(`Invalid API type: ${apiType}`);
                throw new BadRequestException('Invalid API type');
            }
        }

        const response = await this.httpClient.get<any>(url, { headers, params });

        if (response.status !== 200 || isEmpty(response?.data)) {
            this.loggerService.error(`Google API call failed for user ${userId}: ${response?.data}`);
            throw new BadRequestException('Google API call failed');
        }

        switch (apiType) {
            case GoogleApiType.GOOGLE_DRIVE: {
                const data = Array.isArray(response?.data?.files) ? response?.data?.files : [];

                return {
                    files: data as unknown as T[],
                    nextPageToken: response?.data?.nextPageToken,
                };
            }

            default: {
                return null;
            }
        }
    }

    private generateExpiresAt(expiresIn: number | string): Date {
        const now = Date.now();
        return new Date(now + Math.max(0, (Number(expiresIn) || 0) - 60) * 1000);
    }

    private isExpiredToken(expiresAt: Date): boolean {
        const now = Date.now();
        return expiresAt.getTime() <= now + 30 * 1000;
    }
}
