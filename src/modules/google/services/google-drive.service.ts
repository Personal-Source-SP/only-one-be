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
import { GoogleDriveFilePaginationRequestDto } from '../dtos/requests';
import { GoogleDriveFileEntity } from '../entities/google-drive-file.entity';
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

    async syncFilesFromGoogleDrive(userId: string): Promise<boolean> {
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

        const savedEntities: GoogleDriveFileEntity[] = [];

        const params: IGoogleApiParams = {
            q: 'trashed = false',
            pageSize: MAX_RECORD_SAVE.toString(),
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
                const entities: GoogleDriveFileEntity[] = files.map((f) =>
                    this.googleDriveFileRepository.create({
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
                    }),
                );

                savedEntities.push(...entities);
            }

            nextPageToken = data?.nextPageToken;
        } while (nextPageToken);

        if (!savedEntities?.length) {
            this.loggerService.error(`No files found for user ${userId}`);
            return false;
        }

        const saved = await this.saveManyRecords(this.googleDriveFileRepository, savedEntities);
        return saved;
    }

    private async saveManyRecords<T>(repository: Repository<T>, data: T[]): Promise<boolean> {
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
