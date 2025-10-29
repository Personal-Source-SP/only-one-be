import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Put, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { GOOGLE_DRIVE_FOLDER_PAGINATION_CONFIG } from '../constants/google-drive-pagination.config';
import { GoogleDriveFolderDto } from '../dtos/google-drive-folder.dto';
import { UpdateGoogleDriveFolderRequest } from '../dtos/requests';
import { GoogleDriveFolderEntity } from '../entities/google-drive-folder.entity';
import { GoogleFolderService } from '../services/google-folder.service';

@Controller('google-folder')
@ApiTags('google-folder')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GoogleFolderController extends BaseController<GoogleDriveFolderEntity, GoogleDriveFolderDto> {
    constructor(private readonly googleFolderService: GoogleFolderService) {
        super(googleFolderService, GOOGLE_DRIVE_FOLDER_PAGINATION_CONFIG);
    }

    @ApiOperation({ summary: 'Update Google folder' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Put(':id')
    @ApiOkResponse({ type: Boolean })
    public async update(@Param('id', new ParseUUIDPipe()) id: string, @Body() request: UpdateGoogleDriveFolderRequest): Promise<boolean> {
        const result = await this.googleFolderService.update(id, request);
        return result;
    }
}
