import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../../common/base.service';
import { LoggerService } from '../../../shared/services/logger.service';
import { GoogleDriveFolderDto } from '../dtos/google-drive-folder.dto';
import { GoogleDriveFolderEntity } from '../entities/google-drive-folder.entity';
import { GoogleAuthService } from './google-auth.service';

@Injectable()
export class GoogleFolderService extends BaseService<GoogleDriveFolderEntity, GoogleDriveFolderDto> {
    constructor(
        private readonly loggerService: LoggerService,
        private readonly googleAuthService: GoogleAuthService,
        @InjectMapper() mapper: Mapper,
        @InjectRepository(GoogleDriveFolderEntity) googleDriveFolderRepository: Repository<GoogleDriveFolderEntity>,
    ) {
        super(googleDriveFolderRepository, mapper);
    }

    async findAllByUserId(userId: string): Promise<GoogleDriveFolderDto[]> {
        const googleAuth = await this.googleAuthService.findOneByFilter({ userId });
        if (!googleAuth) {
            this.loggerService.error(`No Google auth found for user ${userId}`);
            return [];
        }

        return await super.findListByFilter({ googleAuthId: googleAuth.id });
    }
}
