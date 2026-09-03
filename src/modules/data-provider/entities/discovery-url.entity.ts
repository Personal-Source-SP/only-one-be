import { AutoMap } from '@automapper/classes';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, Relation, Unique } from 'typeorm';

import { AbstractEntity } from '../../../common/entities';
import {
    DiscoveryUrlStatus,
    DiscoveryValidationStatus,
    FinalValidationStatus,
    ValidationMatchResult,
    ValidationUserAction,
} from '../enums';
import { DataProviderEntity } from './data-provider.entity';
import { DiscoverySessionEntity } from './discovery-session.entity';
import { DiscoveryValidationLogEntity } from './discovery-validation-log.entity';

@Entity({ name: 'discovery_urls', synchronize: false })
@Unique(['sessionId', 'url'])
export class DiscoveryUrlEntity extends AbstractEntity {
    @Column({ type: 'uuid' })
    @AutoMap()
    @Index()
    sessionId: string;

    @Column({ type: 'uuid' })
    @AutoMap()
    @Index()
    dataProviderId: string;

    @Column({ type: 'varchar', length: 2000 })
    @AutoMap()
    url: string;

    @Column({ type: 'varchar', length: 500 })
    @AutoMap()
    domain: string;

    @Column({ type: 'varchar', length: 1000, nullable: true })
    @AutoMap()
    title?: string;

    @Column({ type: 'text', nullable: true })
    @AutoMap()
    description?: string;

    @Column({ type: 'varchar', length: 20, default: DiscoveryUrlStatus.DISCOVERED })
    @AutoMap()
    status: DiscoveryUrlStatus;

    @Column({ type: 'integer', default: 1 })
    @AutoMap()
    foundAtDepth: number;

    @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
    @AutoMap()
    confidenceScore: number;

    @Column({ type: 'varchar', length: 20, default: DiscoveryValidationStatus.PENDING })
    @AutoMap()
    validationStatus: DiscoveryValidationStatus;

    @Column({ type: 'varchar', length: 20, default: ValidationMatchResult.UNCERTAIN })
    @AutoMap()
    matchResult: ValidationMatchResult;

    @Column({ type: 'varchar', length: 20, nullable: true })
    @AutoMap()
    userAction?: ValidationUserAction;

    @Column({ type: 'timestamptz', nullable: true })
    @AutoMap()
    userActionDate?: Date;

    @Column({ type: 'text', nullable: true })
    @AutoMap()
    userActionReason?: string;

    @Column({ type: 'varchar', length: 20, default: FinalValidationStatus.PENDING_REVIEW })
    @AutoMap()
    finalValidationStatus: FinalValidationStatus;

    @ManyToOne(() => DiscoverySessionEntity, (s) => s.discoveryUrls, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'session_id' })
    @AutoMap(() => DiscoverySessionEntity)
    discoverySession: Relation<DiscoverySessionEntity>;

    @ManyToOne(() => DataProviderEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'data_provider_id' })
    @AutoMap(() => DataProviderEntity)
    dataProvider: Relation<DataProviderEntity>;

    @OneToMany(() => DiscoveryValidationLogEntity, (l) => l.discoveryUrl)
    @AutoMap(() => [DiscoveryValidationLogEntity])
    validationLogs: Relation<DiscoveryValidationLogEntity>[];
}
