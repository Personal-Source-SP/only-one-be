import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AxiosInstance } from 'axios';
import { isEmpty } from 'lodash';
import { Repository } from 'typeorm';
import { BaseService } from '../../../common/base.service';
import { IGoogleConfig } from '../../../shared/interfaces/app-config.interface';
import { AppConfigService } from '../../../shared/services/app-config.service';
import { BaseHttpService } from '../../../shared/services/base-http.service';
import { LoggerService } from '../../../shared/services/logger.service';
import { GoogleAuthDto } from '../dtos/google-auth.dto';
import { GoogleAuthRequestDto } from '../dtos/requests';
import { GoogleAuthEntity } from '../entities/google-auth.entity';
import { GoogleApiType, GoogleApiUrl, GoogleAuthParamsType } from '../enums';
import { IGoogleApiParams, IGoogleApiResponse, IGoogleAuthResponse } from '../interfaces';

@Injectable()
export class GoogleAuthService extends BaseService<GoogleAuthEntity> {
    private readonly httpClient: AxiosInstance;
    private readonly googleConfig: IGoogleConfig;

    constructor(
        private readonly loggerService: LoggerService,
        private readonly httpService: BaseHttpService,
        private readonly appConfigService: AppConfigService,

        @InjectMapper() private readonly mapper: Mapper,

        @InjectRepository(GoogleAuthEntity)
        private readonly googleAuthRepository: Repository<GoogleAuthEntity>,
    ) {
        super(googleAuthRepository);

        // Initialize google config
        this.googleConfig = this.appConfigService.googleConfig;
    }

    async getGoogleAuth(userId: string): Promise<GoogleAuthDto> {
        const googleAuth = await this.findOneByFilter({ userId });

        if (!googleAuth) {
            this.loggerService.error(`No Google auth found for user ${userId}`);
            throw new NotFoundException('No Google auth found for user');
        }

        const expired = this.isExpiredToken(googleAuth.googleExpiresAt);
        if (!expired) {
            const refreshed = await this.refreshToken(userId);

            if (!refreshed) {
                this.loggerService.error(`Google refresh token failed for user ${userId}`);
                throw new BadRequestException('Google refresh token failed');
            }

            googleAuth.googleAccessToken = refreshed;
        }

        const dto = this.mapper.map(googleAuth, GoogleAuthEntity, GoogleAuthDto);
        return dto;
    }

