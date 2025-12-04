import { AutoMap } from '@automapper/classes';
import { Column, Entity, OneToMany, Relation } from 'typeorm';

import { AbstractEntity } from '../../../common/entities';
import { CloudDataProviderType } from '../enums';
import { CloudDataItemEntity } from './cloud-data-item.entity';

@Entity({ name: 'cloud_data_providers', synchronize: false })
export class CloudDataProviderEntity extends AbstractEntity {
    @Column({ type: 'varchar', length: 255 })
    @AutoMap()
    name: string;

    @Column({ type: 'varchar', length: 50, default: CloudDataProviderType.TELEGRAM })
    @AutoMap()
    type: CloudDataProviderType;

    @Column({ type: 'boolean', default: true })
    @AutoMap()
    isActive: boolean;

    @Column({ type: 'bigint', default: 0 })
    @AutoMap()
    totalItems: number;

    @Column({ type: 'bigint', default: 0 })
    @AutoMap()
    totalSize: number;

    @Column({ type: 'jsonb', nullable: true })
    @AutoMap(() => Object)
    config?: Record<string, any>;

    @OneToMany(() => CloudDataItemEntity, (cloudDataItem) => cloudDataItem.cloudDataProvider)
    @AutoMap(() => [CloudDataItemEntity])
    cloudDataItems?: Relation<CloudDataItemEntity>[];
}
