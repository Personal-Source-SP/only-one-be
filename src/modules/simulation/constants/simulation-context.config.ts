import { FilterOperator } from 'nestjs-paginate';

import { createPaginationConfig } from '../../../common/pagination/pagination-config.factory';
import { getColumnNames, getRelationColumns } from '../../../shared/helpers/typeorm.helper';
import { SimulationContextDto } from '../dtos/simulation-context.dto';
import { SimulationContextEntity } from '../entities/simulation-context.entity';

const simulationContextColumns = getColumnNames(SimulationContextEntity);
const simulationItemColumns = getRelationColumns(SimulationContextEntity, 'simulationItems', ['simulationContextId']);

export const SIMULATION_CONTEXT_PAGINATION_CONFIG = createPaginationConfig<SimulationContextDto>({
    sortableColumns: ['name', 'baseUrl', 'status'],
    searchableColumns: ['name', 'baseUrl', 'status', 'serviceExecution'],
    filterableColumns: {
        name: [FilterOperator.ILIKE, FilterOperator.EQ],
        baseUrl: [FilterOperator.ILIKE, FilterOperator.EQ],
        status: [FilterOperator.EQ],
        serviceExecution: [FilterOperator.EQ],
    },
    relations: ['simulationItems'],
    defaultSortBy: [['createdAt', 'DESC']],
    select: [...simulationContextColumns, ...simulationItemColumns],
    maxLimit: Number.MAX_SAFE_INTEGER,
    defaultLimit: Number.MAX_SAFE_INTEGER,
});
