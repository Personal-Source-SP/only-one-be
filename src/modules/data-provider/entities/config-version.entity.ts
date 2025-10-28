import { AutoMap } from '@automapper/classes';
import { Column, Entity, JoinColumn, ManyToOne, Relation } from 'typeorm';

import { AbstractEntity } from '../../../common/entities';
import { UserEntity } from '../../user/entities/user.entity';
import { ConfigVersionType } from '../enums';
import { ITargetConfig } from '../interfaces';
import { DataProviderEntity } from './data-provider.entity';

@Entity({ name: 'data_provider_config_versions', synchronize: false })
export class ConfigVersionEntity extends AbstractEntity {
    @Column({ type: 'uuid' })
    @AutoMap()
    dataProviderId: string;

    @Column({ type: 'boolean', default: false })
    @AutoMap()
    isActive: boolean;

    @Column({ type: 'int' })
    @AutoMap()
    versionId: number;

    @Column({ type: 'jsonb' })
    @AutoMap()
    targetConfig: ITargetConfig;

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

    @ManyToOne(() => DataProviderEntity, (dataProvider) => dataProvider.configVersions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'data_provider_id' })
    @AutoMap(() => DataProviderEntity)
    dataProvider: Relation<DataProviderEntity>;
}
