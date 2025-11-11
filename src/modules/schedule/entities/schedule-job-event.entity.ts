import { AutoMap } from '@automapper/classes';
import { Column, Entity, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { AbstractEntity } from '../../../common/entities';
import { ScheduleJobEventType } from '../enums';
import { ScheduleJobEntity } from './schedule-job.entity';

@Entity({ name: 'schedule_job_events', synchronize: false })
export class ScheduleJobEventEntity extends AbstractEntity {
    @Column({ type: 'uuid' })
    @AutoMap()
    scheduleJobId: string;

    @Column({ type: 'varchar', length: 20, default: ScheduleJobEventType.PENDING })
    @AutoMap()
    eventType: ScheduleJobEventType;

    @Column({ type: 'varchar', length: 255 })
    @AutoMap()
    eventMessage: string;

    @Column({ default: 0 })
    @AutoMap()
    retryCount: number;

    @Column({ type: 'jsonb', nullable: true })
    @AutoMap(() => Object)
    payload?: Record<string, any>;

    @Column({ type: 'jsonb', nullable: true })
    @AutoMap()
    metaData?: Record<string, any>;

    @Column({ type: 'timestamptz', nullable: true })
    @AutoMap()
    startedAt?: Date;

    @Column({ type: 'timestamptz', nullable: true })
    @AutoMap()
    finishedAt?: Date;

    @ManyToOne(() => ScheduleJobEntity, (entity) => entity.scheduleJobEvents, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'schedule_job_id' })
    scheduleJob: Relation<ScheduleJobEntity>;
}
