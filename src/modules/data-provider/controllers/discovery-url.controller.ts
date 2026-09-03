import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { DISCOVERY_URL_PAGINATION_CONFIG } from '../constants/discovery-url-pagination.config';
import { DiscoveryUrlDto } from '../dtos/discovery-url.dto';
import { DiscoveryValidationLogDto } from '../dtos/discovery-validation-log.dto';
import { RevalidateUrlRequestDto, SubmitUserActionRequestDto } from '../dtos/requests';
import { DiscoveryUrlEntity } from '../entities/discovery-url.entity';
import { DiscoveryUrlService } from '../services/discovery-url.service';
import { DiscoveryValidationService } from '../services/discovery-validation.service';

@ApiTags('Discovery URLs')
@Controller('discovery-urls')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class DiscoveryUrlController extends BaseController<DiscoveryUrlEntity, DiscoveryUrlDto> {
    constructor(
        private readonly discoveryUrlService: DiscoveryUrlService,
        private readonly validationService: DiscoveryValidationService,
    ) {
        super(discoveryUrlService, DISCOVERY_URL_PAGINATION_CONFIG, {
            enableGetAll: true,
            enableGetById: true,
            enablePagination: true,
            enableDelete: true,
            enableDeleteMany: true,
        });
    }

    @ApiOperation({ summary: 'Submit user review action for a single discovered URL' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post(':id/user-action')
    @BaseApiOkResponse(Boolean)
    public async submitUserAction(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() request: SubmitUserActionRequestDto,
    ): Promise<boolean> {
        return await this.validationService.submitUserAction(id, request.action, request.reason);
    }

    @ApiOperation({ summary: 'Revalidate a single discovered URL' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post(':id/re-validate')
    @BaseApiOkResponse(DiscoveryUrlDto)
    public async revalidate(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() request?: RevalidateUrlRequestDto,
    ): Promise<DiscoveryUrlDto> {
        return await this.validationService.revalidateDiscoveredUrl(id, request?.targetKeyword);
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
