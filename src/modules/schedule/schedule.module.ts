import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataProviderModule } from '../data-provider/data-provider.module';
import { ScheduleJobEventEntity } from './entities/schedule-job-event.entity';
import { ScheduleJobEntity } from './entities/schedule-job.entity';
import { ScheduleEntity } from './entities/schedule.entity';
import { ScheduleProfile } from './schedule.profile';
import { ScheduleJobEventService } from './services/schedule-job-event.service';
import { ScheduleJobService } from './services/schedule-job.service';
import { ScheduleService } from './services/schedule.service';

const controllers = [];
const services = [ScheduleService, ScheduleJobService, ScheduleJobEventService];
const entities = [ScheduleEntity, ScheduleJobEntity, ScheduleJobEventEntity];

@Module({
    imports: [TypeOrmModule.forFeature(entities), DataProviderModule],
    controllers: [...controllers],
    providers: [...services, ...controllers, ScheduleProfile],
    exports: [...services, ...controllers, ScheduleProfile],
})
export class ScheduleExecutorModule {}
