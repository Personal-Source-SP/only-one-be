import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AxiosInstance } from 'axios';
import { Repository } from 'typeorm';
import { BaseService } from '../../../common/base.service';
import { IGoogleConfig } from '../../../shared/interfaces/app-config.interface';
import { AppConfigService } from '../../../shared/services/app-config.service';
import { BaseHttpService } from '../../../shared/services/base-http.service';
import { LoggerService } from '../../../shared/services/logger.service';
import { GoogleAuthRequestDto } from '../dtos/requests';
import { GoogleAuthEntity } from '../entities/google-auth.entity';
import { GoogleAuthParamsEnum } from '../enums';
import { IGoogleAuthResponse } from '../interfaces';

@Injectable()
export class GoogleAuthService extends BaseService<GoogleAuthEntity> {
    private readonly httpClient: AxiosInstance;
    private readonly googleConfig: IGoogleConfig;

    constructor(
        private readonly loggerService: LoggerService,
        private readonly httpService: BaseHttpService,
        private readonly appConfigService: AppConfigService,

        @InjectRepository(GoogleAuthEntity)
        private readonly googleAuthRepository: Repository<GoogleAuthEntity>,
    ) {
        super(googleAuthRepository);

        // Initialize google config
        this.googleConfig = this.appConfigService.googleConfig;
    }

    async authorizeUser(request: GoogleAuthRequestDto): Promise<string> {
        const { tokenEndpoint } = this.googleConfig;
        const { userId, code, redirectUri } = request;

        const payload = this.generateParams(GoogleAuthParamsEnum.AUTHORIZE, { code, redirectUri });
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
            const updated = await this.update(existingGoogleAuth.id, {
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

        const payload = this.generateParams(GoogleAuthParamsEnum.REFRESH, { refreshToken: googleAuth.googleRefreshToken });
        const response = await this.httpClient.post(tokenEndpoint, payload.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        if (response.status !== 200 || !response?.data?.access_token) {
            this.loggerService.error(`Google refresh token failed for user ${userId}: ${response?.data}`);
            throw new BadRequestException('Google refresh token failed');
        }

        const { access_token, expires_in, scope, token_type, refresh_token } = response.data;

        const googleExpiresAt = this.generateExpiresAt(expires_in);

        const updated = await this.update(googleAuth.id, {
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
        const params = this.generateParams(GoogleAuthParamsEnum.REVOKE, { refreshToken: token });

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

    private async getAuthHeaders(userId: string): Promise<Record<string, string>> {
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

    private generateExpiresAt(expiresIn: string): Date {
        const now = Date.now();
        return new Date(now + Math.max(0, (Number(expiresIn) || 0) - 60) * 1000);
    }

    private isExpiredToken(expiresAt: Date): boolean {
        const now = Date.now();
        return expiresAt.getTime() <= now + 30 * 1000;
    }

    private generateParams(
        type: GoogleAuthParamsEnum,
        request: {
            code?: string;
            redirectUri?: string;
            refreshToken?: string;
        },
    ): URLSearchParams {
        const { code, redirectUri, refreshToken } = request;
        const { clientId, clientSecret } = this.googleConfig;

        switch (type) {
            case GoogleAuthParamsEnum.AUTHORIZE:
                return new URLSearchParams({
                    code,
                    client_id: clientId,
                    client_secret: clientSecret,
                    redirect_uri: redirectUri,
                    grant_type: GoogleAuthParamsEnum.AUTHORIZE,
                });

            case GoogleAuthParamsEnum.REFRESH:
                return new URLSearchParams({
                    client_id: clientId,
                    client_secret: clientSecret,
                    refresh_token: refreshToken,
                    grant_type: GoogleAuthParamsEnum.REFRESH,
                });

            case GoogleAuthParamsEnum.REVOKE:
                return new URLSearchParams({
                    token: refreshToken,
                });
        }
    }
}
