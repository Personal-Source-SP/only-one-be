import { AutoMap } from '@automapper/classes';
import { Check, Column, Entity, OneToMany, Relation, Unique } from 'typeorm';

import { AbstractEntity } from '../../../common/entities';
import { DataProviderFeatureEntity } from './data-provider-feature.entity';
import { DataProviderItemEntity } from './data-provider-item.entity';
import { ScrapingDataEntity } from './scraping-data.entity';

@Entity({ name: 'data_providers', synchronize: false })
@Check(`"base_url" NOT LIKE '%/'`)
@Unique(['baseUrl'])
@Check(`"identifier" is null OR "identifier" ~ '^[a-z0-9-]+$'`)
export class DataProviderEntity extends AbstractEntity {
    @Column({ length: 255 })
    @AutoMap()
    identifier: string;

    @Column({ length: 255 })
    @AutoMap()
    name: string;

    @Column({ length: 255 })
    @AutoMap()
    baseUrl: string;

    @OneToMany(() => DataProviderFeatureEntity, (feature) => feature.dataProvider)
    @AutoMap(() => [DataProviderFeatureEntity])
    features?: Relation<DataProviderFeatureEntity>[];

    @OneToMany(() => DataProviderItemEntity, (entity) => entity.dataProvider)
    @AutoMap(() => [DataProviderItemEntity])
    dataProviderItems?: Relation<DataProviderItemEntity>[];

    @OneToMany(() => ScrapingDataEntity, (entity) => entity.dataProvider)
    @AutoMap(() => [ScrapingDataEntity])
    scrapingData?: Relation<ScrapingDataEntity>[];
}
