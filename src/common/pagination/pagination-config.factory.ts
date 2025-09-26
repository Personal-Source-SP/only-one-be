import { PaginateConfig } from 'nestjs-paginate';

import { BASE_PAGINATION_CONFIG } from './base-pagination.config';

export function createPaginationConfig<T>(extra: Partial<PaginateConfig<T>>): PaginateConfig<T> {
    return {
        ...BASE_PAGINATION_CONFIG,
        ...extra,
        sortableColumns: [...BASE_PAGINATION_CONFIG.sortableColumns, ...(extra.sortableColumns || [])],
        filterableColumns: {
            ...BASE_PAGINATION_CONFIG.filterableColumns,
            ...(extra.filterableColumns || {}),
        },
        searchableColumns: extra.searchableColumns || [],
    } as unknown as PaginateConfig<T>;
}
