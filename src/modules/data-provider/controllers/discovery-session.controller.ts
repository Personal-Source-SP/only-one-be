import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { User } from '../../../decorators/user.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { DISCOVERY_SESSION_PAGINATION_CONFIG } from '../constants/discovery-session-pagination.config';
import { DiscoverySessionDto } from '../dtos/discovery-session.dto';
import { DiscoveryValidationBatchDto } from '../dtos/discovery-validation-batch.dto';
import {
    BatchEnqueueDiscoveryUrlsRequestDto,
    CreateDiscoverySessionRequestDto,
    SubmitBulkUserActionRequestDto,
    TriggerValidationRequestDto,
} from '../dtos/requests';
import { DiscoverySessionEntity } from '../entities/discovery-session.entity';
import { DiscoverySessionService } from '../services/discovery-session.service';
import { DiscoveryUrlService } from '../services/discovery-url.service';
import { DiscoveryValidationService } from '../services/discovery-validation.service';

@ApiTags('Discovery Sessions')
@Controller('discovery-sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class DiscoverySessionController extends BaseController<DiscoverySessionEntity, DiscoverySessionDto> {
    constructor(
        private readonly sessionService: DiscoverySessionService,
        private readonly validationService: DiscoveryValidationService,
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
    public async getSummary(@Param('id', new ParseUUIDPipe()) id: string): Promise<any> {
        return await this.sessionService.getSessionSummary(id);
    }

    @ApiOperation({ summary: 'Trigger batch validation on discovery session URLs' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post(':id/validate')
    @BaseApiOkResponse(DiscoveryValidationBatchDto)
    public async triggerValidation(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() request?: TriggerValidationRequestDto,
    ): Promise<any> {
        return await this.validationService.startBatchValidation(id, request?.targetKeyword);
    }

    @ApiOperation({ summary: 'Get latest validation batch progress' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get(':id/validation-latest-batch')
    @BaseApiOkResponse(DiscoveryValidationBatchDto)
    public async getLatestBatch(@Param('id', new ParseUUIDPipe()) id: string): Promise<any> {
        return await this.validationService.getLatestValidationBatch(id);
    }

    @ApiOperation({ summary: 'Submit bulk user actions for URLs in session' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post(':id/bulk-user-actions')
    @BaseApiOkResponse(Boolean)
    public async submitBulkUserActions(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() request: SubmitBulkUserActionRequestDto,
    ): Promise<boolean> {
        return await this.validationService.submitBulkUserActions(request.urlIds, request.action, request.reason);
    }

    @ApiOperation({ summary: 'Batch enqueue URLs into scraping queue' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post(':id/enqueue-urls')
    public async batchEnqueueUrls(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() request: BatchEnqueueDiscoveryUrlsRequestDto,
    ): Promise<{ enqueuedCount: number }> {
        return await this.discoveryUrlService.batchEnqueue(id, request.urlIds);
    }
}
