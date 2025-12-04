import { AutoMap } from '@automapper/classes';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, Relation } from 'typeorm';

import { AbstractEntity } from '../../../common/entities';
import { DisplayType } from '../enums';
import { DataProviderEntity } from './data-provider.entity';
import { ItemEntity } from './item.entity';
import { ScrapingDataEntity } from './scraping-data.entity';

@Entity({ name: 'data_provider_items', synchronize: false })
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

    @Column({ type: 'boolean', default: true })
    @AutoMap()
    isActive: boolean;

    @Column({ type: 'varchar', length: 50, default: DisplayType.IMAGE })
    @AutoMap()
    displayType: DisplayType;

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

    @OneToMany(() => ScrapingDataEntity, (entity) => entity.dataProviderItem)
    @AutoMap(() => [ScrapingDataEntity])
    scrapingData?: Relation<ScrapingDataEntity>[];
}
