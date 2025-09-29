import { AutoMap } from '@automapper/classes';
import { AbstractDto } from '../../../common/dto/abstract.dto';
import { FileTagDto } from './file-tag.dto';
import { GoogleDriveFileDto } from './google-drive-file.dto';

export class GoogleDriveFileTagDto extends AbstractDto {
    @AutoMap()
    googleDriveFileId: string;

    @AutoMap()
    fileTagId: string;

    @AutoMap(() => GoogleDriveFileDto)
    googleDriveFile: GoogleDriveFileDto;

    @AutoMap(() => FileTagDto)
    fileTag: FileTagDto;
}
