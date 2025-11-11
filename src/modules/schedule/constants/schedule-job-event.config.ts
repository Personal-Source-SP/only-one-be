import { FilterOperator } from 'nestjs-paginate';
import { createPaginationConfig } from '../../../common/pagination/pagination-config.factory';
import { getColumnNames } from '../../../shared/helpers/typeorm.helper';
import { ScheduleJobEventDto } from '../dtos/schedule-job-event.dto';
import { ScheduleJobEventEntity } from '../entities/schedule-job-event.entity';

const scheduleJobEventColumns = getColumnNames(ScheduleJobEventEntity);

export const SCHEDULE_JOB_EVENT_PAGINATION_CONFIG = createPaginationConfig<ScheduleJobEventDto>({
    sortableColumns: ['eventType', 'eventMessage', 'retryCount'],
    searchableColumns: ['eventType', 'eventMessage', 'retryCount'],
    filterableColumns: {
        eventType: [FilterOperator.ILIKE, FilterOperator.EQ],
        eventMessage: [FilterOperator.ILIKE, FilterOperator.EQ],
        retryCount: [FilterOperator.EQ],
    },
    relations: [],
    defaultSortBy: [['createdAt', 'DESC']],
    select: [...scheduleJobEventColumns],
    maxLimit: Number.MAX_SAFE_INTEGER,
    defaultLimit: Number.MAX_SAFE_INTEGER,
});
