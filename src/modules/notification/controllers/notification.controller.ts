import { Body, Controller, HttpCode, HttpStatus, Post, Version } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { NotificationDto } from '../dtos/notification.dto';
import { CreateNotificationRequest } from '../dtos/requests/notification-request.dto';
import { NotificationEntity } from '../entities/notification.entity';
import { NotificationService } from '../services/notification.service';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController extends BaseController<NotificationEntity, NotificationDto> {
    constructor(private readonly notificationService: NotificationService) {
        super(notificationService);
    }

    @ApiOperation({ summary: 'Create notification' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post()
    @BaseApiOkResponse(NotificationDto)
    public async create(@Body() request: CreateNotificationRequest): Promise<NotificationDto> {
        const result = await this.notificationService.create(request);
        return result;
    }
}
