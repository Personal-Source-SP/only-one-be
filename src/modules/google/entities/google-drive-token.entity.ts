import { AutoMap } from '@automapper/classes';
import { Column, Entity, Index, OneToOne, JoinColumn } from 'typeorm';
import { AbstractEntity } from '../../../common/entities';
import { UserEntity } from '../../user/entities/user.entity';

@Entity({ name: 'google_drive_tokens', synchronize: false })
@Index(['userId'], { unique: true })
export class GoogleDriveTokenEntity extends AbstractEntity {
    @Column({ length: 36 })
    @AutoMap()
    userId: string;

    @Column({ length: 2000 })
    @AutoMap()
    accessToken: string;

    @Column({ length: 2000, nullable: true })
    @AutoMap()
    refreshToken: string;

    @Column({ type: 'timestamp' })
    @AutoMap()
    expiresAt: Date;

    @Column({ length: 100, nullable: true })
    @AutoMap()
    scope: string;

    @Column({ length: 100, nullable: true })
    @AutoMap()
    tokenType: string;

    @Column({ default: false })
    @AutoMap()
    isActive: boolean;

    @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    @AutoMap()
    user: UserEntity;
}
