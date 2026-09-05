import { Body, Controller, Get, HttpCode, HttpStatus, Post, Version } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { Auth, BaseApiOkResponse, User, UUIDParam } from '../../../decorators';
import { DISCOVERY_SESSION_PAGINATION_CONFIG } from '../constants/discovery-session-pagination.config';
import { DiscoverySessionDto } from '../dtos/discovery-session.dto';
import { CreateDiscoverySessionRequestDto } from '../dtos/requests';
import { DiscoverySessionSummaryResponseDto } from '../dtos/responses';
import { DiscoverySessionEntity } from '../entities/discovery-session.entity';
import { DiscoverySessionService } from '../services/discovery-session.service';

@ApiTags('Discovery Sessions')
@Controller('discovery-sessions')
@Auth()
export class DiscoverySessionController extends BaseController<DiscoverySessionEntity, DiscoverySessionDto> {
    constructor(private readonly sessionService: DiscoverySessionService) {
        super(sessionService, DISCOVERY_SESSION_PAGINATION_CONFIG, {
            enableGetAll: true,
            enableGetById: true,
            enablePagination: true,
            enableDelete: true,
            enableDeleteMany: true,
        });
    }

    @ApiOperation({ summary: 'Get session summary metrics' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get(':id/summary')
    @BaseApiOkResponse(DiscoverySessionSummaryResponseDto)
    public async getSummary(@UUIDParam('id') id: string): Promise<DiscoverySessionSummaryResponseDto> {
        return await this.sessionService.getSessionSummary(id);
    }

    @ApiOperation({ summary: 'Create a new discovery session' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post()
    @BaseApiOkResponse(DiscoverySessionDto)
    public async create(@Body() request: CreateDiscoverySessionRequestDto, @User() user: PayloadDto): Promise<DiscoverySessionDto> {
        return await this.sessionService.createSession(request, user);
    }
}
