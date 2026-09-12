import { Body, Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { Auth, Get, Post, User, UUIDParam } from '../../../decorators';
import { DISCOVERY_SESSION_PAGINATION_CONFIG } from '../constants/discovery-session-pagination.config';
import { DiscoverySessionDto } from '../dtos/discovery-session.dto';
import { CreateDiscoverySessionRequestDto, SubmitBulkUserActionRequestDto, TriggerValidationRequestDto } from '../dtos/requests';
import { DiscoverySessionSummaryResponseDto } from '../dtos/responses';
import { DiscoverySessionEntity } from '../entities/discovery-session.entity';
import { DiscoverySessionService } from '../services/discovery-session.service';
import { DiscoveryUrlService } from '../services/discovery-url.service';

@ApiTags('Discovery Sessions')
@Controller('discovery-sessions')
@Auth()
export class DiscoverySessionController extends BaseController<DiscoverySessionEntity, DiscoverySessionDto> {
    constructor(
        private readonly sessionService: DiscoverySessionService,
        private readonly discoveryUrlService: DiscoveryUrlService,
    ) {
        super(sessionService, DISCOVERY_SESSION_PAGINATION_CONFIG, {
            enableGetAll: true,
            enableGetById: true,
            enablePagination: true,
            enableDelete: true,
            enableDeleteMany: true,
        });
    }

    @Get({
        path: ':id/summary',
        summary: 'Get session summary metrics',
        responseDto: DiscoverySessionSummaryResponseDto,
    })
    async getSummary(@UUIDParam('id') id: string): Promise<DiscoverySessionSummaryResponseDto> {
        return await this.sessionService.getSessionSummary(id);
    }

    @Post({
        summary: 'Create a new discovery session',
        responseDto: DiscoverySessionDto,
    })
    async create(@Body() request: CreateDiscoverySessionRequestDto, @User() user: PayloadDto): Promise<DiscoverySessionDto> {
        return await this.sessionService.create(request, user);
    }

    @Post({
        path: ':id/validate',
        summary: 'Trigger validation on discovery session URLs',
        responseDto: DiscoverySessionDto,
    })
    async triggerValidation(@UUIDParam('id') id: string, @Body() request?: TriggerValidationRequestDto): Promise<DiscoverySessionDto> {
        return await this.sessionService.startSessionValidation(id, request?.targetKeyword);
    }

    @Post({
        path: 'bulk-user-actions',
        summary: 'Submit bulk user actions for discovered URLs in a session',
        responseDto: Boolean,
    })
    async submitBulkUserActionsForSession(@Body() request: SubmitBulkUserActionRequestDto): Promise<boolean> {
        return await this.discoveryUrlService.submitBulkUserActions(request.urlIds, request.action, request.reason);
    }
}
