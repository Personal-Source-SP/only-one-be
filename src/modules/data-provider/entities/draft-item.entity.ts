import { AutoMap } from '@automapper/classes';
import { Column, Entity, JoinColumn, ManyToOne, Relation } from 'typeorm';

import { AbstractEntity } from '../../../common/entities';
import { DraftItemStatus } from '../enums/draft-item-status.enum';
import { DataProviderFeatureEntity } from './data-provider-feature.entity';
import { ItemEntity } from './item.entity';

@Entity({ name: 'draft_items', synchronize: false })
export class DraftItemEntity extends AbstractEntity {
    @Column({ name: 'data_provider_feature_id', type: 'uuid' })
    @AutoMap()
    dataProviderFeatureId: string;

    @Column({ type: 'text' })
    @AutoMap()
    title: string;

    @Column({ type: 'text' })
    @AutoMap()
    url: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    @AutoMap()
    code?: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    @AutoMap()
    searchQuery?: string;

    @Column({ type: 'float', default: 0 })
    @AutoMap()
    confidence: number;

    @Column({ type: 'varchar', length: 50, default: DraftItemStatus.NEW })
    @AutoMap()
    status: DraftItemStatus;

    @Column({ name: 'suggested_item_id', type: 'uuid', nullable: true })
    @AutoMap()
    suggestedItemId?: string;

    @Column({ name: 'mapped_item_id', type: 'uuid', nullable: true })
    @AutoMap()
    mappedItemId?: string;

    @Column({ name: 'mapped_data_provider_item_id', type: 'uuid', nullable: true })
    @AutoMap()
    mappedDataProviderItemId?: string;

    @Column({ type: 'jsonb', nullable: true })
    @AutoMap()
    metadata?: Record<string, any>;

    @ManyToOne(() => DataProviderFeatureEntity, (feature) => feature.draftItems, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'data_provider_feature_id' })
    @AutoMap(() => DataProviderFeatureEntity)
    dataProviderFeature: Relation<DataProviderFeatureEntity>;

    @ManyToOne(() => ItemEntity, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'suggested_item_id' })
    @AutoMap(() => ItemEntity)
    suggestedItem?: Relation<ItemEntity>;

    @ManyToOne(() => ItemEntity, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'mapped_item_id' })
    @AutoMap(() => ItemEntity)
    mappedItem?: Relation<ItemEntity>;
}
