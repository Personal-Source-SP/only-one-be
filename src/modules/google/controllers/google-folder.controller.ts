import { Body, Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { Auth, PutRestApi, UUIDParam } from '../../../decorators';
import { GOOGLE_DRIVE_FOLDER_PAGINATION_CONFIG } from '../constants/google-drive-pagination.config';
import { GoogleDriveFolderDto } from '../dtos/google-drive-folder.dto';
import { UpdateGoogleDriveFolderRequest } from '../dtos/requests';
import { GoogleDriveFolderEntity } from '../entities/google-drive-folder.entity';
import { GoogleFolderService } from '../services/google-folder.service';

@Controller('google-folder')
@ApiTags('Google Folder')
@Auth()
export class GoogleFolderController extends BaseController<GoogleDriveFolderEntity, GoogleDriveFolderDto> {
    constructor(private readonly googleFolderService: GoogleFolderService) {
        super(googleFolderService, GOOGLE_DRIVE_FOLDER_PAGINATION_CONFIG);
    }

    @PutRestApi({
        path: ':id',
        summary: 'Update Google folder',
        responseDto: Boolean,
    })
    async update(@UUIDParam('id') id: string, @Body() request: UpdateGoogleDriveFolderRequest): Promise<boolean> {
        const result = await this.googleFolderService.update(id, request);
        return result;
    }
}
