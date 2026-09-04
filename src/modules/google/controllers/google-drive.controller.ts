import { Body, Controller, HttpCode, HttpStatus, Post, Put, Version } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PayloadDto } from '../../../common/dto/payload.dto';
import { Auth, User } from '../../../decorators';
import { GoogleDrivePreviewRequest, GoogleDriveSyncRequest } from '../dtos/requests';
import { GoogleDrivePreviewResponse } from '../dtos/responses/google-drive-preview-response.dto';
import { GoogleDriveService } from '../services/google-drive.service';

@Controller('google-drive')
@ApiTags('Google Drive')
@Auth()
export class GoogleDriveController {
    constructor(private readonly googleDriveService: GoogleDriveService) {}

    @ApiOperation({ summary: 'Preview data sync' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('preview-data-sync')
    @ApiOkResponse({ type: GoogleDrivePreviewResponse })
    public async previewDataSync(
        @User() user: PayloadDto,
        @Body() request: GoogleDrivePreviewRequest,
    ): Promise<GoogleDrivePreviewResponse> {
        const result = await this.googleDriveService.previewDataSync(user.id, request);
        return result;
    }

    @ApiOperation({ summary: 'Save data sync' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Put('save-data-sync')
    @ApiOkResponse({ type: Boolean })
    public async saveDataSync(@User() user: PayloadDto, @Body() request: GoogleDriveSyncRequest): Promise<boolean> {
        const result = await this.googleDriveService.saveDataSync(user.id, request);
        return result;
    }
}
