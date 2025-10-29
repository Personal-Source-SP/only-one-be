import { AutoMap } from '@automapper/classes';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, Relation, Unique } from 'typeorm';

import { AbstractEntity } from '../../../common/entities';
import { DataHistoryEntity } from './data-history.entity';
import { DataProviderEntity } from './data-provider.entity';
import { ItemEntity } from './item.entity';

@Entity({ name: 'data_provider_items', synchronize: false })
@Unique(['itemId', 'dataProviderId'])
export class DataProviderItemEntity extends AbstractEntity {
    @Column({ type: 'uuid' })
    @AutoMap()
    itemId: string;

    @Column({ type: 'uuid' })
    @AutoMap()
    dataProviderId: string;

    @Column({ type: 'text' })
    @AutoMap()
    itemUrl: string;

    @Column({ type: 'timestamptz', nullable: true })
    @AutoMap()
    lastScrapedTimestamp?: Date;

    @ManyToOne(() => ItemEntity, (entity) => entity.dataProviderItems, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'item_id' })
    @AutoMap(() => ItemEntity)
    item: Relation<ItemEntity>;

    @ManyToOne(() => DataProviderEntity, (entity) => entity.dataProviderItems, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'data_provider_id' })
    @AutoMap(() => DataProviderEntity)
    dataProvider: Relation<DataProviderEntity>;

    @OneToMany(() => DataHistoryEntity, (entity) => entity.dataProviderItem)
    @AutoMap(() => [DataHistoryEntity])
    dataHistory?: Relation<DataHistoryEntity>[];
}
