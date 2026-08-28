import { AutoMap } from '@automapper/classes';
import { Column, Entity, Index, JoinColumn, ManyToOne, Relation } from 'typeorm';

import { AbstractEntity } from '../../../common/entities';
import { ValidationMatchResult } from '../enums';
import { DiscoveryUrlEntity } from './discovery-url.entity';
import { DiscoveryValidationBatchEntity } from './discovery-validation-batch.entity';

@Entity({ name: 'discovery_validation_logs', synchronize: false })
export class DiscoveryValidationLogEntity extends AbstractEntity {
    @Column({ type: 'uuid' })
    @AutoMap()
    @Index()
    sessionId: string;

    @Column({ type: 'uuid' })
    @AutoMap()
    @Index()
    discoveryUrlId: string;

    @Column({ type: 'uuid' })
    @AutoMap()
    @Index()
    validationBatchId: string;

    @Column({ type: 'varchar', length: 20, default: 'completed' })
    @AutoMap()
    operationStatus: string;

    @Column({ type: 'varchar', length: 20, default: ValidationMatchResult.UNCERTAIN })
    @AutoMap()
    matchResult: ValidationMatchResult;

    @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
    @AutoMap()
    confidenceScore: number;

    @Column({ type: 'text', nullable: true })
    @AutoMap()
    reason?: string;

    @Column({ type: 'jsonb', nullable: true })
    @AutoMap()
    matchedCriteria?: Record<string, any>;

    @Column({ type: 'integer', default: 0 })
    @AutoMap()
    processingDuration: number;

    @Column({ type: 'boolean', default: true })
    @AutoMap()
    isLatestLog: boolean;

    @ManyToOne(() => DiscoveryUrlEntity, (u) => u.validationLogs, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'discovery_url_id' })
    @AutoMap(() => DiscoveryUrlEntity)
    discoveryUrl: Relation<DiscoveryUrlEntity>;

    @ManyToOne(() => DiscoveryValidationBatchEntity, (b) => b.validationLogs, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'validation_batch_id' })
    @AutoMap(() => DiscoveryValidationBatchEntity)
    validationBatch: Relation<DiscoveryValidationBatchEntity>;
}
