import { FilterOperator } from 'nestjs-paginate';
import { createPaginationConfig } from '../../../common/pagination/pagination-config.factory';
import { getColumnNames } from '../../../shared/helpers/typeorm.helper';
import { DataHistoryEntity } from '../entities/data-history.entity';

const dataHistoryColumns = getColumnNames(DataHistoryEntity);

export const DATA_HISTORY_PAGINATION_CONFIG = createPaginationConfig<DataHistoryEntity>({
    sortableColumns: ['scrapeTimestamp', 'lastModified', 'type', 'url'],
    searchableColumns: ['type', 'url'],
    filterableColumns: {
        type: [FilterOperator.ILIKE, FilterOperator.EQ],
        url: [FilterOperator.EQ],
    },
    defaultSortBy: [['scrapeTimestamp', 'DESC']],
    relations: ['dataProviderItem'],
    select: [...dataHistoryColumns],
    maxLimit: Number.MAX_SAFE_INTEGER,
    defaultLimit: Number.MAX_SAFE_INTEGER,
});
