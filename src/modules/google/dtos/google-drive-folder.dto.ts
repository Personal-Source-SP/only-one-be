import { AutoMap } from '@automapper/classes';
import { ApiResponseProperty } from '@nestjs/swagger';
import { AbstractDto } from '../../../common/dto/abstract.dto';
import { GoogleAuthDto } from './google-auth.dto';

export class GoogleDriveFolderDto extends AbstractDto {
    @ApiResponseProperty()
    @AutoMap()
    googleAuthId: string;

    @ApiResponseProperty()
    @AutoMap()
    googleDriveId: string;

    @ApiResponseProperty()
    @AutoMap()
    name: string;

    @ApiResponseProperty()
    @AutoMap()
    parentFolderId?: string;

    @ApiResponseProperty()
    @AutoMap()
    lastModified?: Date;

    @ApiResponseProperty()
    @AutoMap()
    isTrashed?: boolean;

    @ApiResponseProperty()
    @AutoMap()
    isStarred?: boolean;

    @ApiResponseProperty()
    @AutoMap(() => GoogleAuthDto)
    googleAuth: GoogleAuthDto;
}
