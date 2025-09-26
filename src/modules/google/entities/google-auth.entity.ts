import { AutoMap } from '@automapper/classes';
import { Column, Entity, JoinColumn, OneToOne, Relation, Unique } from 'typeorm';
import { AbstractEntity } from '../../../common/entities';
import { UserEntity } from '../../user/entities/user.entity';

@Entity({ name: 'google_auths', synchronize: false })
@Unique(['userId'])
export class GoogleAuthEntity extends AbstractEntity {
    @Column({ type: 'uuid' })
    @AutoMap()
    userId: string;

    @Column({ length: 2000 })
    @AutoMap()
    googleAccessToken: string;

    @Column({ type: 'timestamp' })
    @AutoMap()
    googleExpiresAt: Date;

    @Column({ default: false })
    @AutoMap()
    isActive: boolean;

    @Column({ length: 2000, nullable: true })
    @AutoMap()
    googleRefreshToken?: string;

    @Column({ length: 255, nullable: true })
    @AutoMap()
    googleScope?: string;

    @Column({ length: 100, nullable: true })
    @AutoMap()
    googleTokenType?: string;

    @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    @AutoMap(() => UserEntity)
    user: Relation<UserEntity>;
}
