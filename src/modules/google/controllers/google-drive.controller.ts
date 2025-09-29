import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOkPaginatedResponse, ApiPaginationQuery, Paginate, Paginated, PaginatedSwaggerDocs } from 'nestjs-paginate';

import { BaseController } from '../../../common/base.controller';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { User } from '../../../decorators/user.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { GOOGLE_DRIVE_FILE_PAGINATION_CONFIG } from '../constants/google-drive-pagination.config';
import { GoogleDriveFileDto } from '../dtos/google-drive-file.dto';
import { GoogleDriveFilePaginationRequestDto } from '../dtos/requests';
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
    @Get()
    @ApiOkPaginatedResponse(GoogleDriveFileDto, GOOGLE_DRIVE_FILE_PAGINATION_CONFIG)
    @PaginatedSwaggerDocs(GoogleDriveFileDto, GOOGLE_DRIVE_FILE_PAGINATION_CONFIG)
    @ApiPaginationQuery(GOOGLE_DRIVE_FILE_PAGINATION_CONFIG)
    public async getCountriesPagination(@Paginate() query: GoogleDriveFilePaginationRequestDto): Promise<Paginated<GoogleDriveFileDto>> {
        const result = await this.googleDriveService.getUserFilesPagination(query, GOOGLE_DRIVE_FILE_PAGINATION_CONFIG);
        return result;
    }

    @ApiOperation({ summary: 'Sync files from google drive' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('sync-files')
    @ApiOkResponse({ type: Boolean })
    public async syncFilesFromGoogleDrive(@User() user: PayloadDto): Promise<boolean> {
        const result = await this.googleDriveService.syncFilesFromGoogleDrive(user.id);
        return result;
    }
}
