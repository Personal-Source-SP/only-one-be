import { FilterOperator } from 'nestjs-paginate';

import { createPaginationConfig } from '../../../common/pagination/pagination-config.factory';
import { getRelationColumns } from '../../../shared/helpers/typeorm.helper';
import { SimulationItemDto } from '../dtos/simulation-item.dto';
import { SimulationContextEntity } from '../entities/simulation-context.entity';

const simulationItemColumns = getRelationColumns(SimulationContextEntity, 'simulationItems', ['simulationContextId']);

export const SIMULATION_ITEM_PAGINATION_CONFIG = createPaginationConfig<SimulationItemDto>({
    sortableColumns: ['status'],
    searchableColumns: ['status'],
    filterableColumns: {
        status: [FilterOperator.EQ],
    },
    relations: [],
    defaultSortBy: [['createdAt', 'DESC']],
    select: [...simulationItemColumns],
    maxLimit: Number.MAX_SAFE_INTEGER,
    defaultLimit: Number.MAX_SAFE_INTEGER,
});
