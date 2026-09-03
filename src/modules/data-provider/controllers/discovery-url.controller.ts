import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { DISCOVERY_URL_PAGINATION_CONFIG } from '../constants/discovery-url-pagination.config';
import { DiscoveryUrlDto } from '../dtos/discovery-url.dto';
import { DiscoveryValidationLogDto } from '../dtos/discovery-validation-log.dto';
import { IngestDiscoveryUrlResponseDto } from '../dtos/responses';
import { DiscoveryUrlEntity } from '../entities/discovery-url.entity';
import { DiscoveryUrlService } from '../services/discovery-url.service';

@ApiTags('Discovery URLs')
@Controller('discovery-urls')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class DiscoveryUrlController extends BaseController<DiscoveryUrlEntity, DiscoveryUrlDto> {
    constructor(private readonly discoveryUrlService: DiscoveryUrlService) {
        super(discoveryUrlService, DISCOVERY_URL_PAGINATION_CONFIG, {
            enableGetAll: true,
            enableGetById: true,
            enablePagination: true,
            enableDelete: true,
            enableDeleteMany: true,
        });
    }

    @ApiOperation({ summary: 'Batch ingest approved URLs for a discovery session into Item and DataProviderItem catalog' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('sessions/:sessionId/batch-ingest')
    @BaseApiOkResponse(IngestDiscoveryUrlResponseDto)
    public async batchIngestUrls(
        @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
        @Body() request?: { urlIds?: string[] },
    ): Promise<IngestDiscoveryUrlResponseDto> {
        return await this.discoveryUrlService.batchIngest(sessionId, request?.urlIds);
    }

    @ApiOperation({ summary: 'Get validation audit logs for a discovered URL' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get(':id/validation-logs')
    @BaseApiOkResponse(DiscoveryValidationLogDto, { isArray: true })
    public async getValidationLogs(@Param('id', new ParseUUIDPipe()) id: string): Promise<DiscoveryValidationLogDto[]> {
        return await this.discoveryUrlService.getValidationLogsByUrl(id);
    }
}
