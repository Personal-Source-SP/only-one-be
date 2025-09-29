import { createMap, Mapper, MappingProfile } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';

import { GoogleAuthDto } from './dtos/google-auth.dto';
import { GoogleDriveFolderDto } from './dtos/google-drive-folder.dto';
import { GoogleAuthEntity } from './entities/google-auth.entity';
import { GoogleDriveFolderEntity } from './entities/google-drive-folder.entity';
import { GoogleDriveFileDto } from './dtos/google-drive-file.dto';
import { GoogleDriveFileEntity } from './entities/google-drive-file.entity';
import { GoogleDriveFileTagEntity } from './entities/google-drive-file-tag.entity';
import { GoogleDriveFileTagDto } from './dtos/google-drive-file-tag.dto';
import { FileTagEntity } from './entities/file-tag.entity';
import { FileTagDto } from './dtos/file-tag.dto';

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
            this.registerGoogleFileTagMappings(mapper);
            this.registerFileTagMappings(mapper);
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

    private registerGoogleFileTagMappings(mapper: Mapper): void {
        createMap(mapper, GoogleDriveFileTagEntity, GoogleDriveFileTagDto);
    }

    private registerFileTagMappings(mapper: Mapper): void {
        createMap(mapper, FileTagEntity, FileTagDto);
    }
}
