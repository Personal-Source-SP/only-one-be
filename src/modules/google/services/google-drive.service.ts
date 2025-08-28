import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { Repository } from 'typeorm';
import { AppConfigService } from '../../../shared/services/app-config.service';
import { SyncFilesRequestDto } from '../dtos/requests/sync-files.request.dto';
import { GoogleDriveFileResponseDto } from '../dtos/responses/google-drive-file.response.dto';
import { SyncResultResponseDto } from '../dtos/responses/sync-result.response.dto';
import { GoogleDriveStatusResponseDto } from '../dtos/responses/google-drive-status.response.dto';
import { PaginatedFilesResponseDto } from '../dtos/responses/paginated-files.response.dto';
import { GoogleDriveFileEntity } from '../entities/google-drive-file.entity';
import { GoogleDriveTokenEntity } from '../entities/google-drive-token.entity';

@Injectable()
export class GoogleDriveService {
    private readonly logger = new Logger(GoogleDriveService.name);
    private readonly googleDriveApiUrl = 'https://www.googleapis.com/drive/v3';

    constructor(
        private readonly configService: AppConfigService,
        @InjectRepository(GoogleDriveFileEntity)
        private readonly googleDriveFileRepository: Repository<GoogleDriveFileEntity>,
        @InjectRepository(GoogleDriveTokenEntity)
        private readonly googleDriveTokenRepository: Repository<GoogleDriveTokenEntity>,
    ) {}

    async authorizeUser(userId: string, code: string, redirectUri: string): Promise<void> {
        try {
            const clientId = this.configService.get('GOOGLE_CLIENT_ID');
            const clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET');

            const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            });

            const { access_token, refresh_token, expires_in, scope, token_type } = tokenResponse.data;

