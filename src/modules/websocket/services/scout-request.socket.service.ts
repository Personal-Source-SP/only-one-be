import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { SubscribeName, WebSocketEvent } from '../enums/subscribe-name.enum';
import { ScoutRequestProcessingData, WebSocketMessage } from '../interfaces/websocket.interface';
import { WebsocketGateway } from './websocket.gateway';

@Injectable()
export class ScoutRequestSocketService {
    private readonly logger: Logger = new Logger(ScoutRequestSocketService.name);

    constructor(private readonly gateway: WebsocketGateway) {}

    @OnEvent(WebSocketEvent.SCOUT_REQUEST_PROCESSING)
    handleScoutRequestProcessing(data: ScoutRequestProcessingData): void {
        try {
            this.logger.log(`Processing scout request: ${data.requestId}`);

            const message: WebSocketMessage<ScoutRequestProcessingData> = {
                event: SubscribeName.SCOUT_REQUEST_PROCESSING,
                data,
                timestamp: Date.now(),
            };

            // Emit to all connected clients
            this.gateway.sendMessageToAllClients(SubscribeName.SCOUT_REQUEST_PROCESSING, message);

            this.logger.log(`Scout request processing message sent for: ${data.requestId}`);
        } catch (error) {
            this.logger.error(`Error sending scout request processing message: ${error.message}`);
        }
    }

    @OnEvent(WebSocketEvent.SCOUT_REQUEST_PROGRESS)
    handleScoutRequestProgress(data: ScoutRequestProcessingData): void {
        try {
            this.logger.log(`Scout request progress: ${data.requestId} - ${data.progress}%`);

            const message: WebSocketMessage<ScoutRequestProcessingData> = {
                event: SubscribeName.SCOUT_REQUEST_PROGRESS,
                data,
                timestamp: Date.now(),
            };

            // Emit to specific room if available, otherwise to all
            if (data.requestId) {
                this.gateway.sendMessageToRoom(`scout-${data.requestId}`, SubscribeName.SCOUT_REQUEST_PROGRESS, message);
            } else {
                this.gateway.sendMessageToAllClients(SubscribeName.SCOUT_REQUEST_PROGRESS, message);
            }
        } catch (error) {
            this.logger.error(`Error sending scout request progress: ${error.message}`);
        }
    }

    @OnEvent(WebSocketEvent.SCOUT_REQUEST_COMPLETED)
    handleScoutRequestCompleted(data: ScoutRequestProcessingData): void {
        try {
            this.logger.log(`Scout request completed: ${data.requestId}`);

            const message: WebSocketMessage<ScoutRequestProcessingData> = {
                event: SubscribeName.SCOUT_REQUEST_COMPLETED,
                data,
                timestamp: Date.now(),
            };

            // Emit to specific room if available, otherwise to all
            if (data.requestId) {
                this.gateway.sendMessageToRoom(`scout-${data.requestId}`, SubscribeName.SCOUT_REQUEST_COMPLETED, message);
            } else {
                this.gateway.sendMessageToAllClients(SubscribeName.SCOUT_REQUEST_COMPLETED, message);
            }
        } catch (error) {
            this.logger.error(`Error sending scout request completed: ${error.message}`);
        }
    }

    @OnEvent(WebSocketEvent.SCOUT_REQUEST_FAILED)
    handleScoutRequestFailed(data: ScoutRequestProcessingData): void {
        try {
            this.logger.log(`Scout request failed: ${data.requestId}`);

            const message: WebSocketMessage<ScoutRequestProcessingData> = {
                event: SubscribeName.SCOUT_REQUEST_FAILED,
                data,
                timestamp: Date.now(),
            };

            // Emit to specific room if available, otherwise to all
            if (data.requestId) {
                this.gateway.sendMessageToRoom(`scout-${data.requestId}`, SubscribeName.SCOUT_REQUEST_FAILED, message);
            } else {
                this.gateway.sendMessageToAllClients(SubscribeName.SCOUT_REQUEST_FAILED, message);
            }
        } catch (error) {
            this.logger.error(`Error sending scout request failed: ${error.message}`);
        }
    }
}
