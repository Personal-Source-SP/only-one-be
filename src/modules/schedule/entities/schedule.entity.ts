import { AutoMap } from '@automapper/classes';
import { Column, Entity, OneToMany, Relation } from 'typeorm';
import { AbstractEntity } from '../../../common/entities';
import { ScheduleType } from '../enums';
import { ScheduleJobEntity } from './schedule-job.entity';

@Entity({ name: 'schedules', synchronize: false })
export class ScheduleEntity extends AbstractEntity {
    @Column({ type: 'varchar', length: 20, default: ScheduleType.GLOBAL })
    @AutoMap()
    type: ScheduleType;

    @Column({ type: 'varchar', length: 20 })
    @AutoMap()
    cronExpression: string;

    @Column({ default: true })
    @AutoMap()
    enabled: boolean;

    @Column({ type: 'varchar', length: 50 })
    @AutoMap()
    workerService: string;

    @Column({ default: 60 })
    @AutoMap()
    minScrapeIntervalMinutes: number;

    @Column({ type: 'timestamptz', nullable: true })
    @AutoMap()
    nextRunAt?: Date;

    @Column({ type: 'timestamptz', nullable: true })
    @AutoMap()
    lastRunAt?: Date;

    @Column({ type: 'jsonb', nullable: true })
    @AutoMap(() => Object)
    payload?: Record<string, any>;

    @OneToMany(() => ScheduleJobEntity, (job) => job.schedule)
    @AutoMap(() => [ScheduleJobEntity])
    scheduleJobs: Relation<ScheduleJobEntity>[];
}
