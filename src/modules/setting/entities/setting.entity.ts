import { AutoMap } from '@automapper/classes';
import { Column, Entity, Unique } from 'typeorm';
import { AbstractEntity } from '../../../common/entities';
import { SettingType } from '../enums';

@Entity({ name: 'settings', synchronize: false })
@Unique(['key'])
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
}
