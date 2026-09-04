import { Body, Controller, Get, HttpCode, HttpStatus, Post, Version } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Auth, BaseApiOkResponse, UUIDParam } from '../../../decorators';
import { DiscoveryUrlDto } from '../dtos/discovery-url.dto';
import { DiscoveryValidationBatchDto } from '../dtos/discovery-validation-batch.dto';
import {
    RevalidateUrlRequestDto,
    SubmitBulkUserActionRequestDto,
    SubmitUserActionRequestDto,
    TriggerValidationRequestDto,
} from '../dtos/requests';
import { DiscoveryValidationService } from '../services/discovery-validation.service';

@ApiTags('Discovery Validations')
@Controller('discovery-validations')
@Auth()
export class DiscoveryValidationController {
    constructor(private readonly validationService: DiscoveryValidationService) {}

    @ApiOperation({ summary: 'Trigger batch validation on discovery session URLs' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('sessions/:sessionId/validate')
    @BaseApiOkResponse(DiscoveryValidationBatchDto)
    public async triggerValidation(
        @UUIDParam('sessionId') sessionId: string,
        @Body() request?: TriggerValidationRequestDto,
    ): Promise<DiscoveryValidationBatchDto> {
        return await this.validationService.startBatchValidation(sessionId, request?.targetKeyword);
    }

    @ApiOperation({ summary: 'Get latest validation batch progress for a session' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get('sessions/:sessionId/latest-batch')
    @BaseApiOkResponse(DiscoveryValidationBatchDto)
    public async getLatestBatch(@UUIDParam('sessionId') sessionId: string): Promise<DiscoveryValidationBatchDto> {
        return await this.validationService.getLatestValidationBatch(sessionId);
    }

    @ApiOperation({ summary: 'Submit bulk user actions for discovered URLs' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('bulk-user-actions')
    @BaseApiOkResponse(Boolean)
    public async submitBulkUserActions(@Body() request: SubmitBulkUserActionRequestDto): Promise<boolean> {
        return await this.validationService.submitBulkUserActions(request.urlIds, request.action, request.reason);
    }

    @ApiOperation({ summary: 'Submit user review action for a single discovered URL' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('urls/:id/user-action')
    @BaseApiOkResponse(Boolean)
    public async submitUserAction(@UUIDParam('id') id: string, @Body() request: SubmitUserActionRequestDto): Promise<boolean> {
        return await this.validationService.submitUserAction(id, request.action, request.reason);
    }

    @ApiOperation({ summary: 'Revalidate a single discovered URL' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('urls/:id/re-validate')
    @BaseApiOkResponse(DiscoveryUrlDto)
    public async revalidate(@UUIDParam('id') id: string, @Body() request?: RevalidateUrlRequestDto): Promise<DiscoveryUrlDto> {
        return await this.validationService.revalidateDiscoveredUrl(id, request?.targetKeyword);
    }
}
