import { Body, Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Auth, Get, Post, UUIDParam } from '../../../decorators';
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

    @Get({
        path: 'sessions/:sessionId/latest-batch',
        summary: 'Get latest validation batch progress for a session',
        responseDto: DiscoveryValidationBatchDto,
    })
    async getLatestBatch(@UUIDParam('sessionId') sessionId: string): Promise<DiscoveryValidationBatchDto> {
        return await this.validationService.getLatestValidationBatch(sessionId);
    }

    @Post({
        path: 'sessions/:sessionId/validate',
        summary: 'Trigger batch validation on discovery session URLs',
        responseDto: DiscoveryValidationBatchDto,
    })
    async triggerValidation(
        @UUIDParam('sessionId') sessionId: string,
        @Body() request?: TriggerValidationRequestDto,
    ): Promise<DiscoveryValidationBatchDto> {
        return await this.validationService.startBatchValidation(sessionId, request?.targetKeyword);
    }

    @Post({
        path: 'bulk-user-actions',
        summary: 'Submit bulk user actions for discovered URLs',
        responseDto: Boolean,
    })
    async submitBulkUserActions(@Body() request: SubmitBulkUserActionRequestDto): Promise<boolean> {
        return await this.validationService.submitBulkUserActions(request.urlIds, request.action, request.reason);
    }

    @Post({
        path: 'urls/:id/user-action',
        summary: 'Submit user review action for a single discovered URL',
        responseDto: Boolean,
    })
    async submitUserAction(@UUIDParam('id') id: string, @Body() request: SubmitUserActionRequestDto): Promise<boolean> {
        return await this.validationService.submitUserAction(id, request.action, request.reason);
    }

    @Post({
        path: 'urls/:id/re-validate',
        summary: 'Revalidate a single discovered URL',
        responseDto: DiscoveryUrlDto,
    })
    async revalidate(@UUIDParam('id') id: string, @Body() request?: RevalidateUrlRequestDto): Promise<DiscoveryUrlDto> {
        return await this.validationService.revalidateDiscoveredUrl(id, request?.targetKeyword);
    }
}
