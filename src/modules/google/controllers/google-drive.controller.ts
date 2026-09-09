import { Body, Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { PayloadDto } from '../../../common/dto/payload.dto';
import { Auth, Post, Put, User } from '../../../decorators';
import { GoogleDrivePreviewRequest, GoogleDriveSyncRequest } from '../dtos/requests';
import { GoogleDrivePreviewResponse } from '../dtos/responses/google-drive-preview-response.dto';
import { GoogleDriveService } from '../services/google-drive.service';

@Controller('google-drive')
@ApiTags('Google Drive')
@Auth()
export class GoogleDriveController {
    constructor(private readonly googleDriveService: GoogleDriveService) {}

    @Post({
        path: 'preview-data-sync',
        summary: 'Preview data sync',
        responseDto: GoogleDrivePreviewResponse,
    })
    async previewDataSync(@User() user: PayloadDto, @Body() request: GoogleDrivePreviewRequest): Promise<GoogleDrivePreviewResponse> {
        const result = await this.googleDriveService.previewDataSync(user.id, request);
        return result;
    }

    @Put({
        path: 'save-data-sync',
        summary: 'Save data sync',
        responseDto: Boolean,
    })
    async saveDataSync(@User() user: PayloadDto, @Body() request: GoogleDriveSyncRequest): Promise<boolean> {
        const result = await this.googleDriveService.saveDataSync(user.id, request);
        return result;
    }
}
