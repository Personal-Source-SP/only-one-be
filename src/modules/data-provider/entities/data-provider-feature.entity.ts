import { AutoMap } from '@automapper/classes';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, Relation, Unique } from 'typeorm';

import { AbstractEntity } from '../../../common/entities';
import { DataProviderFeatureErrorType, DataProviderFeatureStatus, DataProviderFeatureType } from '../enums';
import { ConfigVersionEntity } from './config-version.entity';
import { DataProviderEntity } from './data-provider.entity';

@Entity({ name: 'data_provider_features', synchronize: false })
@Unique(['dataProviderId', 'type'])
export class DataProviderFeatureEntity extends AbstractEntity {
    @Column({ name: 'data_provider_id', type: 'uuid' })
    @AutoMap()
    dataProviderId: string;

    @Column({ type: 'varchar', length: 50 })
    @AutoMap()
    type: DataProviderFeatureType;

    @Column({ type: 'varchar', length: 50, default: 'generic' })
    @AutoMap()
    service: string;

    @Column({ type: 'varchar', length: 50, default: DataProviderFeatureStatus.UNCONFIGURED })
    @AutoMap()
    status: DataProviderFeatureStatus;

    @Column({ type: 'jsonb', nullable: true })
    @AutoMap()
    config?: Record<string, any>;

    @Column({ name: 'consecutive_failures', type: 'integer', default: 0 })
    @AutoMap()
    consecutiveFailures: number;

    @Column({ name: 'last_error_message', type: 'text', nullable: true })
    @AutoMap()
    lastErrorMessage?: string;

    @Column({ name: 'last_error_type', type: 'varchar', length: 50, nullable: true })
    @AutoMap()
    lastErrorType?: DataProviderFeatureErrorType;

    @Column({ name: 'last_failed_run_at', type: 'timestamp', nullable: true })
    @AutoMap()
    lastFailedRunAt?: Date;

    @Column({ name: 'last_successful_run_at', type: 'timestamp', nullable: true })
    @AutoMap()
    lastSuccessfulRunAt?: Date;

    @ManyToOne(() => DataProviderEntity, (dataProvider) => dataProvider.features, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'data_provider_id' })
    @AutoMap(() => DataProviderEntity)
    dataProvider: Relation<DataProviderEntity>;

    @OneToMany(() => ConfigVersionEntity, (configVersion) => configVersion.feature)
    @AutoMap(() => [ConfigVersionEntity])
    versions?: Relation<ConfigVersionEntity>[];
}
