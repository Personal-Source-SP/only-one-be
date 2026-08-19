import { FilterOperator } from 'nestjs-paginate';

import { createPaginationConfig } from '../../../common/pagination/pagination-config.factory';
import { getColumnNames } from '../../../shared/helpers/typeorm.helper';
import { DataProviderEntity } from '../entities/data-provider.entity';

const dataProviderColumns = getColumnNames(DataProviderEntity);

export const DATA_PROVIDER_PAGINATION_CONFIG = createPaginationConfig<DataProviderEntity>({
    sortableColumns: ['name', 'baseUrl', 'identifier', 'createdAt'],
    searchableColumns: ['name', 'baseUrl', 'identifier'],
    defaultSortBy: [['name', 'ASC']],
    filterableColumns: {
        name: [FilterOperator.ILIKE, FilterOperator.EQ],
        baseUrl: [FilterOperator.ILIKE, FilterOperator.EQ],
        identifier: [FilterOperator.EQ],
    },
    select: [...dataProviderColumns],
    maxLimit: Number.MAX_SAFE_INTEGER,
    defaultLimit: Number.MAX_SAFE_INTEGER,
});
