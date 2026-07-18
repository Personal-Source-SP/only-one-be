import { AutoMap } from '@automapper/classes';
import { ApiResponseProperty } from '@nestjs/swagger';

import { AbstractDto } from '../../../common/dto/abstract.dto';
import { GoogleAuthDto } from './google-auth.dto';
import { GoogleDriveFolderDto } from './google-drive-folder.dto';

export class GoogleDriveFileDto extends AbstractDto {
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
    mimeType?: string;

    @ApiResponseProperty()
    @AutoMap()
    size?: number;

    @ApiResponseProperty()
    @AutoMap()
    webViewLink?: string;

    @ApiResponseProperty()
    @AutoMap()
    webContentLink?: string;

    @ApiResponseProperty()
    @AutoMap()
    thumbnailLink?: string;

    @ApiResponseProperty()
    @AutoMap()
    parentFolderId?: string;

    @ApiResponseProperty()
    @AutoMap()
    googleDriveFolderId?: string;

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
    @AutoMap()
    metadata?: Record<string, any>;

    @ApiResponseProperty()
    @AutoMap(() => GoogleDriveFolderDto)
    googleDriveFolder: GoogleDriveFolderDto;
}
