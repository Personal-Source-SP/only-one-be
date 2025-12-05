import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MimeType } from '../../../common/enums/mime-type';
import { LoggerService } from '../../../shared/services/logger.service';
import { MAX_RECORD_SAVE, NUMBER_RECORD_SAVE } from '../constants/google-api.constant';
import { GoogleDrivePreviewRequest, GoogleDriveSyncRequest } from '../dtos/requests';
import { GoogleDrivePreviewItem, GoogleDrivePreviewResponse } from '../dtos/responses/google-drive-preview-response.dto';
import { GoogleDriveFileEntity } from '../entities/google-drive-file.entity';
import { GoogleDriveFolderEntity } from '../entities/google-drive-folder.entity';
import { GoogleApiType, GoogleDriveType } from '../enums';
import { IGenerateParams, IGoogleApiParams, IGoogleDriveFile } from '../interfaces';
import { GoogleAuthService } from './google-auth.service';
import { UtilsService } from '../../../shared/services/utils.service';

@Injectable()
export class GoogleDriveService {
    private readonly loggerService: LoggerService = new LoggerService(GoogleDriveService.name);

    constructor(
        private readonly googleAuthService: GoogleAuthService,
        @InjectMapper() private readonly mapper: Mapper,
        @InjectRepository(GoogleDriveFileEntity)
        private readonly googleDriveFileRepository: Repository<GoogleDriveFileEntity>,
        @InjectRepository(GoogleDriveFolderEntity)
        private readonly googleDriveFolderRepository: Repository<GoogleDriveFolderEntity>,
    ) {}

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

        const { maxResults, type, customQuery, folderId, fileTypes, modifiedTimeFrom, modifiedTimeTo } = request;

        // Get the drive folder ID
        let driveFolderId = folderId;
        if (folderId) {
            const googleDriveFolder = await this.googleDriveFolderRepository.findOneBy({ id: folderId });
            driveFolderId = googleDriveFolder?.googleDriveId;
        }

        let totalCount = 0;
        let nextPageToken: string | undefined;
        const previewItems: GoogleDrivePreviewItem[] = [];

        try {
            do {
                const params = this.generateQuery({
                    type,
                    driveFolderId,
                    fileTypes,
                    modifiedTimeFrom,
                    modifiedTimeTo,
                    customQuery,
                    nextPageToken,
                });

                const data = await this.googleAuthService.callGoogleApi<IGoogleDriveFile>({
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
                                webViewLink: f.webViewLink,
                                thumbnailLink: f.thumbnailLink,
                                webContentLink: f.webContentLink,
                                size: f.size ? Number(f.size) : undefined,
                                parentFolderId: f.parents?.[0] || undefined,
                                mimeType: UtilsService.transformMimeType(f.mimeType),
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

        // Filter out existing files
        const newData = await this.checkExistData(previewItems, type);

        // Get the data
        const data = maxResults ? newData.slice(0, maxResults) : newData;
        const totalSize = data?.reduce((acc, item) => acc + (item.size || 0), 0) || 0;

        return new GoogleDrivePreviewResponse({
            data,
            totalSize,
            nextPageToken,
            totalCount: data?.length || 0,
            hasMore: Boolean(nextPageToken),
        });
    }

    private generateQuery(request: IGenerateParams): IGoogleApiParams {
        const { driveFolderId, type, fileTypes, modifiedTimeFrom, modifiedTimeTo, nextPageToken, isTrashed, isStarred, customQuery } =
            request;

        const params: IGoogleApiParams = {
            pageSize: MAX_RECORD_SAVE.toString(),
        };

        if (nextPageToken) {
            params.pageToken = nextPageToken;
        }

        let query = '';
        let fields = '';

        // Refine by type
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

        // Refine by fileType
        if (fileTypes?.length) {
            const fileTypeQuery = this.refineByFileType(fileTypes);
            query += fileTypeQuery;
        }

        if (driveFolderId) {
            query += ` and '${driveFolderId}' in parents`;
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

        if (customQuery) {
            query += ` and name contains '${customQuery}'`;
        }

        if (modifiedTimeFrom) {
            query += ` and modifiedTime >= '${modifiedTimeFrom}'`;
        }

        if (modifiedTimeTo) {
            query += ` and modifiedTime <= '${modifiedTimeTo}'`;
        }

        // Set the query and fields
        params.fields = fields;
        params.q = query.trim().startsWith('and ') ? query.trim().slice(4) : query;

        return params;
    }

    private refineByFileType(fileTypes: MimeType[]): string {
        let queries: string[] = [];

        fileTypes.forEach((fileType) => {
            switch (fileType) {
                case MimeType.DOCUMENT:
                    queries.push(
                        "(mimeType in ('application/vnd.google-apps.document','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain'))",
                    );
                    break;
                case MimeType.SPREADSHEET:
                    queries.push(
                        "(mimeType in ('application/vnd.google-apps.spreadsheet','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv'))",
                    );
                    break;
                case MimeType.PRESENTATION:
                    queries.push(
                        "(mimeType in ('application/vnd.google-apps.presentation','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation'))",
                    );
                    break;
                case MimeType.PDF:
                    queries.push("(mimeType = 'application/pdf')");
                    break;
                case MimeType.IMAGE:
                    queries.push("(mimeType contains 'image/')");
                    break;
                case MimeType.VIDEO:
                    queries.push("(mimeType contains 'video/')");
                    break;
                case MimeType.AUDIO:
                    queries.push("(mimeType contains 'audio/')");
                    break;
                case MimeType.ARCHIVE:
                    queries.push(
                        "(mimeType in ('application/zip','application/x-7z-compressed','application/x-rar-compressed','application/x-tar'))",
                    );
                    break;
            }
        });

        if (queries.length > 0) {
            return ' and (' + queries.join(' or ') + ')';
        }

        return '';
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

    private async checkExistData(previewItems: GoogleDrivePreviewItem[], type: GoogleDriveType): Promise<GoogleDrivePreviewItem[]> {
        const googleDriveIds = previewItems.map((item) => item.googleDriveId);

        let existGoogleDriveIds: string[] = [];

        switch (type) {
            case GoogleDriveType.FILE: {
                const existFiles = await this.googleDriveFileRepository.find({
                    where: { googleDriveId: In(googleDriveIds) },
                    select: ['googleDriveId'],
                });

                existGoogleDriveIds = existFiles.map((file) => file.googleDriveId);

                break;
            }

            case GoogleDriveType.FOLDER: {
                const existFolders = await this.googleDriveFolderRepository.find({
                    where: { googleDriveId: In(googleDriveIds) },
                    select: ['googleDriveId'],
                });

                existGoogleDriveIds = existFolders.map((folder) => folder.googleDriveId);

                break;
            }
        }

        const existDataSet = new Set(existGoogleDriveIds.map((id) => id));
        const newData = previewItems?.filter((item) => !existDataSet.has(item.googleDriveId));

        return newData;
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
