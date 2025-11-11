import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { AppConfigService } from '../../shared/services/app-config.service';
import { DataProviderModule } from '../data-provider/data-provider.module';
import { ScheduleJobEventController } from './controllers/schedule-job-event.controller';
import { ScheduleController } from './controllers/schedule.controller';
import { ScheduleJobEventEntity } from './entities/schedule-job-event.entity';
import { ScheduleJobEntity } from './entities/schedule-job.entity';
import { ScheduleEntity } from './entities/schedule.entity';
import { ScheduleProfile } from './schedule.profile';
import { RedisLockService } from './services/redis-lock.service';
import { ScheduleJobEventService } from './services/schedule-job-event.service';
import { ScheduleJobService } from './services/schedule-job.service';
import { ScheduleService } from './services/schedule.service';

const controllers = [ScheduleController, ScheduleJobEventController];
const entities = [ScheduleEntity, ScheduleJobEntity, ScheduleJobEventEntity];
const services = [ScheduleService, ScheduleJobService, ScheduleJobEventService, RedisLockService];

@Module({
    imports: [TypeOrmModule.forFeature(entities), DataProviderModule],
    controllers: [...controllers],
    providers: [
        ...services,
        ...controllers,
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
    ],
    exports: [...services, ...controllers, ScheduleProfile],
})
export class ScheduleExecutorModule {}
