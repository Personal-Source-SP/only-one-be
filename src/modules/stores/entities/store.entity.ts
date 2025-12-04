import { AutoMap } from '@automapper/classes';
import { Column, Entity, OneToMany, Relation } from 'typeorm';

import { AbstractEntity } from '../../../common/entities';
import { StoreType } from '../enums';
import { StoreItemEntity } from './store-item.entity';

@Entity({ name: 'stores', synchronize: false })
export class StoreEntity extends AbstractEntity {
    @Column({ type: 'varchar', length: 255 })
    @AutoMap()
    name: string;

    @Column({ type: 'varchar', length: 50, default: StoreType.TELEGRAM })
    @AutoMap()
    type: StoreType;

    @Column({ type: 'boolean', default: true })
    @AutoMap()
    isActive: boolean;

    @Column({ type: 'bigint', default: 0 })
    @AutoMap()
    totalItems: number;

    @Column({ type: 'bigint', default: 0 })
    @AutoMap()
    totalSize: number;

    @Column({ type: 'jsonb', nullable: true })
    @AutoMap(() => Object)
    config?: Record<string, any>;

    @OneToMany(() => StoreItemEntity, (storeItem) => storeItem.store)
    @AutoMap(() => [StoreItemEntity])
    storeItems?: Relation<StoreItemEntity>[];
}
