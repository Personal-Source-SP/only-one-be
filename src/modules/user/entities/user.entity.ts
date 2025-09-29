import { AutoMap } from '@automapper/classes';
import { Column, Entity, OneToOne, Relation, Unique } from 'typeorm';
import { AbstractEntity } from '../../../common/entities';
import { GoogleAuthEntity } from '../../google/entities/google-auth.entity';

@Entity({ name: 'users ', synchronize: false })
@Unique(['email'])
export class UserEntity extends AbstractEntity {
    @Column({ length: 200 })
    @AutoMap()
    email: string;

    @Column({ length: 200 })
    @AutoMap()
    password: string;

    @Column({ default: true })
    @AutoMap()
    isActive: boolean;

    @Column({ length: 100, nullable: true })
    @AutoMap()
    firstName?: string;

    @Column({ length: 100, nullable: true })
    @AutoMap()
    lastName?: string;

    @Column({ nullable: true })
    @AutoMap()
    phoneNumber?: string;

    @OneToOne(() => GoogleAuthEntity, (googleAuth) => googleAuth.user)
    @AutoMap(() => GoogleAuthEntity)
    googleAuth: Relation<GoogleAuthEntity>;
}
