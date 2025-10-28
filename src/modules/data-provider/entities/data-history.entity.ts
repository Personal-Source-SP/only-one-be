import { AutoMap } from '@automapper/classes';
import { Column, Entity, JoinColumn, ManyToOne, Relation } from 'typeorm';

import { AbstractEntity } from '../../../common/entities';
import { DataProviderItemEntity } from './data-provider-item.entity';
import { DataProviderEntity } from './data-provider.entity';

@Entity({ name: 'data_history', synchronize: false })
export class DataHistoryEntity extends AbstractEntity {
    @Column({ type: 'uuid' })
    @AutoMap()
    dataProviderId: string;

    @Column({ type: 'uuid' })
    @AutoMap()
    dataProviderItemId: string;

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    @AutoMap()
    scrapeTimestamp: Date;

    @Column({ type: 'varchar', length: 255 })
    @AutoMap()
    dataId: string;

    @Column({ type: 'varchar', length: 255 })
    @AutoMap()
    type: string;

    @Column({ type: 'varchar', length: 255 })
    @AutoMap()
    url: string;

    @Column({ type: 'timestamptz', nullable: true })
    @AutoMap()
    lastModified?: Date;

    @Column({ type: 'jsonb', nullable: true })
    @AutoMap()
    metadata?: Record<string, any>;

    @ManyToOne(() => DataProviderEntity, (entity) => entity.dataHistory, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'data_provider_id' })
    @AutoMap(() => DataProviderEntity)
    dataProvider: Relation<DataProviderEntity>;

    @ManyToOne(() => DataProviderItemEntity, (entity) => entity.dataHistory, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'data_provider_item_id' })
    @AutoMap(() => DataProviderItemEntity)
    dataProviderItem: Relation<DataProviderItemEntity>;
}
