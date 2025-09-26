import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoogleDriveController } from './controllers/google-drive.controller';
import { GoogleAuthEntity } from './entities/google-auth.entity';
import { GoogleDriveFileEntity } from './entities/google-drive-file.entity';
import { GoogleProfile } from './google.profile';
import { GoogleAuthService } from './services/google-auth.service';
import { GoogleDriveService } from './services/google-drive.service';

const controllers = [GoogleDriveController];
const services = [GoogleDriveService, GoogleAuthService];
const entities = [GoogleDriveFileEntity, GoogleAuthEntity];

@Module({
    imports: [TypeOrmModule.forFeature(entities)],
    controllers: [...controllers],
    providers: [...services, GoogleProfile],
    exports: [...services, GoogleProfile],
})
export class GoogleModule {}
