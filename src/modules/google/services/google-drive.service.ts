import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateConfig, Paginated, PaginateQuery } from 'nestjs-paginate';
import { Repository } from 'typeorm';
import { BaseService } from '../../../common/base.service';
import { LoggerService } from '../../../shared/services/logger.service';
import { MAX_RECORD_SAVE, NUMBER_RECORD_SAVE } from '../constants/google-api.constant';
import { GoogleDriveFileDto } from '../dtos/google-drive-file.dto';
import { GoogleDriveFolderDto } from '../dtos/google-drive-folder.dto';
import { GoogleDriveFilePaginationRequestDto, GoogleDriveFolderPaginationRequestDto } from '../dtos/requests';
import { GoogleDriveFileEntity } from '../entities/google-drive-file.entity';
import { GoogleDriveFolderEntity } from '../entities/google-drive-folder.entity';
import { GoogleApiType } from '../enums';
import { IGoogleApiParams, IGoogleDriveFile } from '../interfaces';
import { GoogleAuthService } from './google-auth.service';

@Injectable()
export class GoogleDriveService extends BaseService<GoogleDriveFileEntity> {
    constructor(
        private readonly loggerService: LoggerService,
        private readonly googleAuthService: GoogleAuthService,

        @InjectMapper() private readonly mapper: Mapper,

        @InjectRepository(GoogleDriveFileEntity)
        private readonly googleDriveFileRepository: Repository<GoogleDriveFileEntity>,

        @InjectRepository(GoogleDriveFolderEntity)
        private readonly googleDriveFolderRepository: Repository<GoogleDriveFolderEntity>,
    ) {
        super(googleDriveFileRepository);
    }

    async getFilesPagination(
        query: GoogleDriveFilePaginationRequestDto,
        globalConfig: PaginateConfig<GoogleDriveFileEntity>,
    ): Promise<Paginated<GoogleDriveFileDto>> {
        try {
            const baseRelations = Array.isArray(globalConfig.relations) ? (globalConfig.relations as string[]) : [];
            const paginatedResult: Paginated<GoogleDriveFileEntity> = await this.getPaginationWithCustomQuery(
                query as unknown as PaginateQuery,
                this.googleDriveFileRepository,
                {
                    ...globalConfig,
                    relations: baseRelations,
                },
            );

            const data = this.mapper.mapArray(paginatedResult.data, GoogleDriveFileEntity, GoogleDriveFileDto);
            return { ...paginatedResult, data } as Paginated<GoogleDriveFileDto>;
        } catch (error) {
            this.loggerService.error(`Get files pagination error: ${error?.message}`);
            throw error;
        }
    }

    async getFoldersPagination(
        query: GoogleDriveFolderPaginationRequestDto,
        globalConfig: PaginateConfig<GoogleDriveFolderEntity>,
    ): Promise<Paginated<GoogleDriveFolderDto>> {
        try {
            const baseRelations = Array.isArray(globalConfig.relations) ? (globalConfig.relations as string[]) : [];
            const paginatedResult: Paginated<GoogleDriveFolderEntity> = await this.getPaginationWithCustomQuery(
                query as unknown as PaginateQuery,
                this.googleDriveFolderRepository,
                {
                    ...globalConfig,
                    relations: baseRelations,
                },
            );

            const data = this.mapper.mapArray(paginatedResult.data, GoogleDriveFolderEntity, GoogleDriveFolderDto);
            return { ...paginatedResult, data } as Paginated<GoogleDriveFolderDto>;
        } catch (error) {
            this.loggerService.error(`Get folders pagination error: ${error?.message}`);
            throw error;
        }
    }

