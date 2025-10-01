import { GoogleDriveFolderDto } from './google-drive-folder.dto';
import { AutoMap } from '@automapper/classes';
import { ApiResponseProperty } from '@nestjs/swagger';
import { AbstractDto } from '../../../common/dto/abstract.dto';
import { UserDto } from '../../user/dtos/user.dto';
import { GoogleDriveFileDto } from './google-drive-file.dto';

export class GoogleAuthDto extends AbstractDto {
    @ApiResponseProperty()
    @AutoMap()
    userId: string;

    @ApiResponseProperty()
    @AutoMap()
    googleAccessToken: string;

    @ApiResponseProperty()
    @AutoMap()
    googleExpiresAt: Date;

    @ApiResponseProperty()
    @AutoMap()
    isActive: boolean;

    @ApiResponseProperty()
    @AutoMap()
    googleRefreshToken?: string;

    @ApiResponseProperty()
    @AutoMap()
    googleScope?: string;

    @ApiResponseProperty()
    @AutoMap()
    googleTokenType?: string;

    @ApiResponseProperty()
    @AutoMap(() => UserDto)
    user: UserDto;

    @ApiResponseProperty()
    @AutoMap(() => [GoogleDriveFileDto])
    googleDriveFiles?: GoogleDriveFileDto[];

    @ApiResponseProperty()
    @AutoMap(() => [GoogleDriveFolderDto])
    googleDriveFolders?: GoogleDriveFolderDto[];
}
