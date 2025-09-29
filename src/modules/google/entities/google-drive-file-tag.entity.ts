import { AutoMap } from '@automapper/classes';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { AbstractEntity } from '../../../common/entities';
import { FileTagEntity } from './file-tag.entity';
import { GoogleDriveFileEntity } from './google-drive-file.entity';

@Entity({ name: 'google_drive_file_tags', synchronize: false })
@Unique(['googleDriveFileId', 'fileTagId'])
export class GoogleDriveFileTagEntity extends AbstractEntity {
    @Column({ type: 'uuid' })
    @AutoMap()
    googleDriveFileId: string;

    @Column({ type: 'uuid' })
    @AutoMap()
    fileTagId: string;

    @ManyToOne(() => GoogleDriveFileEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'google_drive_file_id' })
    @AutoMap(() => GoogleDriveFileEntity)
    googleDriveFile: GoogleDriveFileEntity;

    @ManyToOne(() => FileTagEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'file_tag_id' })
    @AutoMap(() => FileTagEntity)
    fileTag: FileTagEntity;
}
