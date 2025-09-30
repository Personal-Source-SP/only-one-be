import { AutoMap } from '@automapper/classes';
import { ApiResponseProperty } from '@nestjs/swagger';
import { AbstractDto } from '../../../common/dto/abstract.dto';
import { GoogleDriveFileTagEntity } from '../entities/google-drive-file-tag.entity';

export class FileTagDto extends AbstractDto {
    @ApiResponseProperty()
    @AutoMap()
    name: string;

    @ApiResponseProperty()
    @AutoMap(() => [GoogleDriveFileTagEntity])
    fileTags?: GoogleDriveFileTagEntity[];
}
