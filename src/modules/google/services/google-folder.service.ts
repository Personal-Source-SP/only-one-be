import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateConfig, Paginated, PaginateQuery } from 'nestjs-paginate';
import { Repository } from 'typeorm';
import { BaseService } from '../../../common/base.service';
import { LoggerService } from '../../../shared/services/logger.service';
import { GoogleDriveFolderDto } from '../dtos/google-drive-folder.dto';
import { GoogleDriveFolderPaginationRequestDto } from '../dtos/requests';
import { GoogleDriveFolderEntity } from '../entities/google-drive-folder.entity';
import { GoogleAuthService } from './google-auth.service';

@Injectable()
export class GoogleFolderService extends BaseService<GoogleDriveFolderEntity> {
    constructor(
        private readonly loggerService: LoggerService,
        private readonly googleAuthService: GoogleAuthService,

        @InjectMapper() private readonly mapper: Mapper,

        @InjectRepository(GoogleDriveFolderEntity)
        private readonly googleDriveFolderRepository: Repository<GoogleDriveFolderEntity>,
    ) {
        super(googleDriveFolderRepository);
    }

    async getFoldersPagination(
        query: GoogleDriveFolderPaginationRequestDto,
        globalConfig: PaginateConfig<GoogleDriveFolderEntity>,
    ): Promise<Paginated<GoogleDriveFolderDto>> {
        try {
            const paginatedResult: Paginated<GoogleDriveFolderEntity> = await this.getPaginationWithCustomQuery(
                query as unknown as PaginateQuery,
                this.googleDriveFolderRepository,
                {
                    ...globalConfig,
                    relations: globalConfig.relations,
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

    async getAllFolders(userId: string): Promise<GoogleDriveFolderDto[]> {
        try {
            const googleAuth = await this.googleAuthService.findOneByFilter({ userId });
            if (!googleAuth) {
                this.loggerService.error(`No Google auth found for user ${userId}`);
                return [];
            }

            const folders = await this.googleDriveFolderRepository.findBy({ googleAuthId: googleAuth.id });
            if (!folders?.length) {
                this.loggerService.error(`No Google drive folders found for user ${userId}`);
                return [];
            }

            return this.mapper.mapArray(folders, GoogleDriveFolderEntity, GoogleDriveFolderDto);
        } catch (error) {
            this.loggerService.error(`Get all folders error: ${error?.message}`);
            return [];
        }
    }
}
