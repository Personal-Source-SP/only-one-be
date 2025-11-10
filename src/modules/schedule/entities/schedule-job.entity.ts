import { AutoMap } from '@automapper/classes';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, Relation } from 'typeorm';
import { AbstractEntity } from '../../../common/entities';
import { ScheduleJobTriggerType, ScheduleJobType, ScheduleType } from '../enums';
import { ScheduleJobEventEntity } from './schedule-job-event.entity';
import { ScheduleEntity } from './schedule.entity';

@Entity({ name: 'schedule_jobs', synchronize: false })
export class ScheduleJobEntity extends AbstractEntity {
    @Column({ type: 'uuid' })
    @AutoMap()
    scheduleId: string;

    @Column({ type: 'varchar', length: 20, default: ScheduleType.GLOBAL })
    @AutoMap()
    scheduleType: ScheduleType;

    @Column({ type: 'varchar', length: 20, default: ScheduleJobTriggerType.CRON })
    @AutoMap()
    triggerType: ScheduleJobTriggerType;

    @Column({ type: 'varchar', length: 50 })
    @AutoMap()
    workerService: string;

    @Column({ type: 'varchar', length: 20, default: ScheduleJobType.PENDING })
    @AutoMap()
    status: ScheduleJobType;

    @Column({ default: 0 })
    @AutoMap()
    retryCount: number;

    @Column({ type: 'jsonb' })
    @AutoMap(() => Object)
    jobPayload: Record<string, any>;

    @Column({ type: 'timestamptz', nullable: true })
    @AutoMap()
    startedAt?: Date;

    @Column({ type: 'timestamptz', nullable: true })
    @AutoMap()
    finishedAt?: Date;

    @Column({ type: 'text', nullable: true })
    @AutoMap()
    errorMessage?: string;

    @ManyToOne(() => ScheduleEntity, (schedule) => schedule.scheduleJobs, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'schedule_id' })
    @AutoMap(() => ScheduleEntity)
    schedule: Relation<ScheduleEntity>;

    @OneToMany(() => ScheduleJobEventEntity, (entity) => entity.scheduleJob)
    @AutoMap(() => [ScheduleJobEventEntity])
    scheduleJobEvents?: Relation<ScheduleJobEventEntity>[];
}
