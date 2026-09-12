import { Body, Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { Auth, Get, Post, User, UUIDParam } from '../../../decorators';
import { DISCOVERY_SESSION_PAGINATION_CONFIG } from '../constants/discovery-session-pagination.config';
import { DiscoverySessionDto } from '../dtos/discovery-session.dto';
import { CreateDiscoverySessionRequestDto, TriggerValidationRequestDto } from '../dtos/requests';
import { DiscoverySessionSummaryResponseDto } from '../dtos/responses';
import { DiscoverySessionEntity } from '../entities/discovery-session.entity';
import { DiscoverySessionService } from '../services/discovery-session.service';

@ApiTags('Discovery Sessions')
@Controller('discovery-sessions')
@Auth()
export class DiscoverySessionController extends BaseController<DiscoverySessionEntity, DiscoverySessionDto> {
    constructor(private readonly discoverySessionService: DiscoverySessionService) {
        super(discoverySessionService, DISCOVERY_SESSION_PAGINATION_CONFIG, {
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
        return await this.discoverySessionService.getSessionSummary(id);
    }

    @Post({
        summary: 'Create a new discovery session',
        responseDto: DiscoverySessionDto,
    })
    async create(@Body() request: CreateDiscoverySessionRequestDto, @User() user: PayloadDto): Promise<DiscoverySessionDto> {
        return await this.discoverySessionService.create(request, user);
    }

    @Post({
        path: ':id/validate',
        summary: 'Trigger validation on discovery session URLs',
        responseDto: DiscoverySessionDto,
    })
    async triggerValidation(@UUIDParam('id') id: string, @Body() request?: TriggerValidationRequestDto): Promise<DiscoverySessionDto> {
        return await this.discoverySessionService.startSessionValidation(id, request?.targetKeyword);
    }
}
