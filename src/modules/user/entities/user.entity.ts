import { AutoMap } from '@automapper/classes';
import { Column, Entity, Unique } from 'typeorm';
import { AbstractEntity } from '../../../common/entities';

@Entity({ name: 'users ', synchronize: true })
@Unique(['email'])
export class UserEntity extends AbstractEntity {
    @Column({ length: 100, nullable: true })
    @AutoMap()
    firstName: string;

    @Column({ length: 100, nullable: true })
    @AutoMap()
    lastName: string;

    @Column({ length: 200 })
    @AutoMap()
    email: string;

    @Column({ length: 200, select: false })
    @AutoMap()
    password: string;

    @Column({ default: true })
    @AutoMap()
    isActive: boolean;

    @Column({ nullable: true })
    @AutoMap()
    phoneNumber?: string;
}
