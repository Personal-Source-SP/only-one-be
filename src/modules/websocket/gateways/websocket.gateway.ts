import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { LoggerService } from '../../../shared/services/logger.service';
import { SubscribeName, WebSocketEvent } from '../enums/subscribe-name.enum';
import { WebSocketMessage, WebSocketResponse } from '../interfaces/websocket.interface';

@WebSocketGateway({
    cors: {
        credentials: true,
        origin: process.env.WEBSOCKET_CORS_ORIGIN || '*',
    },
    transports: ['websocket', 'polling'],
    path: process.env.WEBSOCKET_PATH || '/socket.io',
    namespace: process.env.WEBSOCKET_NAMESPACE || '/',
    port: parseInt(process.env.WEBSOCKET_PORT || '3000'),
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly loggerService: LoggerService = new LoggerService(WebsocketGateway.name);

    private readonly connectedClients: Map<string, Socket> = new Map();
    private readonly clientRooms: Map<string, Set<string>> = new Map();

    @WebSocketServer()
    server: Server;

    handleConnection(client: Socket) {
        try {
            this.loggerService.log(`Client connected: ${client.id}`);
            this.connectedClients.set(client.id, client);

            // Send connection confirmation
            const response: WebSocketResponse = {
                status: 'success',
                timestamp: Date.now(),
                data: { clientId: client.id, message: 'Connection established' },
            };

            client.emit(SubscribeName.CONNECTION_ESTABLISHED, response);

            // Join default room
            client.join('default');
            this.addClientToRoom(client.id, 'default');

            this.loggerService.log(`Client ${client.id} joined default room`);
        } catch (error) {
            this.loggerService.error(`Error handling connection for client ${client.id}: ${error.message}`);
            client.emit(SubscribeName.ERROR_OCCURRED, {
                status: 'error',
                message: 'Connection failed',
                timestamp: Date.now(),
            });
        }
    }

    handleDisconnect(client: Socket) {
        try {
            this.connectedClients.delete(client.id);
            this.loggerService.log(`Client disconnected: ${client.id}`);

            // Remove client from all rooms
            const clientRooms = this.clientRooms.get(client.id);
            if (clientRooms) {
                clientRooms.forEach((room) => {
                    client.leave(room);
                    this.loggerService.log(`Client ${client.id} left room: ${room}`);
                });

                this.clientRooms.delete(client.id);
            }
        } catch (error) {
            this.loggerService.error(`Error handling disconnect for client ${client.id}: ${error.message}`);
        }
    }

    @SubscribeMessage(WebSocketEvent.JOIN_ROOM)
    handleJoinRoom(client: Socket, roomName: string): WebSocketResponse {
        try {
            if (!roomName || typeof roomName !== 'string') {
                throw new WsException('Invalid room name');
            }

            client.join(roomName);
            this.addClientToRoom(client.id, roomName);

            const response: WebSocketResponse = {
                status: 'success',
                timestamp: Date.now(),
                message: `Joined room: ${roomName}`,
                data: { room: roomName, clientId: client.id },
            };

            client.emit(SubscribeName.CLIENT_JOINED_ROOM, response);
            this.loggerService.log(`Client ${client.id} joined room: ${roomName}`);

            return response;
        } catch (error) {
            this.loggerService.error(`Error joining room: ${error.message}`);

            const errorResponse: WebSocketResponse = {
                status: 'error',
                message: error.message,
                timestamp: Date.now(),
            };
            client.emit(SubscribeName.ERROR_OCCURRED, errorResponse);

            throw new WsException(error.message);
        }
    }

    @SubscribeMessage(WebSocketEvent.LEAVE_ROOM)
    handleLeaveRoom(client: Socket, roomName: string): WebSocketResponse {
        try {
            if (!roomName || typeof roomName !== 'string') {
                throw new WsException('Invalid room name');
            }

            client.leave(roomName);
            this.removeClientFromRoom(client.id, roomName);

            const response: WebSocketResponse = {
                status: 'success',
                timestamp: Date.now(),
                message: `Left room: ${roomName}`,
                data: { room: roomName, clientId: client.id },
            };
            client.emit(SubscribeName.CLIENT_LEFT_ROOM, response);

            this.loggerService.log(`Client ${client.id} left room: ${roomName}`);

            return response;
        } catch (error) {
            this.loggerService.error(`Error leaving room: ${error.message}`);

            const errorResponse: WebSocketResponse = {
                status: 'error',
                message: error.message,
                timestamp: Date.now(),
            };
            client.emit(SubscribeName.ERROR_OCCURRED, errorResponse);

            throw new WsException(error.message);
        }
    }

    @SubscribeMessage(WebSocketEvent.MESSAGE)
    handleMessage<T>(client: Socket, message: WebSocketMessage<T>): WebSocketResponse {
        try {
            this.loggerService.log(`Message received from client ${client.id}: ${message.event}`);

            // Broadcast message to all clients in the same room
            const clientRooms = this.clientRooms.get(client.id);
            if (clientRooms) {
                clientRooms.forEach((room) => {
                    this.server.to(room).emit(message.event, {
                        ...message,
                        clientId: client.id,
                        timestamp: Date.now(),
                    });
                });
            }

            const response: WebSocketResponse = {
                data: message,
                status: 'success',
                timestamp: Date.now(),
            };

            return response;
        } catch (error) {
            this.loggerService.error(`Error handling message: ${error.message}`);
            const errorResponse: WebSocketResponse = {
                status: 'error',
                message: error.message,
                timestamp: Date.now(),
            };
            client.emit(SubscribeName.ERROR_OCCURRED, errorResponse);
            throw new WsException(error.message);
        }
    }

    @SubscribeMessage(WebSocketEvent.HEARTBEAT)
    handleHeartbeat(client: Socket): WebSocketResponse {
        const response: WebSocketResponse = {
            status: 'success',
            timestamp: Date.now(),
            message: 'Heartbeat received',
            data: { timestamp: Date.now() },
        };

        client.emit(SubscribeName.HEARTBEAT, response);

        return response;
    }

    sendMessageToAllClients<T>(event: string, data: T): void {
        try {
            this.loggerService.log(`Sending message to all clients: ${event}`);
            this.server.emit(event, { data, timestamp: Date.now() });
        } catch (error) {
            this.loggerService.error(`Error sending message to all clients: ${error.message}`);
        }
    }

    sendMessageToRoom<T>(roomName: string, event: string, data: T): void {
        try {
            this.loggerService.log(`Sending message to room: ${roomName}`);
            this.server.to(roomName).emit(event, { data, timestamp: Date.now() });
        } catch (error) {
            this.loggerService.error(`Error sending message to room: ${roomName}: ${error.message}`);
        }
    }

    sendMessageToClient<T>(clientId: string, event: string, data: T): void {
        try {
            const client = this.connectedClients.get(clientId);
            if (!client) {
                this.loggerService.warn(`Client ${clientId} not found`);
                return;
            }

            this.loggerService.log(`Sending message to client: ${clientId}`);
            client.emit(event, { data, timestamp: Date.now() });
        } catch (error) {
            this.loggerService.error(`Error sending message to client ${clientId}: ${error.message}`);
        }
    }

    getConnectedClientsCount(): number {
        return this.connectedClients.size;
    }

    getClientRooms(clientId: string): string[] {
        const rooms = this.clientRooms.get(clientId);
        return rooms ? Array.from(rooms) : [];
    }

    broadcastToRoom<T>(roomName: string, event: string, data: T): void {
        try {
            this.loggerService.log(`Broadcasting to room: ${roomName}`);
            this.server.to(roomName).emit(event, { data, timestamp: Date.now() });
        } catch (error) {
            this.loggerService.error(`Error broadcasting to room: ${roomName}: ${error.message}`);
        }
    }

    broadcastToAll<T>(event: string, data: T): void {
        try {
            this.loggerService.log(`Broadcasting to all clients`);
            this.server.emit(event, { data, timestamp: Date.now() });
        } catch (error) {
            this.loggerService.error(`Error broadcasting to all clients: ${error.message}`);
        }
    }

    private addClientToRoom(clientId: string, roomName: string): void {
        if (!this.clientRooms.has(clientId)) {
            this.clientRooms.set(clientId, new Set());
        }

        this.clientRooms.get(clientId)?.add(roomName);
    }

    private removeClientFromRoom(clientId: string, roomName: string): void {
        const clientRooms = this.clientRooms.get(clientId);

        if (clientRooms) {
            clientRooms.delete(roomName);

            if (clientRooms.size === 0) {
                this.clientRooms.delete(clientId);
            }
        }
    }
}
