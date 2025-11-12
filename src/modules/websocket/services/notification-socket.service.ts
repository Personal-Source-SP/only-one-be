// import { Injectable } from '@nestjs/common';
// import { OnEvent } from '@nestjs/event-emitter';

// import { LoggerService } from '../../../shared/services/logger.service';
// import { SubscribeName, WebSocketEvent } from '../enums/subscribe-name.enum';
// import { WebsocketGateway } from '../gateways/websocket.gateway';
// import { ScoutRequestProcessingData, WebSocketMessage } from '../interfaces/websocket.interface';
// import { NotificationCreatedData } from '../interfaces';

// @Injectable()
// export class NotificationSocketService {
//     private readonly loggerService: LoggerService = new LoggerService(NotificationSocketService.name);

//     constructor(private readonly gateway: WebsocketGateway) {}

//     @OnEvent(WebSocketEvent.NOTIFICATION_CREATED)
//     handleNotificationCreated(data: NotificationCreatedData): void {
//         try {
//             this.loggerService.log(`Scout request progress: ${data.requestId} - ${data.progress}%`);

//             const message: WebSocketMessage<ScoutRequestProcessingData> = {
//                 event: SubscribeName.SCOUT_REQUEST_PROGRESS,
//                 data,
//                 timestamp: Date.now(),
//             };

//             // Emit to specific room if available, otherwise to all
//             if (data.requestId) {
//                 this.gateway.sendMessageToRoom(`scout-${data.requestId}`, SubscribeName.SCOUT_REQUEST_PROGRESS, message);
//             } else {
//                 this.gateway.sendMessageToAllClients(SubscribeName.SCOUT_REQUEST_PROGRESS, message);
//             }
//         } catch (error) {
//             this.loggerService.error(`Error sending scout request progress: ${error.message}`);
//         }
//     }
// }
