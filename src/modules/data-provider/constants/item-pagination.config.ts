import { FilterOperator } from 'nestjs-paginate';

import { createPaginationConfig } from '../../../common/pagination/pagination-config.factory';
import { getColumnNames } from '../../../shared/helpers/typeorm.helper';
import { ItemEntity } from '../entities/item.entity';

const itemColumns = getColumnNames(ItemEntity);

export const ITEM_PAGINATION_CONFIG = createPaginationConfig<ItemEntity>({
    sortableColumns: ['name', 'createdAt'],
    searchableColumns: ['name'],
    defaultSortBy: [['name', 'ASC']],
    filterableColumns: {
        name: [FilterOperator.ILIKE, FilterOperator.EQ],
    },
    select: [...itemColumns],
    maxLimit: Number.MAX_SAFE_INTEGER,
    defaultLimit: Number.MAX_SAFE_INTEGER,
});
