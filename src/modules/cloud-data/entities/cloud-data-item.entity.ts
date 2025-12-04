import { AutoMap } from '@automapper/classes';
import { Column, Entity, Index, JoinColumn, ManyToOne, Relation } from 'typeorm';

import { AbstractEntity } from '../../../common/entities';
import { MimeType } from '../../../common/enums';
import { CloudDataProviderEntity } from './cloud-data-provider.entity';

@Entity({ name: 'cloud_data_items', synchronize: false })
export class CloudDataItemEntity extends AbstractEntity {
    @Column({ type: 'uuid' })
    @AutoMap()
    cloudDataProviderId: string;

    @Column({ type: 'boolean', default: true })
    @AutoMap()
    isActive: boolean;

    @Column({ type: 'varchar', length: 100 })
    @AutoMap()
    @Index()
    pathId: string;

    @Column({ type: 'varchar', length: 1000 })
    @AutoMap()
    pathUrl: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    @AutoMap()
    fileName?: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    @AutoMap()
    mimeType?: MimeType;

    @Column({ type: 'bigint', nullable: true })
    @AutoMap()
    fileSize?: number;

    @Column({ type: 'uuid', nullable: true })
    @AutoMap()
    mappingId?: string;

    @Column({ type: 'jsonb', nullable: true })
    @AutoMap(() => Object)
    metadata?: Record<string, any>;

    @ManyToOne(() => CloudDataProviderEntity, (cloudDataProvider) => cloudDataProvider.cloudDataItems, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'cloud_data_provider_id' })
    @AutoMap(() => CloudDataProviderEntity)
    cloudDataProvider: Relation<CloudDataProviderEntity>;
}
