import { AutoMap } from '@automapper/classes';
import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { AbstractEntity } from '../../../common/entities';
import { UserEntity } from '../../user/entities/user.entity';

@Entity({ name: 'google_drive_files', synchronize: false })
@Index(['googleDriveId'], { unique: true })
@Index(['userId'])
export class GoogleDriveFileEntity extends AbstractEntity {
    @Column({ name: 'google_drive_id', length: 100 })
    @AutoMap()
    googleDriveId: string;

    @Column({ length: 500 })
    @AutoMap()
    name: string;

    @Column({ length: 100, nullable: true })
    @AutoMap()
    mimeType: string;

    @Column({ type: 'bigint', nullable: true })
    @AutoMap()
    size: number;

    @Column({ length: 1000, nullable: true })
    @AutoMap()
    webViewLink: string;

    @Column({ length: 1000, nullable: true })
    @AutoMap()
    webContentLink: string;

    @Column({ length: 1000, nullable: true })
    @AutoMap()
    thumbnailLink: string;

    @Column({ length: 100, nullable: true })
    @AutoMap()
    parentFolderId: string;

    @Column({ type: 'timestamp', nullable: true })
    @AutoMap()
    lastModified: Date;

    @Column({ type: 'timestamp', nullable: true })
    @AutoMap()
    lastViewedByMe: Date;

    @Column({ default: false })
    @AutoMap()
    isTrashed: boolean;

    @Column({ default: false })
    @AutoMap()
    isStarred: boolean;

    @Column({ length: 36 })
    @AutoMap()
    userId: string;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    @AutoMap()
    user: UserEntity;

    @Column({ type: 'jsonb', nullable: true })
    @AutoMap()
    metadata: Record<string, any>;
}
