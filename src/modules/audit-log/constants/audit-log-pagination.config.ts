import { FilterOperator, PaginateConfig } from 'nestjs-paginate';

import { AuditLogEntity } from '../entities/audit-log.entity';

export const AUDIT_LOG_PAGINATION_CONFIG: PaginateConfig<AuditLogEntity> = {
    sortableColumns: ['createdAt', 'action', 'resource', 'status'],
    defaultSortBy: [['createdAt', 'DESC']],
    searchableColumns: ['action', 'resource', 'userEmail', 'description', 'ipAddress'],
    filterableColumns: {
        userId: [FilterOperator.EQ],
        userEmail: [FilterOperator.ILIKE, FilterOperator.EQ],
        action: [FilterOperator.EQ, FilterOperator.IN],
        resource: [FilterOperator.EQ, FilterOperator.IN],
        status: [FilterOperator.EQ],
        createdAt: [FilterOperator.BTW, FilterOperator.GTE, FilterOperator.LTE],
    },
};