            const expiresAt = new Date();
            expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);

            // Save or update token
            await this.googleDriveTokenRepository.upsert(
                {
                    userId,
                    accessToken: access_token,
                    refreshToken: refresh_token,
                    expiresAt,
                    scope,
                    tokenType: token_type,
                    isActive: true,
                },
                { conflictPaths: ['userId'] },
            );

            this.logger.log(`User ${userId} authorized successfully`);
        } catch (error) {
            this.logger.error(`Failed to authorize user ${userId}:`, error.message);
            throw new HttpException('Failed to authorize Google Drive', HttpStatus.BAD_REQUEST);
        }
    }

    async refreshToken(userId: string): Promise<void> {
        try {
            const token = await this.googleDriveTokenRepository.findOne({
                where: { userId, isActive: true },
            });

            if (!token || !token.refreshToken) {
                throw new HttpException('No refresh token found', HttpStatus.BAD_REQUEST);
            }

            const clientId = this.configService.get('GOOGLE_CLIENT_ID');
            const clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET');

            const response = await axios.post('https://oauth2.googleapis.com/token', {
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: token.refreshToken,
                grant_type: 'refresh_token',
            });

            const { access_token, expires_in } = response.data;
            const expiresAt = new Date();
            expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);

            await this.googleDriveTokenRepository.update({ userId }, { accessToken: access_token, expiresAt });

            this.logger.log(`Token refreshed for user ${userId}`);
        } catch (error) {
            this.logger.error(`Failed to refresh token for user ${userId}:`, error.message);
            throw new HttpException('Failed to refresh token', HttpStatus.BAD_REQUEST);
        }
    }

    private async getValidAccessToken(userId: string): Promise<string> {
        const token = await this.googleDriveTokenRepository.findOne({
            where: { userId, isActive: true },
        });

        if (!token) {
            throw new HttpException('No Google Drive token found', HttpStatus.BAD_REQUEST);
        }

        // Check if token is expired or will expire in the next 5 minutes
        const now = new Date();
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

        if (token.expiresAt <= fiveMinutesFromNow) {
            await this.refreshToken(userId);
            const refreshedToken = await this.googleDriveTokenRepository.findOne({
                where: { userId, isActive: true },
            });
            return refreshedToken.accessToken;
        }

        return token.accessToken;
    }

    async syncFiles(userId: string, syncOptions: SyncFilesRequestDto): Promise<SyncResultResponseDto> {
        const startTime = Date.now();
        const result: SyncResultResponseDto = {
            totalProcessed: 0,
            created: 0,
            updated: 0,
            deleted: 0,
            skipped: 0,
            duration: 0,
            timestamp: new Date(),
        };

        try {
            const accessToken = await this.getValidAccessToken(userId);
            const files = await this.fetchFilesFromGoogleDrive(accessToken, syncOptions);

            result.totalProcessed = files.length;

            for (const file of files) {
                await this.processFile(userId, file, result);
            }

            // Handle deleted files (files that exist in DB but not in Google Drive)
            if (!syncOptions.folderId) {
                await this.handleDeletedFiles(
                    userId,
                    files.map((f) => f.id),
                    result,
                );
            }

            result.duration = Date.now() - startTime;
            this.logger.log(`Sync completed for user ${userId}: ${JSON.stringify(result)}`);

            return result;
        } catch (error) {
            this.logger.error(`Failed to sync files for user ${userId}:`, error.message);
            throw new HttpException('Failed to sync files', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private async fetchFilesFromGoogleDrive(accessToken: string, syncOptions: SyncFilesRequestDto): Promise<any[]> {
        const params = new URLSearchParams({
            fields: 'files(id,name,mimeType,size,webViewLink,webContentLink,thumbnailLink,parents,modifiedTime,viewedByMeTime,trashed,starred)',
            pageSize: '1000',
        });

        if (syncOptions.folderId) {
            params.append('q', `'${syncOptions.folderId}' in parents`);
        }

        if (!syncOptions.includeTrashed) {
            params.append('q', 'trashed=false');
        }

        if (syncOptions.starredOnly) {
            params.append('q', 'starred=true');
        }

        if (syncOptions.mimeType) {
            params.append('q', `mimeType='${syncOptions.mimeType}'`);
        }

        const response = await axios.get(`${this.googleDriveApiUrl}/files`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            params,
        });

        return response.data.files || [];
    }

    private async processFile(userId: string, file: any, result: SyncResultResponseDto): Promise<void> {
        try {
            const existingFile = await this.googleDriveFileRepository.findOne({
                where: { googleDriveId: file.id, userId },
            });

            const fileData = {
                googleDriveId: file.id,
                name: file.name,
                mimeType: file.mimeType,
                size: file.size ? parseInt(file.size) : null,
                webViewLink: file.webViewLink,
                webContentLink: file.webContentLink,
                thumbnailLink: file.thumbnailLink,
                parentFolderId: file.parents && file.parents.length > 0 ? file.parents[0] : null,
                lastModified: file.modifiedTime ? new Date(file.modifiedTime) : null,
                lastViewedByMe: file.viewedByMeTime ? new Date(file.viewedByMeTime) : null,
                isTrashed: file.trashed || false,
                isStarred: file.starred || false,
                userId,
            };

            if (existingFile) {
                // Check if file has changed
                if (this.hasFileChanged(existingFile, fileData)) {
                    await this.googleDriveFileRepository.update({ id: existingFile.id }, fileData);
                    result.updated++;
                } else {
                    result.skipped++;
                }
            } else {
                await this.googleDriveFileRepository.save(fileData);
                result.created++;
            }
        } catch (error) {
            this.logger.error(`Failed to process file ${file.id}:`, error.message);
            result.skipped++;
        }
    }

    private hasFileChanged(existingFile: GoogleDriveFileEntity, newFileData: any): boolean {
        return (
            existingFile.name !== newFileData.name ||
            existingFile.mimeType !== newFileData.mimeType ||
            existingFile.size !== newFileData.size ||
            existingFile.webViewLink !== newFileData.webViewLink ||
            existingFile.webContentLink !== newFileData.webContentLink ||
            existingFile.thumbnailLink !== newFileData.thumbnailLink ||
            existingFile.parentFolderId !== newFileData.parentFolderId ||
            existingFile.isTrashed !== newFileData.isTrashed ||
            existingFile.isStarred !== newFileData.isStarred ||
            existingFile.lastModified?.getTime() !== newFileData.lastModified?.getTime() ||
            existingFile.lastViewedByMe?.getTime() !== newFileData.lastViewedByMe?.getTime()
        );
    }

    private async handleDeletedFiles(userId: string, googleDriveIds: string[], result: SyncResultResponseDto): Promise<void> {
        const existingFiles = await this.googleDriveFileRepository.find({
            where: { userId },
        });

        for (const existingFile of existingFiles) {
            if (!googleDriveIds.includes(existingFile.googleDriveId)) {
                await this.googleDriveFileRepository.delete({ id: existingFile.id });
                result.deleted++;
            }
        }
    }

    async getUserFiles(
        userId: string,
        page: number = 1,
        limit: number = 20,
        filters?: {
            mimeType?: string;
            starredOnly?: boolean;
            trashedOnly?: boolean;
        },
    ): Promise<PaginatedFilesResponseDto> {
        const whereConditions: any = { userId };

        if (filters?.mimeType) {
            whereConditions.mimeType = filters.mimeType;
        }

        if (filters?.starredOnly) {
            whereConditions.isStarred = true;
        }

        if (filters?.trashedOnly) {
            whereConditions.isTrashed = true;
        }

        const [files, total] = await this.googleDriveFileRepository.findAndCount({
            where: whereConditions,
            skip: (page - 1) * limit,
            take: limit,
            order: { lastModified: 'DESC' },
        });

        const responseFiles = files.map((file) => ({
            id: file.id,
            googleDriveId: file.googleDriveId,
            name: file.name,
            mimeType: file.mimeType,
            size: file.size,
            webViewLink: file.webViewLink,
            webContentLink: file.webContentLink,
            thumbnailLink: file.thumbnailLink,
            parentFolderId: file.parentFolderId,
            lastModified: file.lastModified,
            lastViewedByMe: file.lastViewedByMe,
            isTrashed: file.isTrashed,
            isStarred: file.isStarred,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
        }));

        const totalPages = Math.ceil(total / limit);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;

        return {
            files: responseFiles,
            total,
            page,
            limit,
            totalPages,
            hasNext,
            hasPrev,
        };
    }

    async getFileById(userId: string, fileId: string): Promise<GoogleDriveFileResponseDto> {
        const file = await this.googleDriveFileRepository.findOne({
            where: { id: fileId, userId },
        });

        if (!file) {
            throw new HttpException('File not found', HttpStatus.NOT_FOUND);
        }

        return {
            id: file.id,
            googleDriveId: file.googleDriveId,
            name: file.name,
            mimeType: file.mimeType,
            size: file.size,
            webViewLink: file.webViewLink,
            webContentLink: file.webContentLink,
            thumbnailLink: file.thumbnailLink,
            parentFolderId: file.parentFolderId,
            lastModified: file.lastModified,
            lastViewedByMe: file.lastViewedByMe,
            isTrashed: file.isTrashed,
            isStarred: file.isStarred,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
        };
    }

    async getGoogleDriveStatus(userId: string): Promise<GoogleDriveStatusResponseDto> {
        const token = await this.googleDriveTokenRepository.findOne({
            where: { userId, isActive: true },
        });

        const fileCount = await this.googleDriveFileRepository.count({
            where: { userId },
        });

        const isAuthorized = !!token;
        const isTokenExpired = token ? new Date() > token.expiresAt : false;

        // Get last sync time (using the most recent file's updatedAt)
        const lastFile = await this.googleDriveFileRepository.findOne({
            where: { userId },
            order: { updatedAt: 'DESC' },
        });

        return {
            isAuthorized,
            tokenExpiresAt: token?.expiresAt,
            isTokenExpired,
            totalFilesSynced: fileCount,
            lastSyncAt: lastFile?.updatedAt,
            syncStatus: 'idle', // This could be enhanced with a sync status tracking system
        };
    }

    async revokeAccess(userId: string): Promise<void> {
        try {
            const token = await this.googleDriveTokenRepository.findOne({
                where: { userId, isActive: true },
            });

            if (token) {
                // Revoke token with Google
                await axios.post('https://oauth2.googleapis.com/revoke', {
                    token: token.accessToken,
                });

                // Deactivate token in database
                await this.googleDriveTokenRepository.update({ userId }, { isActive: false });

                // Delete all files for this user
                await this.googleDriveFileRepository.delete({ userId });

                this.logger.log(`Access revoked for user ${userId}`);
            }
        } catch (error) {
            this.logger.error(`Failed to revoke access for user ${userId}:`, error.message);
            throw new HttpException('Failed to revoke access', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