    async authorizeUser(request: GoogleAuthRequestDto, userId: string): Promise<string> {
        const { code, redirectUri } = request;
        const { tokenEndpoint } = this.googleConfig;

        const payload = this.generateAuthParams(GoogleAuthParamsType.AUTHORIZE, { code, redirectUri });
        const response = await this.httpService.post<IGoogleAuthResponse>(tokenEndpoint, payload.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        if (response.status !== 200 || !response?.data?.access_token) {
            this.loggerService.error(`Google auth failed for user ${userId}: ${response?.data}`);
            throw new BadRequestException('Google auth failed');
        }

        const existingGoogleAuth = await this.findOneByFilter({ userId });

        const { access_token, refresh_token, expires_in, scope, token_type } = response.data;

        // Generate expires at
        const googleExpiresAt = this.generateExpiresAt(expires_in);

        if (existingGoogleAuth) {
            await this.update(existingGoogleAuth.id, {
                isActive: true,
                googleExpiresAt,
                googleScope: scope,
                googleTokenType: token_type,
                googleAccessToken: access_token,
                googleRefreshToken: refresh_token,
            });

            return access_token;
        }

        const entity = this.googleAuthRepository.create({
            userId,
            isActive: true,
            googleExpiresAt,
            googleScope: scope,
            googleTokenType: token_type,
            googleAccessToken: access_token,
            googleRefreshToken: refresh_token,
        });

        const saved = await this.create(entity);

        return saved.googleAccessToken;
    }

    async refreshToken(userId: string): Promise<string> {
        const { tokenEndpoint } = this.googleConfig;

        const googleAuth = await this.findOneByFilter({ userId });
        if (!googleAuth?.googleRefreshToken) {
            this.loggerService.error(`No refresh token found for user ${userId}`);
            throw new NotFoundException('No refresh token found for user');
        }

        const payload = this.generateAuthParams(GoogleAuthParamsType.REFRESH, { refreshToken: googleAuth.googleRefreshToken });
        const response = await this.httpClient.post(tokenEndpoint, payload.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        if (response.status !== 200 || !response?.data?.access_token) {
            this.loggerService.error(`Google refresh token failed for user ${userId}: ${response?.data}`);
            throw new BadRequestException('Google refresh token failed');
        }

        const { access_token, expires_in, scope, token_type, refresh_token } = response.data;

        const googleExpiresAt = this.generateExpiresAt(expires_in);

        await this.update(googleAuth.id, {
            googleExpiresAt,
            googleScope: scope,
            googleTokenType: token_type,
            googleAccessToken: access_token,
            googleRefreshToken: refresh_token,
        });

        return access_token;
    }

    async revokeAccess(userId: string): Promise<boolean> {
        const { revokeEndpoint } = this.googleConfig;

        const googleAuth = await this.findOneByFilter({ userId });

        if (!googleAuth) {
            this.loggerService.error(`No Google auth found for user ${userId}`);
            throw new NotFoundException('No Google auth found for user');
        }

        if (!googleAuth.googleRefreshToken && !googleAuth.googleAccessToken) {
            this.loggerService.error(`No refresh or access token found for user ${userId}`);
            throw new NotFoundException('No refresh or access token found for user');
        }

        const token = googleAuth.googleRefreshToken || googleAuth.googleAccessToken;
        const params = this.generateAuthParams(GoogleAuthParamsType.REVOKE, { refreshToken: token });

        const authHeaders = await this.getAuthHeaders(userId);
        const response = await this.httpClient.post(revokeEndpoint, params.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...authHeaders },
        });

        if (response.status !== 200) {
            this.loggerService.error(`Google revoke token failed for user ${userId}: ${response?.data}`);
            throw new BadRequestException('Google revoke token failed');
        }

        const updated = await this.update(googleAuth.id, { isActive: false });
        return updated;
    }

    async getAuthHeaders(userId: string): Promise<Record<string, string>> {
        const googleAuth = await this.findOneByFilter({ userId });

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
            token = await this.refreshToken(userId);
        }

        return { Authorization: `Bearer ${token}` };
    }

    async callGoogleApi<T>(apiType: GoogleApiType, userId: string, params?: IGoogleApiParams): Promise<IGoogleApiResponse<T>> {
        const headers = await this.getAuthHeaders(userId);

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

        const response = await this.httpClient.get(url, { headers, params });

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

    private generateExpiresAt(expiresIn: string): Date {
        const now = Date.now();
        return new Date(now + Math.max(0, (Number(expiresIn) || 0) - 60) * 1000);
    }

    private isExpiredToken(expiresAt: Date): boolean {
        const now = Date.now();
        return expiresAt.getTime() <= now + 30 * 1000;
    }

    private generateAuthParams(
        type: GoogleAuthParamsType,
        request: {
            code?: string;
            redirectUri?: string;
            refreshToken?: string;
        },
    ): URLSearchParams {
        const { code, redirectUri, refreshToken } = request;
        const { clientId, clientSecret } = this.googleConfig;

        switch (type) {
            case GoogleAuthParamsType.AUTHORIZE:
                return new URLSearchParams({
                    code,
                    client_id: clientId,
                    client_secret: clientSecret,
                    redirect_uri: redirectUri,
                    grant_type: GoogleAuthParamsType.AUTHORIZE,
                });

            case GoogleAuthParamsType.REFRESH:
                return new URLSearchParams({
                    client_id: clientId,
                    client_secret: clientSecret,
                    refresh_token: refreshToken,
                    grant_type: GoogleAuthParamsType.REFRESH,
                });

            case GoogleAuthParamsType.REVOKE:
                return new URLSearchParams({
                    token: refreshToken,
                });
        }
    }
}
