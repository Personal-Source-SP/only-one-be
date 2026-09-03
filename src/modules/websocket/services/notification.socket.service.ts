import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { LoggerService } from '../../../shared/services/logger.service';
import { WebSocketEvent } from '../enums/subscribe-name.enum';
import { WebsocketGateway } from '../gateways/websocket.gateway';
import { INotificationSocketData } from '../interfaces/websocket.interface';

@Injectable()
export class NotificationSocketService {
    private readonly logger: LoggerService = new LoggerService(NotificationSocketService.name);

    constructor(private readonly gateway: WebsocketGateway) {}

    @OnEvent(WebSocketEvent.NOTIFICATION_CREATED)
    handleNotificationCreated(notification: INotificationSocketData): void {
        try {
            if (!notification.userId) {
                this.logger.warn(`Notification received without userId, cannot route to personal room`);
                return;
            }

            this.logger.log(`Dispatching real-time notification to user ${notification.userId}: ${notification.title}`);
            this.gateway.sendNotificationToUser(notification.userId, notification);
        } catch (error) {
            this.logger.error(`Error dispatching real-time notification: ${error.message}`);
        }
    }
}
