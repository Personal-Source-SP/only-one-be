import { AutoMap } from '@automapper/classes';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, Relation } from 'typeorm';

import { AbstractEntity } from '../../../common/entities';
import { GoogleAuthEntity } from './google-auth.entity';
import { GoogleDriveFileEntity } from './google-drive-file.entity';

@Entity({ name: 'google_drive_folders', synchronize: false })
export class GoogleDriveFolderEntity extends AbstractEntity {
    @Column({ type: 'uuid' })
    @AutoMap()
    googleAuthId: string;

    @Column()
    @AutoMap()
    googleDriveId: string;

    @Column({ length: 500 })
    @AutoMap()
    name: string;

    @Column({ length: 100, nullable: true })
    @AutoMap()
    parentFolderId?: string;

    @Column({ type: 'timestamp', nullable: true })
    @AutoMap()
    lastModified?: Date;

    @Column({ nullable: true })
    @AutoMap()
    isTrashed?: boolean;

    @Column({ nullable: true })
    @AutoMap()
    isStarred?: boolean;

    @ManyToOne(() => GoogleAuthEntity, (googleAuth) => googleAuth.googleDriveFolders, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'google_auth_id' })
    @AutoMap(() => GoogleAuthEntity)
    googleAuth: Relation<GoogleAuthEntity>;

    @OneToMany(() => GoogleDriveFileEntity, (googleDriveFile) => googleDriveFile.googleDriveFolder)
    @AutoMap(() => [GoogleDriveFileEntity])
    googleDriveFiles?: Relation<GoogleDriveFileEntity[]>;
}
