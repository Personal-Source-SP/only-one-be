import { Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { GOOGLE_DRIVE_FILE_PAGINATION_CONFIG } from '../constants/google-drive-pagination.config';
import { GoogleDriveFileDto } from '../dtos/google-drive-file.dto';
import { GoogleDriveFileEntity } from '../entities/google-drive-file.entity';
import { GoogleFileService } from '../services/google-file.service';

@Controller('google-file')
@ApiTags('Google File')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GoogleFileController extends BaseController<GoogleDriveFileEntity, GoogleDriveFileDto> {
    constructor(private readonly googleFileService: GoogleFileService) {
        super(googleFileService, GOOGLE_DRIVE_FILE_PAGINATION_CONFIG);
    }
}
