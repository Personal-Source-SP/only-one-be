import { Body, Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { Auth, Get, Post, UUIDParam } from '../../../decorators';
import { DISCOVERY_URL_PAGINATION_CONFIG } from '../constants/discovery-url-pagination.config';
import { DiscoveryUrlDto } from '../dtos/discovery-url.dto';
import { DiscoveryValidationLogDto } from '../dtos/discovery-validation-log.dto';
import {
    RevalidateUrlRequestDto,
    SubmitBulkUserActionRequestDto,
    SubmitUserActionRequestDto,
} from '../dtos/requests';
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

    @Get({
        path: ':id/validation-logs',
        summary: 'Get validation audit logs for a discovered URL',
        responseDto: [DiscoveryValidationLogDto],
    })
    async getValidationLogs(@UUIDParam('id') id: string): Promise<DiscoveryValidationLogDto[]> {
        return await this.discoveryUrlService.getValidationLogsByUrl(id);
    }

    @Post({
        path: ':id/user-action',
        summary: 'Submit user review action for a single discovered URL',
        responseDto: Boolean,
    })
    async submitUserAction(@UUIDParam('id') id: string, @Body() request: SubmitUserActionRequestDto): Promise<boolean> {
        return await this.discoveryUrlService.submitUserAction(id, request.action, request.reason);
    }

    @Post({
        path: ':id/re-validate',
        summary: 'Revalidate a single discovered URL',
        responseDto: DiscoveryUrlDto,
    })
    async revalidate(@UUIDParam('id') id: string, @Body() request?: RevalidateUrlRequestDto): Promise<DiscoveryUrlDto> {
        return await this.discoveryUrlService.revalidateDiscoveredUrl(id, request?.targetKeyword);
    }

    @Post({
        path: 'bulk-user-actions',
        summary: 'Submit bulk user actions for discovered URLs',
        responseDto: Boolean,
    })
    async submitBulkUserActions(@Body() request: SubmitBulkUserActionRequestDto): Promise<boolean> {
        return await this.discoveryUrlService.submitBulkUserActions(request.urlIds, request.action, request.reason);
    }

    @Post({
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
