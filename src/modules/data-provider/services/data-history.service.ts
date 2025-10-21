import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateConfig, Paginated, PaginateQuery } from 'nestjs-paginate';
import { Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { LoggerService } from '../../../shared/services/logger.service';
import { DataHistoryDto } from '../dtos/data-history.dto';
import { CreateDataHistoryRequestDto, DataHistoryPaginationRequestDto } from '../dtos/requests';
import { DataHistoryEntity } from '../entities/data-history.entity';

@Injectable()
export class DataHistoryService extends BaseService<DataHistoryEntity> {
    constructor(
        private readonly loggerService: LoggerService,

        @InjectMapper() private readonly mapper: Mapper,

        @InjectRepository(DataHistoryEntity)
        private readonly dataHistoryRepository: Repository<DataHistoryEntity>,
    ) {
        super(dataHistoryRepository);
    }

    async getById(id: string): Promise<DataHistoryDto> {
        const dataHistory = await this.findById(id);
        if (!dataHistory) {
            this.loggerService.error(`No data history found with id ${id}`);
            return null;
        }

        return this.mapper.map(dataHistory, DataHistoryEntity, DataHistoryDto);
    }

    async getDataHistoryPagination(
        query: DataHistoryPaginationRequestDto,
        globalConfig: PaginateConfig<DataHistoryEntity>,
    ): Promise<Paginated<DataHistoryDto>> {
        try {
            const queryBuilder = this.dataHistoryRepository.createQueryBuilder('dataHistory');

            // Handle dataProviderItemId filter
            if (query.filter?.dataProviderItemId) {
                queryBuilder.andWhere('dataHistory.dataProviderItemId = :dataProviderItemId', {
                    dataProviderItemId: query.filter.dataProviderItemId,
                });
            }

            // Handle status filter
            if (query.filter?.status) {
                queryBuilder.andWhere('dataHistory.status = :status', {
                    status: query.filter.status,
                });
            }

            // Handle price range filter
            if (query.filter?.minPrice !== undefined) {
                queryBuilder.andWhere('dataHistory.price >= :minPrice', {
                    minPrice: query.filter.minPrice,
                });
            }

            if (query.filter?.maxPrice !== undefined) {
                queryBuilder.andWhere('dataHistory.price <= :maxPrice', {
                    maxPrice: query.filter.maxPrice,
                });
            }

            // Handle currency filter
            if (query.filter?.currency) {
                queryBuilder.andWhere('dataHistory.currency = :currency', {
                    currency: query.filter.currency,
                });
            }

            const paginatedResult: Paginated<DataHistoryEntity> = await this.getPaginationWithCustomQuery(
                query as unknown as PaginateQuery,
                queryBuilder,
                {
                    ...globalConfig,
                    relations: globalConfig.relations,
                },
            );

            const data = this.mapper.mapArray(paginatedResult.data, DataHistoryEntity, DataHistoryDto);
            return { ...paginatedResult, data } as Paginated<DataHistoryDto>;
        } catch (error) {
            this.loggerService.error(`Get data history pagination error: ${error?.message}`);
            return {
                data: [],
                meta: null,
                links: null,
            };
        }
    }

    async createDataHistory(request: CreateDataHistoryRequestDto): Promise<DataHistoryDto> {
        try {
            const dataHistoryEntity = this.mapper.map(request, CreateDataHistoryRequestDto, DataHistoryEntity);
            dataHistoryEntity.scrapeTimestamp = new Date();

            const dataHistory = await this.dataHistoryRepository.save(dataHistoryEntity);
            return this.mapper.map(dataHistory, DataHistoryEntity, DataHistoryDto);
        } catch (error) {
            this.loggerService.error(`Create data history error: ${error?.message}`);
            throw error;
        }
    }

    async deleteDataHistory(id: string): Promise<boolean> {
        const existingDataHistory = await this.exists({ id });
        if (!existingDataHistory) {
            this.loggerService.error(`No data history found with id ${id}`);
            throw new NotFoundException('No data history found with id');
        }

        return this.delete(id);
    }
}
