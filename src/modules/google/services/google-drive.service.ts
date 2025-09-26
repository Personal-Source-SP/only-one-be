import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateConfig, Paginated, PaginateQuery } from 'nestjs-paginate';
import { Repository } from 'typeorm';
import { BaseService } from '../../../common/base.service';
import { AppConfigService } from '../../../shared/services/app-config.service';
import { LoggerService } from '../../../shared/services/logger.service';
import { GoogleDriveFileDto } from '../dtos/google-drive-file.dto';
import { GoogleDriveFilePaginationRequestDto } from '../dtos/requests';
import { GoogleDriveFileEntity } from '../entities/google-drive-file.entity';
import { GoogleAuthService } from './google-auth.service';

@Injectable()
export class GoogleDriveService extends BaseService<GoogleDriveFileEntity> {
    constructor(
        private readonly loggerService: LoggerService,
        private readonly appConfigService: AppConfigService,
        private readonly googleAuthService: GoogleAuthService,

        @InjectMapper() private readonly mapper: Mapper,

        @InjectRepository(GoogleDriveFileEntity)
        private readonly googleDriveFileRepository: Repository<GoogleDriveFileEntity>,
    ) {
        super(googleDriveFileRepository);
    }

    async getUserFilesPagination(
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
            this.loggerService.error(`Error in getUserFiles: ${error}`);
            throw error;
        }
    }

    public syncUserFiles = async (userId: string): Promise<{ created: number; updated: number; total: number }> => {
        const http: AxiosInstance = axios.create({ timeout: 20000 });
        const headers = await this.googleAuthService.getAuthHeaders(userId);
        const driveApiUrl = this.appConfigService.googleConfig.googleDriveApiUrl || 'https://www.googleapis.com/drive/v3/files';

        let nextPageToken: string | undefined;
        let created = 0;
        let updated = 0;

        do {
            const params: Record<string, string> = {
                q: 'trashed = false',
                pageSize: '1000',
                fields: 'nextPageToken, files(id,name,mimeType,size,webViewLink,webContentLink,thumbnailLink,parents,modifiedTime,viewedByMeTime,trashed,starred)',
            };
            if (nextPageToken) params.pageToken = nextPageToken;

            const { data } = await http.get(driveApiUrl, { headers, params }).catch((err) => {
                this.loggerService.error(`Google Drive list files error: ${err?.response?.data ?? err?.message}`);
                throw err;
            });

            const files: any[] = Array.isArray(data?.files) ? data.files : [];

            if (files.length > 0) {
                const upsertPayload: Partial<GoogleDriveFileEntity>[] = files.map((f) => ({
                    googleDriveId: f.id,
                    name: f.name,
                    mimeType: f.mimeType,
                    size: f.size ? Number(f.size) : null,
                    webViewLink: f.webViewLink,
                    webContentLink: f.webContentLink,
                    thumbnailLink: f.thumbnailLink,
                    parentFolderId: Array.isArray(f.parents) && f.parents.length > 0 ? f.parents[0] : null,
                    lastModified: f.modifiedTime ? new Date(f.modifiedTime) : null,
                    lastViewedByMe: f.viewedByMeTime ? new Date(f.viewedByMeTime) : null,
                    isTrashed: Boolean(f.trashed),
                    isStarred: Boolean(f.starred),
                    userId,
                    metadata: f,
                }));

                const result = await this.googleDriveFileRepository.upsert(upsertPayload, {
                    conflictPaths: ['googleDriveId'],
                    skipUpdateIfNoValuesChanged: true,
                });

                // TypeORM returns identifiers for inserts and number of affected rows may include updates
                // We estimate updates as affected - inserts when possible
                const affected = Array.isArray((result as any).identifiers) ? (result as any).identifiers.length : upsertPayload.length;
                // Not exact split; treat all as updated if already existed
                updated += affected; // conservative count
            }

            nextPageToken = data?.nextPageToken;
        } while (nextPageToken);

        const total = await this.googleDriveFileRepository.count({ where: { userId } as any });
        return { created, updated, total };
    };
}
