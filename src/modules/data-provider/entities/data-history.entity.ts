import { AutoMap } from '@automapper/classes';
import { Column, Entity, JoinColumn, ManyToOne, Relation } from 'typeorm';

import { AbstractEntity } from '../../../common/entities';
import { DataProviderItemEntity } from './data-provider-item.entity';

@Entity({ name: 'data_history', synchronize: false })
export class DataHistoryEntity extends AbstractEntity {
    @Column({ type: 'uuid' })
    @AutoMap()
    dataProviderItemId: string;

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    @AutoMap()
    scrapeTimestamp: Date;

    @Column({ type: 'varchar', length: 255, nullable: true })
    @AutoMap()
    dataId?: string;

    @Column({ type: 'jsonb', nullable: true })
    @AutoMap()
    metadata?: Record<string, any>;

    @ManyToOne(() => DataProviderItemEntity, (entity) => entity.dataHistory, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'data_provider_item_id' })
    dataProviderItem: Relation<DataProviderItemEntity>;
}
