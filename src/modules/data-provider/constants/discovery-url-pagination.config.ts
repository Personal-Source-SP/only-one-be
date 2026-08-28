import { FilterOperator } from 'nestjs-paginate';

import { createPaginationConfig } from '../../../common/pagination/pagination-config.factory';
import { getColumnNames } from '../../../shared/helpers/typeorm.helper';
import { DiscoveryUrlEntity } from '../entities/discovery-url.entity';

const discoveryUrlColumns = getColumnNames(DiscoveryUrlEntity);

export const DISCOVERY_URL_PAGINATION_CONFIG = createPaginationConfig<DiscoveryUrlEntity>({
    sortableColumns: [
        'url',
        'domain',
        'title',
        'status',
        'confidenceScore',
        'validationStatus',
        'matchResult',
        'foundAtDepth',
        'createdAt',
    ],
    searchableColumns: ['url', 'domain', 'title'],
    defaultSortBy: [['createdAt', 'DESC']],
    filterableColumns: {
        sessionId: [FilterOperator.EQ],
        dataProviderId: [FilterOperator.EQ],
        status: [FilterOperator.EQ],
        validationStatus: [FilterOperator.EQ],
        matchResult: [FilterOperator.EQ],
        finalValidationStatus: [FilterOperator.EQ],
        foundAtDepth: [FilterOperator.EQ],
    },
    relations: ['dataProvider', 'discoverySession'],
    select: [...discoveryUrlColumns],
    maxLimit: Number.MAX_SAFE_INTEGER,
    defaultLimit: 50,
});
