import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DATA_PROVIDER_SEARCH_SERVICE_MAP } from '../constants/data-provider-search-service-map';
import {
    SearchProductsResponseDto,
    ValidateSearchConfigurationResponseDto,
} from '../dtos/responses/search-products-response.dto';
import { DataProviderEntity } from '../entities/data-provider.entity';
import { DataProviderSearchStatus } from '../enums';
import { IDataProviderSearchService, IValidateSearchConfigurationDto } from '../interfaces/data-provider-search-service.interface';
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
        @InjectRepository(DataProviderEntity)
        private readonly dataProviderRepository: Repository<DataProviderEntity>,
        @Inject(DATA_PROVIDER_SEARCH_SERVICE_MAP)
        private readonly dataProviderSearchServiceMap: Record<string, IDataProviderSearchService>,
    ) {}

    async searchProducts(params: ISearchProductsParams): Promise<SearchProductsResponseDto> {
        const { dataProviderId, searchQuery, barcode, options } = params;
        const dataProvider = await this.dataProviderRepository.findOne({
            where: { id: dataProviderId },
            relations: ['parent'],
        });

        if (!dataProvider) {
            const errRes = new SearchProductsResponseDto({
                searchQuery,
                dataProviderId,
                status: 'error',
                error: `Data provider id ${dataProviderId} not found`,
            });
            return errRes;
        }

        if (dataProvider.searchStatus !== DataProviderSearchStatus.READY) {
            const errRes = new SearchProductsResponseDto({
                searchQuery,
                dataProviderId,
                status: 'error',
                error: `Search is not enabled for data provider ${dataProviderId}`,
            });
            return errRes;
        }

        const searchService = this.dataProviderSearchServiceMap[dataProvider.searchService];
        if (!searchService) {
            const errRes = new SearchProductsResponseDto({
                searchQuery,
                dataProviderId,
                status: 'error',
                error: `Search service '${dataProvider.searchService}' not found`,
            });
            return errRes;
        }

        const searchConfig = dataProvider?.parent?.searchConfig ?? dataProvider?.searchConfig;
        const finalSearchQuery = searchConfig?.enableBarcodeSearch && barcode ? barcode : searchQuery;

        const result = await searchService.searchProducts({
            options,
            searchQuery: finalSearchQuery,
            dataProvider,
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
