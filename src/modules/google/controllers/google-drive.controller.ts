import { Body, Controller, Get, HttpCode, HttpStatus, Post, Put, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOkPaginatedResponse, ApiPaginationQuery, Paginate, Paginated, PaginatedSwaggerDocs } from 'nestjs-paginate';

import { BaseController } from '../../../common/base.controller';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { User } from '../../../decorators/user.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { GOOGLE_DRIVE_FILE_PAGINATION_CONFIG, GOOGLE_DRIVE_FOLDER_PAGINATION_CONFIG } from '../constants/google-drive-pagination.config';
import { GoogleDriveFileDto } from '../dtos/google-drive-file.dto';
import { GoogleDriveFolderDto } from '../dtos/google-drive-folder.dto';
import {
    GoogleDriveFilePaginationRequestDto,
    GoogleDriveFolderPaginationRequestDto,
    GoogleDrivePreviewRequest,
    GoogleDriveSyncRequest,
} from '../dtos/requests';
import { GoogleDrivePreviewResponse } from '../dtos/responses/google-drive-preview-response.dto';
import { GoogleDriveService } from '../services/google-drive.service';

@Controller('google-drive')
@ApiTags('google-drive')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GoogleDriveController extends BaseController {
    constructor(private readonly googleDriveService: GoogleDriveService) {
        super();
    }

    @ApiOperation({ summary: 'Get paginated google drive files' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get('files')
    @ApiOkPaginatedResponse(GoogleDriveFileDto, GOOGLE_DRIVE_FILE_PAGINATION_CONFIG)
    @PaginatedSwaggerDocs(GoogleDriveFileDto, GOOGLE_DRIVE_FILE_PAGINATION_CONFIG)
    @ApiPaginationQuery(GOOGLE_DRIVE_FILE_PAGINATION_CONFIG)
    public async getFilesPagination(@Paginate() query: GoogleDriveFilePaginationRequestDto): Promise<Paginated<GoogleDriveFileDto>> {
        const result = await this.googleDriveService.getFilesPagination(query, GOOGLE_DRIVE_FILE_PAGINATION_CONFIG);
        return result;
    }

    @ApiOperation({ summary: 'Get paginated google drive folders' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get('folders')
    @ApiOkPaginatedResponse(GoogleDriveFolderDto, GOOGLE_DRIVE_FOLDER_PAGINATION_CONFIG)
    @PaginatedSwaggerDocs(GoogleDriveFolderDto, GOOGLE_DRIVE_FOLDER_PAGINATION_CONFIG)
    @ApiPaginationQuery(GOOGLE_DRIVE_FOLDER_PAGINATION_CONFIG)
    public async getFoldersPagination(@Paginate() query: GoogleDriveFolderPaginationRequestDto): Promise<Paginated<GoogleDriveFolderDto>> {
        const result = await this.googleDriveService.getFoldersPagination(query, GOOGLE_DRIVE_FOLDER_PAGINATION_CONFIG);
        return result;
    }

    @ApiOperation({ summary: 'Get all google drive folders' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get('folders/all')
    @ApiOkResponse({ type: [GoogleDriveFolderDto] })
    public async getAllFolders(@User() user: PayloadDto): Promise<GoogleDriveFolderDto[]> {
        const result = await this.googleDriveService.getAllFolders(user.id);
        return result;
    }

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
