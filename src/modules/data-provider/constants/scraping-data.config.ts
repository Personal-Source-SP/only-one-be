import { FilterOperator } from 'nestjs-paginate';

import { createPaginationConfig } from '../../../common/pagination/pagination-config.factory';
import { getColumnNames } from '../../../shared/helpers/typeorm.helper';
import { ScrapingDataEntity } from '../entities/scraping-data.entity';

const scrapingDataColumns = getColumnNames(ScrapingDataEntity);

export const SCRAPING_DATA_PAGINATION_CONFIG = createPaginationConfig<ScrapingDataEntity>({
    sortableColumns: ['scrapeTimestamp', 'lastModified', 'type', 'url'],
    searchableColumns: ['type', 'url', 'dataProviderItemId', 'dataProviderId'],
    filterableColumns: {
        type: [FilterOperator.ILIKE, FilterOperator.EQ],
        url: [FilterOperator.ILIKE, FilterOperator.EQ],
        dataProviderItemId: [FilterOperator.EQ],
        dataProviderId: [FilterOperator.EQ],
        itemId: [FilterOperator.EQ],
    },
    defaultSortBy: [['scrapeTimestamp', 'DESC']],
    relations: ['dataProviderItem', 'dataProvider', 'dataProvider.features'],
    select: [...scrapingDataColumns, 'dataProviderItem.itemUrl', 'dataProvider.name', 'dataProvider.baseUrl'],
    maxLimit: Number.MAX_SAFE_INTEGER,
    defaultLimit: Number.MAX_SAFE_INTEGER,
});
