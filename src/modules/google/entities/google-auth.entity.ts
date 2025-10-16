import { AutoMap } from '@automapper/classes';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, Relation, Unique } from 'typeorm';
import { AbstractEntity } from '../../../common/entities';
import { UserEntity } from '../../user/entities/user.entity';
import { GoogleDriveFileEntity } from './google-drive-file.entity';
import { GoogleDriveFolderEntity } from './google-drive-folder.entity';

@Entity({ name: 'google_auths', synchronize: false })
@Unique(['userId', 'email'])
export class GoogleAuthEntity extends AbstractEntity {
    @Column({ type: 'uuid' })
    @AutoMap()
    userId: string;

    @Column({ length: 200 })
    @AutoMap()
    email: string;

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

    @Column({ nullable: true })
    @AutoMap()
    googleRefreshTokenExpiresAt?: Date;

    @ManyToOne(() => UserEntity, (user) => user.googleAuths, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    @AutoMap(() => UserEntity)
    user: Relation<UserEntity>;

    @OneToMany(() => GoogleDriveFileEntity, (googleDriveFile) => googleDriveFile.googleAuth)
    @AutoMap(() => [GoogleDriveFileEntity])
    googleDriveFiles?: Relation<GoogleDriveFileEntity[]>;

    @OneToMany(() => GoogleDriveFolderEntity, (googleDriveFolder) => googleDriveFolder.googleAuth)
    @AutoMap(() => [GoogleDriveFolderEntity])
    googleDriveFolders?: Relation<GoogleDriveFolderEntity[]>;
}
