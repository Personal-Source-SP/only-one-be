import { AutoMap } from '@automapper/classes';
import { Column, Entity, JoinColumn, ManyToOne, Relation } from 'typeorm';

import { AbstractEntity } from '../../../common/entities';
import { MimeType } from '../../../common/enums';
import { DataProviderEntity } from './data-provider.entity';
import { DataProviderItemEntity } from './data-provider-item.entity';
import { ItemEntity } from './item.entity';

@Entity({ name: 'scraping_data', synchronize: false })
export class ScrapingDataEntity extends AbstractEntity {
    @Column({ type: 'uuid' })
    @AutoMap()
    dataProviderId: string;

    @Column({ type: 'uuid' })
    @AutoMap()
    dataProviderItemId: string;

    @Column({ type: 'uuid' })
    @AutoMap()
    itemId: string;

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    @AutoMap()
    scrapeTimestamp: Date;

    @Column({ type: 'varchar', length: 255 })
    @AutoMap()
    dataId: string;

    @Column({ type: 'varchar', length: 255 })
    @AutoMap()
    type: MimeType;

    @Column({ type: 'varchar', length: 255 })
    @AutoMap()
    url: string;

    @Column({ type: 'timestamptz', nullable: true })
    @AutoMap()
    lastModified?: Date;

    @Column({ type: 'jsonb', nullable: true })
    @AutoMap()
    metadata?: Record<string, any>;

    @Column({ type: 'uuid', nullable: true })
    @AutoMap()
    cloudDataItemId?: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    @AutoMap()
    cloudDataUrl?: string;

    @ManyToOne(() => DataProviderEntity, (entity) => entity.scrapingData, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'data_provider_id' })
    @AutoMap(() => DataProviderEntity)
    dataProvider: Relation<DataProviderEntity>;

    @ManyToOne(() => DataProviderItemEntity, (entity) => entity.scrapingData, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'data_provider_item_id' })
    @AutoMap(() => DataProviderItemEntity)
    dataProviderItem: Relation<DataProviderItemEntity>;

    @ManyToOne(() => ItemEntity, (entity) => entity.scrapingData, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'item_id' })
    @AutoMap(() => ItemEntity)
    item: Relation<ItemEntity>;
}
