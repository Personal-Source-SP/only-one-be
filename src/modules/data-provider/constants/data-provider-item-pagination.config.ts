import { FilterOperator } from 'nestjs-paginate';

import { createPaginationConfig } from '../../../common/pagination/pagination-config.factory';
import { getColumnNames } from '../../../shared/helpers/typeorm.helper';
import { DataProviderItemEntity } from '../entities/data-provider-item.entity';

const dataProviderItemColumns = getColumnNames(DataProviderItemEntity);

export const DATA_PROVIDER_ITEM_PAGINATION_CONFIG = createPaginationConfig<DataProviderItemEntity>({
    sortableColumns: ['itemUrl', 'createdAt'],
    searchableColumns: ['itemUrl'],
    defaultSortBy: [['itemUrl', 'ASC']],
    filterableColumns: {
        itemUrl: [FilterOperator.ILIKE, FilterOperator.EQ],
    },
    select: [...dataProviderItemColumns],
    maxLimit: Number.MAX_SAFE_INTEGER,
    defaultLimit: Number.MAX_SAFE_INTEGER,
});
