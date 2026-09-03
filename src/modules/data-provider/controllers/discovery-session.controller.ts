import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { User } from '../../../decorators/user.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { DISCOVERY_SESSION_PAGINATION_CONFIG } from '../constants/discovery-session-pagination.config';
import { DiscoverySessionDto } from '../dtos/discovery-session.dto';
import { CreateDiscoverySessionRequestDto } from '../dtos/requests';
import { DiscoverySessionSummaryResponseDto } from '../dtos/responses';
import { DiscoverySessionEntity } from '../entities/discovery-session.entity';
import { DiscoverySessionService } from '../services/discovery-session.service';

@ApiTags('Discovery Sessions')
@Controller('discovery-sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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

    @ApiOperation({ summary: 'Create a new discovery session' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post()
    @BaseApiOkResponse(DiscoverySessionDto)
    public async create(@Body() request: CreateDiscoverySessionRequestDto, @User() user: PayloadDto): Promise<DiscoverySessionDto> {
        return await this.sessionService.createSession(request, user);
    }

    @ApiOperation({ summary: 'Get session summary metrics' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get(':id/summary')
    @BaseApiOkResponse(DiscoverySessionSummaryResponseDto)
    public async getSummary(@Param('id', new ParseUUIDPipe()) id: string): Promise<DiscoverySessionSummaryResponseDto> {
        return await this.sessionService.getSessionSummary(id);
    }
}
