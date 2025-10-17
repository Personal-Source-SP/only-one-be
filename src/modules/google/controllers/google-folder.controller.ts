import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Put, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOkPaginatedResponse, ApiPaginationQuery, Paginate, Paginated, PaginatedSwaggerDocs } from 'nestjs-paginate';

import { BaseController } from '../../../common/base.controller';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { User } from '../../../decorators/user.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { GOOGLE_DRIVE_FOLDER_PAGINATION_CONFIG } from '../constants/google-drive-pagination.config';
import { GoogleDriveFolderDto } from '../dtos/google-drive-folder.dto';
import { GoogleDriveFolderPaginationRequestDto, UpdateGoogleDriveFolderRequest } from '../dtos/requests';
import { GoogleFolderService } from '../services/google-folder.service';

@Controller('google-folder')
@ApiTags('google-folder')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GoogleFolderController extends BaseController {
    constructor(private readonly googleFolderService: GoogleFolderService) {
        super();
    }

    @ApiOperation({ summary: 'Get all google drive folders' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get('all')
    @ApiOkResponse({ type: [GoogleDriveFolderDto] })
    public async getAllFolders(@User() user: PayloadDto): Promise<GoogleDriveFolderDto[]> {
        const result = await this.googleFolderService.getAllFolders(user.id);
        return result;
    }

    @ApiOperation({ summary: 'Get google drive folder by id' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get(':id')
    @ApiOkResponse({ type: GoogleDriveFolderDto })
    public async getFolderById(@Param('id', new ParseUUIDPipe()) id: string): Promise<GoogleDriveFolderDto> {
        const result = await this.googleFolderService.getById(id);
        return result;
    }

    @ApiOperation({ summary: 'Get paginated google drive folders' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get()
    @ApiOkPaginatedResponse(GoogleDriveFolderDto, GOOGLE_DRIVE_FOLDER_PAGINATION_CONFIG)
    @PaginatedSwaggerDocs(GoogleDriveFolderDto, GOOGLE_DRIVE_FOLDER_PAGINATION_CONFIG)
    @ApiPaginationQuery(GOOGLE_DRIVE_FOLDER_PAGINATION_CONFIG)
    public async getFoldersPagination(@Paginate() query: GoogleDriveFolderPaginationRequestDto): Promise<Paginated<GoogleDriveFolderDto>> {
        const result = await this.googleFolderService.getFoldersPagination(query, GOOGLE_DRIVE_FOLDER_PAGINATION_CONFIG);
        return result;
    }

    @ApiOperation({ summary: 'Update google drive folder' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Put(':id')
    @ApiOkResponse({ type: Boolean })
    public async updateFolder(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() request: UpdateGoogleDriveFolderRequest,
    ): Promise<boolean> {
        const result = await this.googleFolderService.updateFolder(id, request);
        return result;
    }

    @ApiOperation({ summary: 'Delete google drive folder' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Delete(':id')
    @ApiOkResponse({ type: Boolean })
    public async deleteFolder(@Param('id', new ParseUUIDPipe()) id: string): Promise<boolean> {
        const result = await this.googleFolderService.deleteFolder(id);
        return result;
    }
}
