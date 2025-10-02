import { AutoMap } from '@automapper/classes';
import { ApiResponseProperty } from '@nestjs/swagger';
import { AbstractDto } from '../../../common/dto/abstract.dto';
import { GoogleDriveFileTagDto } from './google-drive-file-tag.dto';

export class FileTagDto extends AbstractDto {
    @ApiResponseProperty()
    @AutoMap()
    name: string;

    @ApiResponseProperty()
    @AutoMap(() => [GoogleDriveFileTagDto])
    fileTags?: GoogleDriveFileTagDto[];
}
