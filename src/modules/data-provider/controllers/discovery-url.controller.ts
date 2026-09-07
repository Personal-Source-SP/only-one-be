import { Body, Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { Auth, GetRestApi, PostRestApi, UUIDParam } from '../../../decorators';
import { DISCOVERY_URL_PAGINATION_CONFIG } from '../constants/discovery-url-pagination.config';
import { DiscoveryUrlDto } from '../dtos/discovery-url.dto';
import { DiscoveryValidationLogDto } from '../dtos/discovery-validation-log.dto';
import { IngestDiscoveryUrlResponseDto } from '../dtos/responses';
import { DiscoveryUrlEntity } from '../entities/discovery-url.entity';
import { DiscoveryUrlService } from '../services/discovery-url.service';

@ApiTags('Discovery URLs')
@Controller('discovery-urls')
@Auth()
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

    @GetRestApi({
        path: ':id/validation-logs',
        summary: 'Get validation audit logs for a discovered URL',
        responseDto: DiscoveryValidationLogDto,
        isArray: true,
    })
    async getValidationLogs(@UUIDParam('id') id: string): Promise<DiscoveryValidationLogDto[]> {
        return await this.discoveryUrlService.getValidationLogsByUrl(id);
    }

    @PostRestApi({
        path: 'sessions/:sessionId/batch-ingest',
        summary: 'Batch ingest approved URLs for a discovery session into Item and DataProviderItem catalog',
        responseDto: IngestDiscoveryUrlResponseDto,
    })
    async batchIngestUrls(
        @UUIDParam('sessionId') sessionId: string,
        @Body() request?: { urlIds?: string[] },
    ): Promise<IngestDiscoveryUrlResponseDto> {
        return await this.discoveryUrlService.batchIngest(sessionId, request?.urlIds);
    }
}
