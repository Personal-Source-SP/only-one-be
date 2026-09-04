import { AutoMap } from '@automapper/classes';

import { EnumField, ObjectFieldOptional, UUIDField } from '../../../../decorators';
import { ProcessScrapeDataRequestDto } from '../../../data-provider/dtos/requests';
import { ExecutionServiceEnum, ScheduleJobTriggerType } from '../../enums';

export class CreateScheduleJobRequestDto {
    @UUIDField({ description: 'Schedule ID' })
    @AutoMap()
    scheduleId: string;

    @EnumField(() => ScheduleJobTriggerType, {
        description: 'Trigger type of the schedule job',
        example: ScheduleJobTriggerType.CRON,
    })
    @AutoMap()
    triggerType: ScheduleJobTriggerType;

    @EnumField(() => ExecutionServiceEnum, {
        description: 'Execution service of the schedule job',
        example: ExecutionServiceEnum.DATA_PROVIDER,
    })
    @AutoMap()
    executionService: ExecutionServiceEnum;

    @ObjectFieldOptional({ description: 'Job payload to pass to the schedule job' })
    @AutoMap(() => ProcessScrapeDataRequestDto)
    jobPayload?: ProcessScrapeDataRequestDto;
}
