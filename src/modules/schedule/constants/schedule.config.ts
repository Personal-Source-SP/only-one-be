import { FilterOperator } from 'nestjs-paginate';

import { createPaginationConfig } from '../../../common/pagination/pagination-config.factory';
import { getColumnNames, getRelationColumns } from '../../../shared/helpers/typeorm.helper';
import { ScheduleEntity } from '../entities/schedule.entity';
import { ScheduleJobEntity } from '../entities/schedule-job.entity';

const scheduleColumns = getColumnNames(ScheduleEntity);
const scheduleJobColumns = getRelationColumns(ScheduleJobEntity, 'schedule', ['scheduleId']);

export const SCHEDULE_PAGINATION_CONFIG = createPaginationConfig<ScheduleEntity>({
    sortableColumns: ['type', 'cronExpression', 'enabled'],
    searchableColumns: ['type', 'cronExpression', 'enabled'],
    filterableColumns: {
        type: [FilterOperator.ILIKE, FilterOperator.EQ],
        enabled: [FilterOperator.EQ],
    },
    relations: ['scheduleJobs'],
    defaultSortBy: [['createdAt', 'DESC']],
    select: [...scheduleColumns, ...scheduleJobColumns],
    maxLimit: Number.MAX_SAFE_INTEGER,
    defaultLimit: Number.MAX_SAFE_INTEGER,
});
