import { AutoMap } from '@automapper/classes';
import { Column, Entity, OneToMany, Relation, Unique } from 'typeorm';

import { AbstractEntity } from '../../../common/entities';
import { GoogleDriveFileTagEntity } from './google-drive-file-tag.entity';

@Entity({ name: 'file_tags', synchronize: false })
@Unique(['name'])
export class FileTagEntity extends AbstractEntity {
    @Column({ length: 100 })
    @AutoMap()
    name: string;

    @OneToMany(() => GoogleDriveFileTagEntity, (fileTag) => fileTag.fileTag)
    @AutoMap(() => [GoogleDriveFileTagEntity])
    fileTags?: Relation<GoogleDriveFileTagEntity[]>;
}
