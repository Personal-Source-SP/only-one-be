import { FilterOperator } from 'nestjs-paginate';

import { createPaginationConfig } from '../../../common/pagination/pagination-config.factory';
import { getColumnNames } from '../../../shared/helpers/typeorm.helper';
import { DiscoverySessionEntity } from '../entities/discovery-session.entity';

const discoverySessionColumns = getColumnNames(DiscoverySessionEntity);

export const DISCOVERY_SESSION_PAGINATION_CONFIG = createPaginationConfig<DiscoverySessionEntity>({
    sortableColumns: ['sessionCode', 'targetUrl', 'status', 'totalDiscovered', 'totalQueued', 'createdAt'],
    searchableColumns: ['sessionCode', 'targetUrl', 'notes'],
    defaultSortBy: [['createdAt', 'DESC']],
    filterableColumns: {
        dataProviderId: [FilterOperator.EQ],
        status: [FilterOperator.EQ],
    },
    relations: ['dataProvider'],
    select: [...discoverySessionColumns],
    maxLimit: Number.MAX_SAFE_INTEGER,
    defaultLimit: 20,
});
