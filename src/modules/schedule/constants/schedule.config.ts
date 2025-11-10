import { FilterOperator } from 'nestjs-paginate';
import { createPaginationConfig } from '../../../common/pagination/pagination-config.factory';
import { getColumnNames } from '../../../shared/helpers/typeorm.helper';
import { ScheduleJobEventEntity } from '../entities/schedule-job-event.entity';
import { ScheduleJobEntity } from '../entities/schedule-job.entity';
import { ScheduleEntity } from '../entities/schedule.entity';

const scheduleColumns = getColumnNames(ScheduleEntity);
const scheduleJobColumns = getColumnNames(ScheduleJobEntity);
const scheduleJobEventColumns = getColumnNames(ScheduleJobEventEntity);

export const SCHEDULE_PAGINATION_CONFIG = createPaginationConfig<ScheduleEntity>({
    sortableColumns: ['type', 'cronExpression', 'enabled', 'workerService'],
    searchableColumns: ['type', 'cronExpression', 'enabled', 'workerService'],
    filterableColumns: {
        type: [FilterOperator.ILIKE, FilterOperator.EQ],
        cronExpression: [FilterOperator.ILIKE, FilterOperator.EQ],
        enabled: [FilterOperator.EQ],
        workerService: [FilterOperator.ILIKE, FilterOperator.EQ],
    },
    defaultSortBy: [['createdAt', 'DESC']],
    relations: ['scheduleJobs', 'scheduleJobs.scheduleJobEvents'],
    select: [...scheduleColumns, ...scheduleJobColumns, ...scheduleJobEventColumns],
    maxLimit: Number.MAX_SAFE_INTEGER,
    defaultLimit: Number.MAX_SAFE_INTEGER,
});
