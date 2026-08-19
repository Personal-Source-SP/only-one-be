import { AutoMap } from '@automapper/classes';
import { Column, Entity, JoinColumn, ManyToOne, Relation } from 'typeorm';

import { AbstractEntity } from '../../../common/entities';
import { UserEntity } from '../../user/entities/user.entity';
import { ConfigVersionType } from '../enums';
import { DataProviderFeatureEntity } from './data-provider-feature.entity';

@Entity({ name: 'data_provider_config_versions', synchronize: false })
export class ConfigVersionEntity extends AbstractEntity {
    @Column({ type: 'uuid' })
    @AutoMap()
    featureId: string;

    @Column({ type: 'boolean', default: false })
    @AutoMap()
    isActive: boolean;

    @Column({ type: 'int' })
    @AutoMap()
    versionId: number;

    @Column({ type: 'jsonb' })
    @AutoMap()
    config: Record<string, any>;

    @Column({ type: 'varchar', length: 100 })
    @AutoMap()
    changeType: ConfigVersionType;

    @Column({ type: 'text', nullable: true })
    @AutoMap()
    changeDescription?: string;

    @Column({ type: 'uuid', nullable: true })
    @AutoMap()
    createdBy?: string;

    @ManyToOne(() => UserEntity, (user) => user.id, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'created_by' })
    @AutoMap(() => UserEntity)
    user: Relation<UserEntity>;

    @ManyToOne(() => DataProviderFeatureEntity, (feature) => feature.versions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'feature_id' })
    @AutoMap(() => DataProviderFeatureEntity)
    feature: Relation<DataProviderFeatureEntity>;
}
