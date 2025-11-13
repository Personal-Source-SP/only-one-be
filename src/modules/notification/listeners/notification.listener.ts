import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { LoggerService } from '../../../shared/services/logger.service';
import { NOTIFICATION_EVENTS } from '../constants/notification.constant';
import { CreateNotificationRequest } from '../dtos/requests/notification-request.dto';
import { NotificationService } from '../services/notification.service';

@Injectable()
export class NotificationListener {
    private readonly loggerService: LoggerService = new LoggerService(NotificationListener.name);

    public constructor(private readonly notificationService: NotificationService) {
        this.loggerService.log('Initialized successfully');
    }

    @OnEvent(NOTIFICATION_EVENTS.CREATED)
    async handleNotificationCreated(dto: CreateNotificationRequest) {
        try {
            await this.notificationService.create(dto);
        } catch (error) {
            this.loggerService.error(`Failed to handle notification created: ${error?.message}`);
        }
    }
}
