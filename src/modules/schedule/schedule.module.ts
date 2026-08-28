import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import Redis from 'ioredis';

import { AppConfigService } from '../../shared/services/app-config.service';
import { DataProviderModule } from '../data-provider/data-provider.module';
import { SCHEDULE_EXECUTION_SERVICE_MAP } from './constants/schedule-execution-service-map';
import { ScheduleController } from './controllers/schedule.controller';
import { ScheduleJobController } from './controllers/schedule-job.controller';
import { ScheduleJobEventController } from './controllers/schedule-job-event.controller';
import { ScheduleEntity } from './entities/schedule.entity';
import { ScheduleJobEntity } from './entities/schedule-job.entity';
import { ScheduleJobEventEntity } from './entities/schedule-job-event.entity';
import { ExecutionServiceEnum } from './enums';
import { IScheduleExecutionInterface } from './interfaces';
import { ScheduleProfile } from './schedule.profile';
import { RedisLockService } from './services/redis-lock.service';
import { ScheduleService } from './services/schedule.service';
import { DataProviderScheduleService } from './services/schedule-execution/data-provider-schedule.service';
import { ScheduleJobService } from './services/schedule-job.service';
import { ScheduleJobEventService } from './services/schedule-job-event.service';

const executionServices = [DataProviderScheduleService];
const entities = [ScheduleEntity, ScheduleJobEntity, ScheduleJobEventEntity];
const controllers = [ScheduleController, ScheduleJobEventController, ScheduleJobController];
const services = [ScheduleService, ScheduleJobService, ScheduleJobEventService, RedisLockService];

@Module({
    imports: [TypeOrmModule.forFeature(entities), DataProviderModule],
    controllers: [...controllers],
    providers: [
        ...services,
        ...executionServices,
        ScheduleProfile,
        {
            provide: Redis,
            useFactory: (appConfigService: AppConfigService) => {
                return new Redis({
                    host: appConfigService?.redisConfig?.host,
                    port: appConfigService?.redisConfig?.port,
                    password: appConfigService?.redisConfig?.password,
                });
            },
            inject: [AppConfigService],
        },
        {
            provide: SCHEDULE_EXECUTION_SERVICE_MAP,
            useFactory: (dataProviderScheduleService: DataProviderScheduleService): Record<string, IScheduleExecutionInterface> => ({
                [ExecutionServiceEnum.DATA_PROVIDER]: dataProviderScheduleService,
            }),
            inject: [DataProviderScheduleService],
        },
    ],
    exports: [...services, ...executionServices, ScheduleProfile],
})
export class ScheduleExecutorModule {}
