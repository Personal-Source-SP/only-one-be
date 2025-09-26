import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateConfig, Paginated, PaginateQuery } from 'nestjs-paginate';
import { Repository } from 'typeorm';
import { BaseService } from '../../../common/base.service';
import { LoggerService } from '../../../shared/services/logger.service';
import { GoogleDriveFileDto } from '../dtos/google-drive-file.dto';
import { GoogleDriveFilePaginationRequestDto } from '../dtos/requests';
import { GoogleDriveFileEntity } from '../entities/google-drive-file.entity';

@Injectable()
export class GoogleDriveService extends BaseService<GoogleDriveFileEntity> {
    constructor(
        private readonly loggerService: LoggerService,

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
}
