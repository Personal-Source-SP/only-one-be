import { FilterOperator } from 'nestjs-paginate';

import { createPaginationConfig } from '../../../common/pagination/pagination-config.factory';
import { getColumnNames } from '../../../shared/helpers/typeorm.helper';
import { DataProviderEntity } from '../entities/data-provider.entity';

const dataProviderColumns = getColumnNames(DataProviderEntity);

export const DATA_PROVIDER_PAGINATION_CONFIG = createPaginationConfig<DataProviderEntity>({
    sortableColumns: ['name', 'createdAt'],
    searchableColumns: ['name'],
    defaultSortBy: [['name', 'ASC']],
    filterableColumns: {
        name: [FilterOperator.ILIKE, FilterOperator.EQ],
    },
    select: [...dataProviderColumns],
    maxLimit: Number.MAX_SAFE_INTEGER,
    defaultLimit: Number.MAX_SAFE_INTEGER,
});
