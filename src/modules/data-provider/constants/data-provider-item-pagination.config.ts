import { FilterOperator } from 'nestjs-paginate';

import { createPaginationConfig } from '../../../common/pagination/pagination-config.factory';
import { getColumnNames, getRelationColumns } from '../../../shared/helpers/typeorm.helper';
import { DataProviderItemEntity } from '../entities/data-provider-item.entity';

const dataProviderItemColumns = getColumnNames(DataProviderItemEntity);
const itemColumns = getRelationColumns(DataProviderItemEntity, 'item', ['itemId']);
const dataProviderColumns = getRelationColumns(DataProviderItemEntity, 'dataProvider', ['dataProviderId']);
const cloudDataProviderColumns = getRelationColumns(DataProviderItemEntity, 'cloudDataProvider', ['cloudDataProviderId']);

export const DATA_PROVIDER_ITEM_PAGINATION_CONFIG = createPaginationConfig<DataProviderItemEntity>({
    searchableColumns: ['itemUrl'],
    defaultSortBy: [['createdAt', 'DESC']],
    sortableColumns: ['itemUrl', 'createdAt'],
    filterableColumns: {
        itemUrl: [FilterOperator.ILIKE, FilterOperator.EQ],
        isActive: [FilterOperator.EQ],
        itemId: [FilterOperator.IN],
        dataProviderId: [FilterOperator.IN],
        cloudDataProviderId: [FilterOperator.IN],
    },
    relations: ['item', 'dataProvider', 'cloudDataProvider'],
    select: [...dataProviderItemColumns, ...dataProviderColumns, ...itemColumns, ...cloudDataProviderColumns],
    maxLimit: Number.MAX_SAFE_INTEGER,
    defaultLimit: Number.MAX_SAFE_INTEGER,
});
