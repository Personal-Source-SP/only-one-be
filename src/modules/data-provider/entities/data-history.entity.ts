import { AutoMap } from '@automapper/classes';
import { Column, Entity, JoinColumn, ManyToOne, Relation } from 'typeorm';

import { AbstractEntity } from '../../../common/entities';
import { ScrapeStatusEnum } from '../enums/scrape-status.enum';
import { DataProviderItemEntity } from './data-provider-item.entity';

@Entity({ name: 'data_history', synchronize: true })
export class DataHistoryEntity extends AbstractEntity {
    @Column({ type: 'uuid' })
    @AutoMap()
    dataProviderItemId: string;

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    @AutoMap()
    scrapeTimestamp: Date;

    @Column({ type: 'varchar', length: 20, nullable: true, default: ScrapeStatusEnum.SUCCESS })
    @AutoMap()
    status: ScrapeStatusEnum;

    @Column({ type: 'jsonb', nullable: true })
    @AutoMap()
    metadata?: Record<string, any>;

    @Column({ type: 'text', nullable: true })
    @AutoMap()
    errorMessage?: string;

    @ManyToOne(() => DataProviderItemEntity, (entity) => entity.dataHistory, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'data_provider_item_id' })
    dataProviderItem: Relation<DataProviderItemEntity>;
}
