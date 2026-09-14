import { AutoMap } from '@automapper/classes';
import { Column, Entity, JoinColumn, ManyToOne, Relation } from 'typeorm';

import { AbstractEntity } from '../../../common/entities';
import { UserEntity } from '../../user/entities/user.entity';
import { SettingType } from '../enums';

@Entity({ name: 'settings', synchronize: false })
export class SettingEntity extends AbstractEntity {
    @Column({ length: 200 })
    @AutoMap()
    key: string;

    @Column({ type: 'jsonb' })
    @AutoMap()
    value: Record<string, any>;

    @Column({ default: true })
    @AutoMap()
    isActive: boolean;

    @Column({ length: 200, default: SettingType.GLOBAL })
    @AutoMap()
    type: SettingType;

    @Column({ type: 'uuid', nullable: true, name: 'user_id' })
    @AutoMap()
    userId?: string | null;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    @AutoMap(() => UserEntity)
    user?: Relation<UserEntity>;
}
