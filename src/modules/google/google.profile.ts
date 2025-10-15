import { createMap, Mapper, MappingProfile } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';

import { FileTagDto } from './dtos/file-tag.dto';
import { GoogleAuthDto } from './dtos/google-auth.dto';
import { GoogleDriveFileTagDto } from './dtos/google-drive-file-tag.dto';
import { GoogleDriveFileDto } from './dtos/google-drive-file.dto';
import { GoogleDriveFolderDto } from './dtos/google-drive-folder.dto';
import { GoogleDrivePreviewItem } from './dtos/responses/google-drive-preview-response.dto';
import { FileTagEntity } from './entities/file-tag.entity';
import { GoogleAuthEntity } from './entities/google-auth.entity';
import { GoogleDriveFileTagEntity } from './entities/google-drive-file-tag.entity';
import { GoogleDriveFileEntity } from './entities/google-drive-file.entity';
import { GoogleDriveFolderEntity } from './entities/google-drive-folder.entity';

@Injectable()
export class GoogleProfile extends AutomapperProfile {
    constructor(@InjectMapper() mapper: Mapper) {
        super(mapper);
    }

    override get profile(): MappingProfile {
        return (mapper) => {
            createMap(mapper, GoogleAuthEntity, GoogleAuthDto);
            createMap(mapper, GoogleDriveFolderEntity, GoogleDriveFolderDto);
            createMap(mapper, GoogleDriveFileEntity, GoogleDriveFileDto);
            createMap(mapper, GoogleDriveFileTagEntity, GoogleDriveFileTagDto);
            createMap(mapper, FileTagEntity, FileTagDto);

            createMap(mapper, GoogleDrivePreviewItem, GoogleDriveFileEntity);
            createMap(mapper, GoogleDrivePreviewItem, GoogleDriveFolderEntity);
        };
    }
}
