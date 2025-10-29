import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../../common/base.service';
import { GoogleDriveFileTagDto } from '../dtos/google-drive-file-tag.dto';
import { GoogleDriveFileTagEntity } from '../entities/google-drive-file-tag.entity';

@Injectable()
export class GoogleDriveFileTagService extends BaseService<GoogleDriveFileTagEntity, GoogleDriveFileTagDto> {
    constructor(
        @InjectMapper() mapper: Mapper,
        @InjectRepository(GoogleDriveFileTagEntity) googleDriveFileTagRepository: Repository<GoogleDriveFileTagEntity>,
    ) {
        super(googleDriveFileTagRepository, mapper, GoogleDriveFileTagDto);
    }
}
