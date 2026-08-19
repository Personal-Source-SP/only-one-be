import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DATA_PROVIDER_SEARCH_SERVICE_MAP } from '../constants/data-provider-search-service-map';
import { SearchProductsResponseDto, ValidateSearchConfigurationResponseDto } from '../dtos/responses/search-products-response.dto';
import { DataProviderFeatureEntity } from '../entities/data-provider-feature.entity';
import { DataProviderFeatureStatus, DataProviderFeatureType } from '../enums';
import { IDataProviderSearchService, ISearchConfig, IValidateSearchConfigurationDto } from '../interfaces';
import { SearchOptions } from '../interfaces/search-config.interface';

export interface ISearchProductsParams {
    dataProviderId: string;
    searchQuery: string;
    barcode?: string;
    options?: SearchOptions;
}

@Injectable()
export class DataProviderSearchService {
    constructor(
        @InjectRepository(DataProviderFeatureEntity)
        private readonly dataProviderFeatureRepository: Repository<DataProviderFeatureEntity>,
        @Inject(DATA_PROVIDER_SEARCH_SERVICE_MAP)
        private readonly dataProviderSearchServiceMap: Record<string, IDataProviderSearchService>,
    ) {}

    async searchProducts(params: ISearchProductsParams): Promise<SearchProductsResponseDto> {
        const { dataProviderId, searchQuery, barcode, options } = params;
        const feature = await this.dataProviderFeatureRepository.findOne({
            where: { dataProviderId, type: DataProviderFeatureType.SEARCH },
            relations: { dataProvider: true },
        });

        if (!feature || !feature.dataProvider) {
            const errRes = new SearchProductsResponseDto({
                searchQuery,
                dataProviderId,
                status: 'error',
                error: `Data provider id ${dataProviderId} not found`,
            });
            return errRes;
        }

        if (feature.status !== DataProviderFeatureStatus.READY) {
            const errRes = new SearchProductsResponseDto({
                searchQuery,
                dataProviderId,
                status: 'error',
                error: `Search is not enabled for data provider ${dataProviderId}`,
            });
            return errRes;
        }

        const searchService = this.dataProviderSearchServiceMap[feature.service];
        if (!searchService) {
            const errRes = new SearchProductsResponseDto({
                searchQuery,
                dataProviderId,
                status: 'error',
                error: `Search service '${feature.service}' not found`,
            });
            return errRes;
        }

        const searchConfig = feature.config as ISearchConfig;
        const finalSearchQuery = searchConfig?.enableBarcodeSearch && barcode ? barcode : searchQuery;

        const result = await searchService.searchProducts({
            options,
            searchQuery: finalSearchQuery,
            dataProvider: feature.dataProvider,
            barcode,
        });
        return result;
    }

    async validateSearchFunction(
        searchService: string,
        dto: IValidateSearchConfigurationDto,
    ): Promise<ValidateSearchConfigurationResponseDto> {
        const dataProviderSearchService = this.dataProviderSearchServiceMap[searchService];
        if (!dataProviderSearchService) {
            const errRes = new ValidateSearchConfigurationResponseDto({
                status: 'error',
                error: `Search service '${searchService}' not found`,
            });
            return errRes;
        }

        const result = await dataProviderSearchService.validateSearchConfiguration(dto);
        return result;
    }
}
