import { FilterOperator } from 'nestjs-paginate';

import { createPaginationConfig } from '../../../common/pagination/pagination-config.factory';
import { getColumnNames, getRelationColumns } from '../../../shared/helpers/typeorm.helper';
import { DraftItemEntity } from '../entities/draft-item.entity';

const draftItemColumns = getColumnNames(DraftItemEntity);
const dataProviderFeatureColumns = getRelationColumns(DraftItemEntity, 'dataProviderFeature');
const suggestedItemColumns = getRelationColumns(DraftItemEntity, 'suggestedItem');
const mappedItemColumns = getRelationColumns(DraftItemEntity, 'mappedItem');

export const DRAFT_ITEM_PAGINATION_CONFIG = createPaginationConfig<DraftItemEntity>({
    sortableColumns: ['createdAt', 'updatedAt', 'title', 'status', 'confidence'],
    searchableColumns: ['title', 'url', 'code', 'searchQuery', 'status'],
    filterableColumns: {
        dataProviderFeatureId: [FilterOperator.EQ, FilterOperator.IN],
        status: [FilterOperator.EQ, FilterOperator.IN],
        code: [FilterOperator.EQ, FilterOperator.ILIKE],
        suggestedItemId: [FilterOperator.EQ],
        mappedItemId: [FilterOperator.EQ],
    },
    defaultSortBy: [['createdAt', 'DESC']],
    relations: ['dataProviderFeature', 'suggestedItem', 'mappedItem'],
    select: [...draftItemColumns, ...dataProviderFeatureColumns, ...suggestedItemColumns, ...mappedItemColumns],
    maxLimit: 100,
    defaultLimit: 20,
});
