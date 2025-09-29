import { AutoMap } from '@automapper/classes';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity } from '../../../common/entities';
import { GoogleAuthEntity } from './google-auth.entity';

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

    @ManyToOne(() => GoogleAuthEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'google_auth_id' })
    @AutoMap(() => GoogleAuthEntity)
    googleAuth: GoogleAuthEntity;
}