    async syncFromGoogleDrive(userId: string, folderId: string): Promise<boolean> {
        if (!userId) {
            this.loggerService.error(`User ID is required`);
            throw new BadRequestException('User ID is required');
        }

        const googleAuth = await this.googleAuthService.findOneByFilter({ userId });

        if (!googleAuth) {
            this.loggerService.error(`No Google auth found for user ${userId}`);
            throw new NotFoundException('No Google auth found for user');
        }

        if (!googleAuth.isActive) {
            this.loggerService.error(`Google auth is not active for user ${userId}`);
            throw new BadRequestException('Google auth is not active for user');
        }

        const googleDriveFolder = await this.googleDriveFolderRepository.findOneBy({ id: folderId });

        if (!googleDriveFolder) {
            this.loggerService.error(`No Google drive folder found for user ${userId}`);
            throw new NotFoundException('No Google drive folder found for user');
        }

        const savedFileEntities: GoogleDriveFileEntity[] = [];

        const params: IGoogleApiParams = {
            pageSize: MAX_RECORD_SAVE.toString(),
            q: `'${googleDriveFolder.googleDriveId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
            fields: 'nextPageToken, files(id,name,mimeType,size,webViewLink,webContentLink,thumbnailLink,parents,modifiedTime,viewedByMeTime,trashed,starred)',
        };

        let nextPageToken: string | undefined;

        do {
            if (nextPageToken) {
                params.pageToken = nextPageToken;
            }

            const data = await this.googleAuthService.callGoogleApi<IGoogleDriveFile>(GoogleApiType.GOOGLE_DRIVE, userId, params);

            const files = data?.files;
            if (files?.length) {
                const entities = files.map((f) => {
                    const fileEntity = this.googleDriveFileRepository.create({
                        name: f.name,
                        googleDriveId: f.id,
                        mimeType: f.mimeType,
                        webViewLink: f.webViewLink,
                        thumbnailLink: f.thumbnailLink,
                        webContentLink: f.webContentLink,
                        size: f.size ? Number(f.size) : null,
                        parentFolderId: f.parents?.[0] || null,
                        lastModified: f.modifiedTime ? new Date(f.modifiedTime) : null,
                        isTrashed: Boolean(f.trashed),
                        isStarred: Boolean(f.starred),
                        googleAuthId: googleAuth.id,
                        googleDriveFolderId: googleDriveFolder.id,
                    });
                    return fileEntity;
                });

                savedFileEntities.push(...entities);
            }

            nextPageToken = data?.nextPageToken;
        } while (nextPageToken);

        if (!savedFileEntities?.length) {
            this.loggerService.error(`No files found for user ${userId}`);
            return false;
        }

        const saved = await this.saveManyRecords(this.googleDriveFileRepository, savedFileEntities);
        return Boolean(saved);
    }

    async syncFoldersFromGoogleDrive(userId: string): Promise<boolean> {
        if (!userId) {
            this.loggerService.error(`User ID is required`);
            throw new BadRequestException('User ID is required');
        }

        const googleAuth = await this.googleAuthService.findOneByFilter({ userId });

        if (!googleAuth) {
            this.loggerService.error(`No Google auth found for user ${userId}`);
            throw new NotFoundException('No Google auth found for user');
        }

        if (!googleAuth.isActive) {
            this.loggerService.error(`Google auth is not active for user ${userId}`);
            throw new BadRequestException('Google auth is not active for user');
        }

        const savedFolderEntities: GoogleDriveFolderEntity[] = [];

        const params: IGoogleApiParams = {
            pageSize: MAX_RECORD_SAVE.toString(),
            q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
            fields: 'nextPageToken, files(id,name,parents,modifiedTime,trashed,starred)',
        };

        let nextPageToken: string | undefined;

        do {
            if (nextPageToken) {
                params.pageToken = nextPageToken;
            }

            const data = await this.googleAuthService.callGoogleApi<IGoogleDriveFile>(GoogleApiType.GOOGLE_DRIVE, userId, params);

            const files = data?.files;
            if (files?.length) {
                for (const f of files) {
                    const folderEntity = this.googleDriveFolderRepository.create({
                        name: f.name,
                        googleDriveId: f.id,
                        parentFolderId: f.parents?.[0] || null,
                        lastModified: f.modifiedTime ? new Date(f.modifiedTime) : null,
                        isTrashed: Boolean(f.trashed),
                        isStarred: Boolean(f.starred),
                        googleAuthId: googleAuth.id,
                    });
                    savedFolderEntities.push(folderEntity);
                }
            }

            nextPageToken = data?.nextPageToken;
        } while (nextPageToken);

        if (!savedFolderEntities?.length) {
            this.loggerService.error(`No folders found for user ${userId}`);
            return true;
        }

        const saved = await this.saveManyRecords(this.googleDriveFolderRepository, savedFolderEntities);
        return saved;
    }

    private async saveManyRecords<T>(repository: Repository<T>, data: T[]): Promise<boolean> {
        if (!data?.length) return true;

        if (data?.length > MAX_RECORD_SAVE) {
            let index = 0;

            while (index < data.length) {
                const stockReportEntities = data.slice(index, index + (NUMBER_RECORD_SAVE - 1));

                await repository.save(stockReportEntities);

                index += NUMBER_RECORD_SAVE;
            }
        } else {
            const result = await repository.save(data);
            return !!result;
        }

        return true;
    }
}
