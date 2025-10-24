import { AutoMap } from '@automapper/classes';
import { Check, Column, Entity, OneToMany, Relation, Unique } from 'typeorm';

import { AbstractEntity } from '../../../common/entities';
import { DataProviderSearchStatus, DataProviderStatus, ScraperServiceEnum } from '../enums';
import { ISearchConfig, ITargetConfig } from '../interfaces';
import { ConfigVersionEntity } from './config-version.entity';
import { DataProviderItemEntity } from './data-provider-item.entity';

@Entity({ name: 'data_providers', synchronize: false })
@Check(`"base_url" NOT LIKE '%/'`)
@Unique(['baseUrl'])
@Check(`"identifier" is null OR "identifier" ~ '^[a-z0-9-]+$'`)
export class DataProviderEntity extends AbstractEntity {
    @Column({ length: 255 })
    @AutoMap()
    name: string;

    @Column({ length: 100, default: ScraperServiceEnum.GENERIC })
    @AutoMap()
    scraperService: ScraperServiceEnum;

    @Column({ length: 255 })
    @AutoMap()
    baseUrl: string;

    @Column({ type: 'varchar', length: 100, default: DataProviderStatus.UNCONFIGURED })
    @AutoMap()
    status: DataProviderStatus;

    @Column({ length: 255, nullable: true, comment: 'Group identifier for region-specific providers' })
    @AutoMap()
    identifier?: string;

    @Column({ type: 'jsonb', nullable: true })
    @AutoMap()
    targetConfig?: ITargetConfig;

    @Column({ type: 'timestamp', nullable: true })
    @AutoMap()
    lastSuccessfulScrapeAt?: Date;

    @Column({ type: 'jsonb', nullable: true })
    @AutoMap()
    searchConfig?: ISearchConfig;

    @Column({ type: 'varchar', length: 50, default: 'generic' })
    @AutoMap()
    searchService: string;

    @Column({ type: 'varchar', length: 100, default: DataProviderSearchStatus.UNCONFIGURED })
    @AutoMap()
    searchStatus: DataProviderSearchStatus;

    @OneToMany(() => DataProviderItemEntity, (entity) => entity.dataProvider)
    @AutoMap(() => [DataProviderItemEntity])
    dataProviderItems?: Relation<DataProviderItemEntity>[];

    @OneToMany(() => ConfigVersionEntity, (entity) => entity.dataProvider)
    @AutoMap(() => [ConfigVersionEntity])
    configVersions?: Relation<ConfigVersionEntity>[];
}
