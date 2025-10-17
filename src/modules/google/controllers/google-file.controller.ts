import { Controller, Get, HttpCode, HttpStatus, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOkPaginatedResponse, ApiPaginationQuery, Paginate, Paginated, PaginatedSwaggerDocs } from 'nestjs-paginate';

import { BaseController } from '../../../common/base.controller';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { GOOGLE_DRIVE_FILE_PAGINATION_CONFIG } from '../constants/google-drive-pagination.config';
import { GoogleDriveFileDto } from '../dtos/google-drive-file.dto';
import { GoogleDriveFilePaginationRequestDto } from '../dtos/requests';
import { GoogleFileService } from '../services/google-file.service';

@Controller('google-file')
@ApiTags('google-file')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GoogleFileController extends BaseController {
    constructor(private readonly googleFileService: GoogleFileService) {
        super();
    }

    @ApiOperation({ summary: 'Get paginated google drive files' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get()
    @ApiOkPaginatedResponse(GoogleDriveFileDto, GOOGLE_DRIVE_FILE_PAGINATION_CONFIG)
    @PaginatedSwaggerDocs(GoogleDriveFileDto, GOOGLE_DRIVE_FILE_PAGINATION_CONFIG)
    @ApiPaginationQuery(GOOGLE_DRIVE_FILE_PAGINATION_CONFIG)
    public async getFilesPagination(@Paginate() query: GoogleDriveFilePaginationRequestDto): Promise<Paginated<GoogleDriveFileDto>> {
        const result = await this.googleFileService.getFilesPagination(query, GOOGLE_DRIVE_FILE_PAGINATION_CONFIG);
        return result;
    }
}
