import { AutoMap } from '@automapper/classes';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, Relation } from 'typeorm';

import { AbstractEntity } from '../../../common/entities';
import { ValidationBatchStatus } from '../enums';
import { DiscoverySessionEntity } from './discovery-session.entity';
import { DiscoveryValidationLogEntity } from './discovery-validation-log.entity';

@Entity({ name: 'discovery_validation_batches', synchronize: false })
export class DiscoveryValidationBatchEntity extends AbstractEntity {
    @Column({ type: 'uuid' })
    @AutoMap()
    @Index()
    sessionId: string;

    @Column({ type: 'varchar', length: 50 })
    @AutoMap()
    batchNumber: string;

    @Column({ type: 'varchar', length: 20, default: ValidationBatchStatus.PENDING })
    @AutoMap()
    status: ValidationBatchStatus;

    @Column({ type: 'integer', default: 0 })
    @AutoMap()
    totalUrls: number;

    @Column({ type: 'integer', default: 0 })
    @AutoMap()
    processedUrls: number;

    @Column({ type: 'integer', default: 0 })
    @AutoMap()
    matchedUrls: number;

    @Column({ type: 'integer', default: 0 })
    @AutoMap()
    noMatchUrls: number;

    @Column({ type: 'timestamptz', nullable: true })
    @AutoMap()
    startedAt?: Date;

    @Column({ type: 'timestamptz', nullable: true })
    @AutoMap()
    completedAt?: Date;

    @Column({ type: 'text', nullable: true })
    @AutoMap()
    reasonCancelled?: string;

    @ManyToOne(() => DiscoverySessionEntity, (s) => s.validationBatches, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'session_id' })
    @AutoMap(() => DiscoverySessionEntity)
    discoverySession: Relation<DiscoverySessionEntity>;

    @OneToMany(() => DiscoveryValidationLogEntity, (l) => l.validationBatch)
    @AutoMap(() => [DiscoveryValidationLogEntity])
    validationLogs: Relation<DiscoveryValidationLogEntity>[];
}
