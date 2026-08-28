import { AutoMap } from '@automapper/classes';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, Relation } from 'typeorm';

import { AbstractEntity } from '../../../common/entities';
import { DiscoverySessionStatus } from '../enums';
import { DataProviderEntity } from './data-provider.entity';
import { DiscoveryUrlEntity } from './discovery-url.entity';
import { DiscoveryValidationBatchEntity } from './discovery-validation-batch.entity';

@Entity({ name: 'discovery_sessions', synchronize: false })
export class DiscoverySessionEntity extends AbstractEntity {
    @Column({ type: 'varchar', length: 50, unique: true })
    @AutoMap()
    sessionCode: string;

    @Column({ type: 'uuid' })
    @AutoMap()
    @Index()
    dataProviderId: string;

    @Column({ type: 'varchar', length: 2000 })
    @AutoMap()
    targetUrl: string;

    @Column({ type: 'varchar', length: 20, default: DiscoverySessionStatus.PENDING })
    @AutoMap()
    status: DiscoverySessionStatus;

    @Column({ type: 'integer', default: 1 })
    @AutoMap()
    depth: number;

    @Column({ type: 'integer', default: 100 })
    @AutoMap()
    maxUrls: number;

    @Column({ type: 'integer', default: 0 })
    @AutoMap()
    totalDiscovered: number;

    @Column({ type: 'integer', default: 0 })
    @AutoMap()
    totalQueued: number;

    @Column({ type: 'integer', default: 0 })
    @AutoMap()
    totalValidated: number;

    @Column({ type: 'integer', nullable: true })
    @AutoMap()
    durationSeconds?: number;

    @Column({ type: 'text', nullable: true })
    @AutoMap()
    errorMessage?: string;

    @Column({ type: 'text', nullable: true })
    @AutoMap()
    notes?: string;

    @ManyToOne(() => DataProviderEntity, (p) => p.discoverySessions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'data_provider_id' })
    @AutoMap(() => DataProviderEntity)
    dataProvider: Relation<DataProviderEntity>;

    @OneToMany(() => DiscoveryUrlEntity, (u) => u.discoverySession)
    @AutoMap(() => [DiscoveryUrlEntity])
    discoveryUrls: Relation<DiscoveryUrlEntity>[];

    @OneToMany(() => DiscoveryValidationBatchEntity, (b) => b.discoverySession)
    @AutoMap(() => [DiscoveryValidationBatchEntity])
    validationBatches: Relation<DiscoveryValidationBatchEntity>[];
}
