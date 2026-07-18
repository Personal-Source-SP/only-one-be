import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { LoggerService } from '../../../shared/services/logger.service';
import { SOCKET_EVENTS } from '../constants/socket.constant';
import { WebsocketGateway } from '../gateways/websocket.gateway';

@Injectable()
export class SocketListener {
    private readonly loggerService: LoggerService = new LoggerService(SocketListener.name);

    constructor(private readonly gateway: WebsocketGateway) {}

    @OnEvent(SOCKET_EVENTS.SEND_TO_ALL)
    handleSendToAll<T>(event: string, data: T): void {
        try {
            this.loggerService.log(`Sending message to all clients: ${event}`);
            this.gateway.sendMessageToAllClients(event, data);
        } catch (error) {
            this.loggerService.error(`Error sending message to all clients: ${error.message}`);
        }
    }

    @OnEvent(SOCKET_EVENTS.SEND_TO_ID)
    handleSendToId<T>(clientId: string, event: string, data: T): void {
        try {
            this.loggerService.log(`Sending message to client ${clientId}: ${event}`);
            this.gateway.sendMessageToClient(clientId, event, data);
        } catch (error) {
            this.loggerService.error(`Error sending message to client ${clientId}: ${error.message}`);
        }
    }

    @OnEvent(SOCKET_EVENTS.SEND_TO_ROOM)
    handleSendToRoom<T>(roomName: string, event: string, data: T): void {
        try {
            this.loggerService.log(`Sending message to room ${roomName}: ${event}`);
            this.gateway.sendMessageToRoom(roomName, event, data);
        } catch (error) {
            this.loggerService.error(`Error sending message to room ${roomName}: ${error.message}`);
        }
    }

    @OnEvent(SOCKET_EVENTS.BROADCAST_TO_ALL)
    handleBroadcastToAll<T>(event: string, data: T): void {
        try {
            this.loggerService.log(`Broadcasting to all clients: ${event}`);
            this.gateway.broadcastToAll(event, data);
        } catch (error) {
            this.loggerService.error(`Error broadcasting to all clients: ${error.message}`);
        }
    }

    @OnEvent(SOCKET_EVENTS.BROADCAST_TO_ROOM)
    handleBroadcastToRoom<T>(roomName: string, event: string, data: T): void {
        try {
            this.loggerService.log(`Broadcasting to room ${roomName}: ${event}`);
            this.gateway.broadcastToRoom(roomName, event, data);
        } catch (error) {
            this.loggerService.error(`Error broadcasting to room ${roomName}: ${error.message}`);
        }
    }
}
