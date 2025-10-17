import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../user/user.module';
import { FileTagController } from './controllers/file-tag.controller';
import { GoogleAuthController } from './controllers/google-auth.controller';
import { GoogleDriveController } from './controllers/google-drive.controller';
import { GoogleFileController } from './controllers/google-file.controller';
import { GoogleFolderController } from './controllers/google-folder.controller';
import { FileTagEntity } from './entities/file-tag.entity';
import { GoogleAuthEntity } from './entities/google-auth.entity';
import { GoogleDriveFileTagEntity } from './entities/google-drive-file-tag.entity';
import { GoogleDriveFileEntity } from './entities/google-drive-file.entity';
import { GoogleDriveFolderEntity } from './entities/google-drive-folder.entity';
import { GoogleProfile } from './google.profile';
import { FileTagService } from './services/file-tag.service';
import { GoogleAuthService } from './services/google-auth.service';
import { GoogleDriveService } from './services/google-drive.service';
import { GoogleFileService } from './services/google-file.service';
import { GoogleFolderService } from './services/google-folder.service';

const services = [GoogleDriveService, FileTagService, GoogleAuthService, GoogleFileService, GoogleFolderService];
const entities = [GoogleDriveFileEntity, GoogleDriveFolderEntity, GoogleDriveFileTagEntity, GoogleAuthEntity, FileTagEntity];
const controllers = [GoogleDriveController, GoogleAuthController, FileTagController, GoogleFileController, GoogleFolderController];

@Module({
    imports: [TypeOrmModule.forFeature(entities), UserModule],
    controllers: [...controllers],
    providers: [...services, GoogleProfile],
    exports: [...services, GoogleProfile],
})
export class GoogleModule {}
