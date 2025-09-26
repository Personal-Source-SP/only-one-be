import { FilterOperator } from 'nestjs-paginate';

export const BASE_SORTABLE_COLUMNS = ['id', 'createdAt', 'updatedAt'];

export const BASE_FILTERABLE_COLUMNS = {
    createdAt: [FilterOperator.GT, FilterOperator.LT, FilterOperator.EQ],
    updatedAt: [FilterOperator.GT, FilterOperator.LT, FilterOperator.EQ],
};

export const BASE_PAGINATION_CONFIG = {
    sortableColumns: BASE_SORTABLE_COLUMNS,
    defaultSortBy: [['createdAt', 'DESC']] as [string, 'ASC' | 'DESC'][],
    filterableColumns: BASE_FILTERABLE_COLUMNS,
    defaultLimit: 10,
    maxLimit: 50,
};
