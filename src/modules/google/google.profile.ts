import { createMap, Mapper, MappingProfile } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';

import { GoogleAuthDto } from './dtos/google-auth.dto';
import { GoogleDriveFolderDto } from './dtos/google-drive-folder.dto';
import { GoogleAuthEntity } from './entities/google-auth.entity';
import { GoogleDriveFolderEntity } from './entities/google-drive-folder.entity';
import { GoogleDriveFileDto } from './dtos/google-drive-file.dto';
import { GoogleDriveFileEntity } from './entities/google-drive-file.entity';

@Injectable()
export class GoogleProfile extends AutomapperProfile {
    constructor(@InjectMapper() mapper: Mapper) {
        super(mapper);
    }

    override get profile(): MappingProfile {
        return (mapper) => {
            this.registerGoogleAuthMappings(mapper);
            this.registerGoogleFolderMappings(mapper);
            this.registerGoogleFileMappings(mapper);
        };
    }

    private registerGoogleAuthMappings(mapper: Mapper): void {
        createMap(mapper, GoogleAuthEntity, GoogleAuthDto);
    }

    private registerGoogleFolderMappings(mapper: Mapper): void {
        createMap(mapper, GoogleDriveFolderEntity, GoogleDriveFolderDto);
    }

    private registerGoogleFileMappings(mapper: Mapper): void {
        createMap(mapper, GoogleDriveFileEntity, GoogleDriveFileDto);
    }
}
