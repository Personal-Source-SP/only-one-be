import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoogleAuthController } from './controllers/google-auth.controller';
import { GoogleDriveController } from './controllers/google-drive.controller';
import { GoogleAuthEntity } from './entities/google-auth.entity';
import { GoogleDriveFileEntity } from './entities/google-drive-file.entity';
import { GoogleDriveFolderEntity } from './entities/google-drive-folder.entity';
import { GoogleProfile } from './google.profile';
import { GoogleAuthService } from './services/google-auth.service';
import { GoogleDriveService } from './services/google-drive.service';

const services = [GoogleDriveService, GoogleAuthService];
const controllers = [GoogleDriveController, GoogleAuthController];
const entities = [GoogleDriveFileEntity, GoogleDriveFolderEntity, GoogleAuthEntity];

@Module({
    imports: [TypeOrmModule.forFeature(entities)],
    controllers: [...controllers],
    providers: [...services, GoogleProfile],
    exports: [...services, GoogleProfile],
})
export class GoogleModule {}
