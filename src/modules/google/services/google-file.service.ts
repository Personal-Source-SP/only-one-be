import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../../common/base.service';
import { GoogleDriveFileDto } from '../dtos/google-drive-file.dto';
import { GoogleDriveFileEntity } from '../entities/google-drive-file.entity';

@Injectable()
export class GoogleFileService extends BaseService<GoogleDriveFileEntity, GoogleDriveFileDto> {
    constructor(
        @InjectMapper() mapper: Mapper,
        @InjectRepository(GoogleDriveFileEntity) googleDriveFileRepository: Repository<GoogleDriveFileEntity>,
    ) {
        super(googleDriveFileRepository, mapper, GoogleDriveFileDto);
    }
}
