import { AutoMap } from '@automapper/classes';
import { Column, Entity, Index, JoinColumn, ManyToOne, Relation } from 'typeorm';

import { AbstractEntity } from '../../../common/entities';
import { StoreEntity } from './store.entity';

@Entity({ name: 'store_items', synchronize: false })
export class StoreItemEntity extends AbstractEntity {
    @Column({ type: 'uuid' })
    @AutoMap()
    storeId: string;

    @Column({ type: 'boolean', default: true })
    @AutoMap()
    isActive: boolean;

    @Column({ type: 'varchar', length: 100 })
    @AutoMap()
    @Index()
    pathId: string;

    @Column({ type: 'varchar', length: 1000 })
    @AutoMap()
    pathUrl: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    @AutoMap()
    fileName?: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    @AutoMap()
    mimeType?: string;

    @Column({ type: 'bigint', nullable: true })
    @AutoMap()
    fileSize?: number;

    @Column({ type: 'uuid', nullable: true })
    @AutoMap()
    mappingId?: string;

    @Column({ type: 'jsonb', nullable: true })
    @AutoMap(() => Object)
    metadata?: Record<string, any>;

    @ManyToOne(() => StoreEntity, (store) => store.storeItems, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'store_id' })
    @AutoMap(() => StoreEntity)
    store: Relation<StoreEntity>;
}
