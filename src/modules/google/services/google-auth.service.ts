import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isEmpty } from 'lodash';
import { Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { BaseHttpService } from '../../../shared/services/base-http.service';
import { GoogleAuthDto } from '../dtos/google-auth.dto';
import { UpdateGoogleAuthRequestDto } from '../dtos/requests';
import { GoogleAuthEntity } from '../entities/google-auth.entity';
import { GoogleApiType, GoogleApiUrl } from '../enums';
import { IGoogleApiRequest, IGoogleApiResponse } from '../interfaces';

@Injectable()
export class GoogleAuthService extends BaseService<GoogleAuthEntity, GoogleAuthDto> {
    constructor(
        private readonly httpClient: BaseHttpService,
        @InjectMapper() mapper: Mapper,
        @InjectRepository(GoogleAuthEntity) googleAuthRepository: Repository<GoogleAuthEntity>,
    ) {
        super(googleAuthRepository, mapper, GoogleAuthDto, GoogleAuthService.name);
    }

    async getListGoogleAuth(userId: string): Promise<GoogleAuthDto[]> {
        const googleAuths = await this.findListByFilter({ userId });
        if (!googleAuths?.length) {
            this.loggerService.error(`No Google auth found for user ${userId}`);
            return null;
        }

        return googleAuths;
    }

    async update(userId: string, request: UpdateGoogleAuthRequestDto): Promise<boolean> {
        const { email, accessToken, expiresIn, scope, tokenType, refreshToken, refreshTokenExpiresIn } = request;

        const existingGoogleAuth = await this.findOneByFilter({ userId, email });

        // Generate expires at
        const googleExpiresAt = this.generateExpiresAt(expiresIn);
        const googleRefreshTokenExpiresAt = refreshTokenExpiresIn ? this.generateExpiresAt(refreshTokenExpiresIn) : null;

        if (existingGoogleAuth) {
            return await super.update(existingGoogleAuth.id, {
                isActive: true,
                googleExpiresAt,
                googleScope: scope,
                googleTokenType: tokenType,
                googleAccessToken: accessToken,
                googleRefreshToken: refreshToken,
                googleRefreshTokenExpiresAt,
            });
        }

        const entity = this.repository.create({
            email,
            userId,
            isActive: true,
            googleExpiresAt,
            googleScope: scope,
            googleTokenType: tokenType,
            googleAccessToken: accessToken,
            googleRefreshToken: refreshToken,
            googleRefreshTokenExpiresAt,
        });

        const saved = await super.create(entity);
        return !!saved;
    }

    async getAuthHeaders(googleAuthId: string): Promise<Record<string, string>> {
        const googleAuth = await this.findOneByFilter({ id: googleAuthId });

        if (!googleAuth) {
            this.loggerService.error(`No Google auth found for id ${googleAuthId}`);
            throw new NotFoundException('No Google token found for user');
        }

        if (!googleAuth.googleAccessToken && !googleAuth.googleRefreshToken) {
            this.loggerService.error(`No access token found for id ${googleAuthId}`);
            throw new NotFoundException('No access token found for user');
        }

        const token = googleAuth.googleAccessToken;

        const isExpiredToken = this.isExpiredToken(googleAuth.googleExpiresAt);
        if (isExpiredToken) {
            this.loggerService.error(`Google auth expired for id ${googleAuthId}`);
            throw new NotFoundException('Google auth expired for user');
        }

        return { Authorization: `Bearer ${token}` };
    }

    async callGoogleApi<T>(request: IGoogleApiRequest): Promise<IGoogleApiResponse<T>> {
        const { googleAuthId, apiType, params } = request;

        const headers = await this.getAuthHeaders(googleAuthId);

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
            this.loggerService.error(`Google API call failed for id ${googleAuthId}: ${response?.data}`);
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
