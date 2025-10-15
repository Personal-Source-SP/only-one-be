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
import {
    GoogleDriveFilePaginationRequestDto,
    GoogleDriveFolderPaginationRequestDto,
    GoogleDrivePreviewRequest,
    GoogleDriveSyncRequest,
} from '../dtos/requests';
import { GoogleDrivePreviewItem, GoogleDrivePreviewResponse } from '../dtos/responses/google-drive-preview-response.dto';
import { GoogleDriveFileEntity } from '../entities/google-drive-file.entity';
import { GoogleDriveFolderEntity } from '../entities/google-drive-folder.entity';
import { GoogleApiType, GoogleDriveType } from '../enums';
import { IGenerateParams, IGoogleApiParams, IGoogleDriveFile } from '../interfaces';
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

            return {
                data: [],
                meta: null,
                links: null,
            };
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
            return {
                data: [],
                meta: null,
                links: null,
            };
        }
    }

    async saveDataSync(userId: string, request: GoogleDriveSyncRequest): Promise<boolean> {
        if (!userId) {
            this.loggerService.error(`User ID is required`);
            throw new BadRequestException('User ID is required');
        }

        const googleAuth = await this.googleAuthService.findOneByFilter({ userId, id: request.googleAuthId });
        if (!googleAuth) {
            this.loggerService.error(`No Google auth found for user ${userId}`);
            throw new NotFoundException('No Google auth found for user');
        }

        switch (request.type) {
            case GoogleDriveType.FILE: {
                const googleDriveFolder = await this.googleDriveFolderRepository.findOneBy({ id: request.folderId });
                if (!googleDriveFolder) {
                    this.loggerService.error(`No Google drive folder found for user ${userId}`);
                    throw new NotFoundException('No Google drive folder found for user');
                }

                return await this.saveFiles(googleAuth.id, googleDriveFolder.id, request.data);
            }

            case GoogleDriveType.FOLDER: {
                return await this.saveFolders(googleAuth.id, request.data);
            }

            default: {
                this.loggerService.error(`Invalid type: ${request.type}`);
                throw new BadRequestException('Invalid type');
            }
        }
    }

    async previewDataSync(userId: string, request: GoogleDrivePreviewRequest): Promise<GoogleDrivePreviewResponse> {
        if (!userId) {
            this.loggerService.error(`User ID is required`);
            throw new BadRequestException('User ID is required');
        }

        const { maxResults, type, query, folderId } = request;

        let totalCount = 0;
        let nextPageToken: string | undefined;

        const previewItems: GoogleDrivePreviewItem[] = [];

        try {
            do {
                const params = this.generateQuery({
                    type,
                    query,
                    folderId,
                    nextPageToken,
                });

                const data = await this.googleAuthService.callGoogleApi<IGoogleDriveFile>({
                    userId,
                    params,
                    googleAuthId: request.googleAuthId,
                    apiType: GoogleApiType.GOOGLE_DRIVE,
                });

                const files = data?.files;
                if (files?.length) {
                    const items = files.map(
                        (f) =>
                            new GoogleDrivePreviewItem({
                                name: f.name,
                                googleDriveId: f.id,
                                mimeType: f.mimeType,
                                webViewLink: f.webViewLink,
                                thumbnailLink: f.thumbnailLink,
                                webContentLink: f.webContentLink,
                                size: f.size ? Number(f.size) : undefined,
                                parentFolderId: f.parents?.[0] || undefined,
                                lastModified: f.modifiedTime ? new Date(f.modifiedTime) : undefined,
                                isTrashed: Boolean(f.trashed),
                                isStarred: Boolean(f.starred),
                            }),
                    );

                    previewItems.push(...items);
                    totalCount += items.length;
                }

                nextPageToken = data?.nextPageToken;

                // Check if the total number of items has reached the maximum number of items to return
                if (maxResults && totalCount >= maxResults) {
                    break;
                }
            } while (nextPageToken);
        } catch (error) {
            this.loggerService.error(`Preview data sync error: ${error?.message}`);
        }

        const totalSize = previewItems?.reduce((acc, item) => acc + (item.size || 0), 0) || 0;

        return new GoogleDrivePreviewResponse({
            totalSize,
            nextPageToken,
            hasMore: Boolean(nextPageToken),
            totalCount: previewItems?.length || 0,
            data: maxResults ? previewItems.slice(0, maxResults) : previewItems,
        });
    }

    private generateQuery(request: IGenerateParams): IGoogleApiParams {
        const { pageSize, folderId, type, nextPageToken, isTrashed, isStarred } = request;

        const params: IGoogleApiParams = {
            pageSize: Math.min(pageSize || MAX_RECORD_SAVE, MAX_RECORD_SAVE).toString(),
        };

        if (nextPageToken) {
            params.pageToken = nextPageToken;
        }

        let query = '';
        let fields = '';

        switch (type) {
            case GoogleDriveType.FILE: {
                query += " and mimeType != 'application/vnd.google-apps.folder'";
                fields +=
                    'nextPageToken, files(id,name,mimeType,size,webViewLink,webContentLink,thumbnailLink,parents,modifiedTime,viewedByMeTime,trashed,starred)';

                break;
            }

            case GoogleDriveType.FOLDER: {
                query += " and mimeType = 'application/vnd.google-apps.folder'";
                fields += 'nextPageToken, files(id,name,parents,modifiedTime,trashed,starred)';

                break;
            }
        }

        if (folderId) {
            query += ` and '${folderId}' in parents`;
        }

        if (folderId) {
            query += ` and '${request.folderId}' in parents`;
        }

        if (isTrashed) {
            query += ' and trashed = true';
        } else {
            query += ' and trashed = false';
        }

        if (isStarred) {
            query += ' and starred = true';
        } else {
            query += ' and starred = false';
        }

        if (query) {
            query += ` and name contains '${request.query}'`;
        }

        // Set the query and fields
        params.fields = fields;
        params.q = query.trim().startsWith('and ') ? query.trim().slice(4) : query;

        return params;
    }

    private async saveFiles(googleAuthId: string, googleDriveFolderId: string, data: GoogleDrivePreviewItem[]): Promise<boolean> {
        const googleDriveFileEntities = this.mapper.mapArray(data, GoogleDrivePreviewItem, GoogleDriveFileEntity);
        googleDriveFileEntities.forEach((entity) => {
            entity.googleAuthId = googleAuthId;
            entity.googleDriveFolderId = googleDriveFolderId;
        });

        return await this.saveManyRecords(this.googleDriveFileRepository, googleDriveFileEntities);
    }

    private async saveFolders(googleAuthId: string, data: GoogleDrivePreviewItem[]): Promise<boolean> {
        const googleDriveFolderEntities = this.mapper.mapArray(data, GoogleDrivePreviewItem, GoogleDriveFolderEntity);
        googleDriveFolderEntities.forEach((entity) => {
            entity.googleAuthId = googleAuthId;
        });

        return await this.saveManyRecords(this.googleDriveFolderRepository, googleDriveFolderEntities);
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
