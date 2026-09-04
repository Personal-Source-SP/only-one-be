import { AutoMap } from '@automapper/classes';

import {
    BooleanField,
    BooleanFieldOptional,
    EnumField,
    EnumFieldOptional,
    NumberFieldOptional,
    ObjectFieldOptional,
    StringField,
    StringFieldOptional,
} from '../../../../decorators';
import { ExecutionServiceEnum, ScheduleType } from '../../enums';

export class PayloadScheduleDto {
    @StringFieldOptional({ each: true, description: 'Data provider IDs to pass to the schedule' })
    @AutoMap()
    dataProviderIds?: string[];

    @StringFieldOptional({ each: true, description: 'Item IDs to pass to the schedule' })
    @AutoMap()
    itemIds?: string[];

    @StringFieldOptional({ each: true, description: 'Search queries to pass to the schedule' })
    @AutoMap()
    searchQueries?: string[];

    @StringFieldOptional({ each: true, description: 'Barcodes to pass to the schedule' })
    @AutoMap()
    barcodes?: string[];
}

export class CreateScheduleRequestDto {
    @EnumField(() => ScheduleType, { description: 'Type of the schedule', example: ScheduleType.GLOBAL })
    @AutoMap()
    type: ScheduleType;

    @EnumField(() => ExecutionServiceEnum, {
        description: 'Execution service of the schedule',
        example: ExecutionServiceEnum.DATA_PROVIDER,
    })
    @AutoMap()
    executionService: ExecutionServiceEnum;

    @BooleanField()
    @AutoMap()
    enabled: boolean;

    @StringField({ maxLength: 255, description: 'Cron expression for the scraping schedule', example: '0 0 * * *' })
    @AutoMap()
    cronExpression: string;

    @NumberFieldOptional({ int: true, default: 60 })
    @AutoMap()
    minScrapeIntervalMinutes?: number = 60;

    @ObjectFieldOptional({ description: 'Payload to pass to the schedule' })
    @AutoMap(() => PayloadScheduleDto)
    payload?: PayloadScheduleDto;
}

export class UpdateScheduleRequestDto {
    @EnumFieldOptional(() => ScheduleType, { description: 'Type of the schedule', example: ScheduleType.GLOBAL })
    @AutoMap()
    type?: ScheduleType;

    @EnumFieldOptional(() => ExecutionServiceEnum, {
        description: 'Execution service of the schedule',
        example: ExecutionServiceEnum.DATA_PROVIDER,
    })
    @AutoMap()
    executionService?: ExecutionServiceEnum;

    @BooleanFieldOptional()
    @AutoMap()
    enabled?: boolean;

    @StringFieldOptional({ maxLength: 255, description: 'Cron expression for the scraping schedule', example: '0 0 * * *' })
    @AutoMap()
    cronExpression?: string;

    @NumberFieldOptional({ int: true })
    @AutoMap()
    minScrapeIntervalMinutes?: number;

    @ObjectFieldOptional({ description: 'Payload to pass to the schedule' })
    @AutoMap(() => PayloadScheduleDto)
    payload?: PayloadScheduleDto;
}
