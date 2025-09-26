import { AutoMap } from '@automapper/classes';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractEntity } from '../../../common/entities';
import { GoogleAuthEntity } from './google-auth.entity';

@Entity({ name: 'google_drive_files', synchronize: false })
export class GoogleDriveFileEntity extends AbstractEntity {
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
    mimeType?: string;

    @Column({ type: 'bigint', nullable: true })
    @AutoMap()
    size?: number;

    @Column({ length: 1000, nullable: true })
    @AutoMap()
    webViewLink?: string;

    @Column({ length: 1000, nullable: true })
    @AutoMap()
    webContentLink?: string;

    @Column({ length: 1000, nullable: true })
    @AutoMap()
    thumbnailLink?: string;

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

    @Column({ type: 'jsonb', nullable: true })
    @AutoMap()
    metadata?: Record<string, any>;

    @ManyToOne(() => GoogleAuthEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'google_auth_id' })
    @AutoMap(() => GoogleAuthEntity)
    googleAuth: GoogleAuthEntity;
}
