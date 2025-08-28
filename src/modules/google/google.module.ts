import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from 'src/shared/shared.module';
import { GoogleDriveController } from './controllers/google-drive.controller';
import { GoogleDriveFileEntity } from './entities/google-drive-file.entity';
import { GoogleDriveTokenEntity } from './entities/google-drive-token.entity';
import { GoogleDriveService } from './services/google-drive.service';

@Module({
    imports: [TypeOrmModule.forFeature([GoogleDriveFileEntity, GoogleDriveTokenEntity]), SharedModule],
    controllers: [GoogleDriveController],
    providers: [GoogleDriveService],
    exports: [GoogleDriveService],
})
export class GoogleModule {}
