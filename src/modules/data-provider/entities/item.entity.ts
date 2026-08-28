import { AutoMap } from '@automapper/classes';
import { Column, Entity, OneToMany, Relation, Unique } from 'typeorm';

import { AbstractEntity } from '../../../common/entities';
import { ProductMappingStatus } from '../enums';
import { DataProviderItemEntity } from './data-provider-item.entity';
import { ScrapingDataEntity } from './scraping-data.entity';

@Entity({ name: 'items', synchronize: false })
@Unique(['code'])
export class ItemEntity extends AbstractEntity {
    @Column({ length: 255 })
    @AutoMap()
    name: string;

    @Column({ type: 'varchar', length: 100, default: ProductMappingStatus.UNMAPPED })
    @AutoMap()
    mappingStatus: ProductMappingStatus;

    @Column({ length: 20, nullable: true })
    @AutoMap()
    code?: string;

    @Column({ type: 'jsonb', default: [] })
    @AutoMap()
    tags?: string[];

    @OneToMany(() => DataProviderItemEntity, (entity) => entity.item)
    @AutoMap(() => [DataProviderItemEntity])
    dataProviderItems?: Relation<DataProviderItemEntity>[];

    @OneToMany(() => ScrapingDataEntity, (entity) => entity.item)
    @AutoMap(() => [ScrapingDataEntity])
    scrapingData?: Relation<ScrapingDataEntity>[];
}
