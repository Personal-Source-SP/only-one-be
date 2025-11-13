import { Injectable } from '@nestjs/common';

import { LoggerService } from '../../../shared/services/logger.service';
import { WebsocketGateway } from '../gateways/websocket.gateway';

@Injectable()
export class SocketListener {
    private readonly loggerService: LoggerService = new LoggerService(SocketListener.name);

    constructor(private readonly gateway: WebsocketGateway) {}

    sendToAll<T>(event: string, data: T): void {
        try {
            this.loggerService.log(`Sending message to all clients: ${event}`);
            this.gateway.sendMessageToAllClients(event, data);
        } catch (error) {
            this.loggerService.error(`Error sending message to all clients: ${error.message}`);
        }
    }

    sendToId<T>(clientId: string, event: string, data: T): void {
        try {
            this.loggerService.log(`Sending message to client ${clientId}: ${event}`);
            this.gateway.sendMessageToClient(clientId, event, data);
        } catch (error) {
            this.loggerService.error(`Error sending message to client ${clientId}: ${error.message}`);
        }
    }

    sendToRoom<T>(roomName: string, event: string, data: T): void {
        try {
            this.loggerService.log(`Sending message to room ${roomName}: ${event}`);
            this.gateway.sendMessageToRoom(roomName, event, data);
        } catch (error) {
            this.loggerService.error(`Error sending message to room ${roomName}: ${error.message}`);
        }
    }

    broadcastToAll<T>(event: string, data: T): void {
        try {
            this.loggerService.log(`Broadcasting to all clients: ${event}`);
            this.gateway.broadcastToAll(event, data);
        } catch (error) {
            this.loggerService.error(`Error broadcasting to all clients: ${error.message}`);
        }
    }

    broadcastToRoom<T>(roomName: string, event: string, data: T): void {
        try {
            this.loggerService.log(`Broadcasting to room ${roomName}: ${event}`);
            this.gateway.broadcastToRoom(roomName, event, data);
        } catch (error) {
            this.loggerService.error(`Error broadcasting to room ${roomName}: ${error.message}`);
        }
    }
}
