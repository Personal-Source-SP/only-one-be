import { Controller, Post, Get, Delete, Body, Query, Param, UseGuards, Request, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { GoogleDriveService } from '../services/google-drive.service';
import { AuthorizeRequestDto } from '../dtos/requests/authorize.request.dto';
import { SyncFilesRequestDto } from '../dtos/requests/sync-files.request.dto';
import { GetFilesRequestDto } from '../dtos/requests/get-files.request.dto';
import { GoogleDriveFileEntity } from '../entities/google-drive-file.entity';
import { GoogleDriveFileResponseDto } from '../dtos/responses/google-drive-file.response.dto';
import { SyncResultResponseDto } from '../dtos/responses/sync-result.response.dto';
import { GoogleDriveStatusResponseDto } from '../dtos/responses/google-drive-status.response.dto';
import { PaginatedFilesResponseDto } from '../dtos/responses/paginated-files.response.dto';
import { BaseResponseDto } from '../../../common/dto/base-response.dto';

@ApiTags('Google Drive')
@Controller('google-drive')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GoogleDriveController {
    constructor(private readonly googleDriveService: GoogleDriveService) {}

    @Post('authorize')
    @ApiOperation({ summary: 'Authorize Google Drive access' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Successfully authorized Google Drive access',
        type: BaseResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid authorization code',
    })
    async authorize(@Request() req, @Body() authorizeDto: AuthorizeRequestDto): Promise<BaseResponseDto> {
        await this.googleDriveService.authorizeUser(req.user.id, authorizeDto.code, authorizeDto.redirectUri);

        return {
            success: true,
            message: 'Google Drive access authorized successfully',
        };
    }

    @Post('sync')
    @ApiOperation({ summary: 'Sync files from Google Drive' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Files synced successfully',
        type: SyncResultResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'No Google Drive token found',
    })
    async syncFiles(@Request() req, @Body() syncDto: SyncFilesRequestDto): Promise<SyncResultResponseDto> {
        return await this.googleDriveService.syncFiles(req.user.id, syncDto);
    }

    @Get('files')
    @ApiOperation({ summary: 'Get user files from database' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'mimeType', required: false, type: String })
    @ApiQuery({ name: 'starredOnly', required: false, type: Boolean })
    @ApiQuery({ name: 'trashedOnly', required: false, type: Boolean })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Files retrieved successfully',
        type: PaginatedFilesResponseDto,
    })
    async getUserFiles(@Request() req, @Query() query: GetFilesRequestDto): Promise<PaginatedFilesResponseDto> {
        const filters = {
            mimeType: query.mimeType,
            starredOnly: query.starredOnly,
            trashedOnly: query.trashedOnly,
        };

        return await this.googleDriveService.getUserFiles(req.user.id, query.page, query.limit, filters);
    }

    @Get('status')
    @ApiOperation({ summary: 'Get Google Drive connection status' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Status retrieved successfully',
        type: GoogleDriveStatusResponseDto,
    })
    async getGoogleDriveStatus(@Request() req): Promise<GoogleDriveStatusResponseDto> {
        return await this.googleDriveService.getGoogleDriveStatus(req.user.id);
    }

    @Get('files/:id')
    @ApiOperation({ summary: 'Get specific file by ID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'File retrieved successfully',
        type: GoogleDriveFileResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'File not found',
    })
    async getFileById(@Request() req, @Param('id') fileId: string): Promise<GoogleDriveFileResponseDto> {
        return await this.googleDriveService.getFileById(req.user.id, fileId);
    }

    @Delete('revoke')
    @ApiOperation({ summary: 'Revoke Google Drive access' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Access revoked successfully',
        type: BaseResponseDto,
    })
    async revokeAccess(@Request() req): Promise<BaseResponseDto> {
        await this.googleDriveService.revokeAccess(req.user.id);

        return {
            success: true,
            message: 'Google Drive access revoked successfully',
        };
    }

    @Post('refresh-token')
    @ApiOperation({ summary: 'Refresh Google Drive access token' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Token refreshed successfully',
        type: BaseResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'No refresh token found',
    })
    async refreshToken(@Request() req): Promise<BaseResponseDto> {
        await this.googleDriveService.refreshToken(req.user.id);

        return {
            success: true,
            message: 'Token refreshed successfully',
        };
    }
}
