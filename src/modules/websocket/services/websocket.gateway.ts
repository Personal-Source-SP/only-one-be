import { Logger } from '@nestjs/common';
import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    WsException,
} from '@nestjs/websockets';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { Server, Socket } from 'socket.io';

import { SubscribeName, WebSocketEvent } from '../enums/subscribe-name.enum';
import { WebSocketMessage, WebSocketResponse } from '../interfaces/websocket.interface';

@WebSocketGateway({
    cors: {
        credentials: true,
        origin: process.env.WEBSOCKET_CORS_ORIGIN || '*',
    },
    port: parseInt(process.env.WEBSOCKET_PORT || '3000'),
    path: process.env.WEBSOCKET_PATH || '/socket.io',
    namespace: process.env.WEBSOCKET_NAMESPACE || '/',
    transports: ['websocket', 'polling'],
    adapter: createAdapter(
        new Redis({
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT),
            password: process.env.REDIS_PASSWORD,
        }),
        new Redis({
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT),
            password: process.env.REDIS_PASSWORD,
        }),
        {
            key: process.env.SOCKET_IO_REDIS_KEY || 'socket.io',
        },
    ),
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger: Logger = new Logger(WebsocketGateway.name);

    private readonly connectedClients: Map<string, Socket> = new Map();
    private readonly clientRooms: Map<string, Set<string>> = new Map();

    @WebSocketServer()
    server: Server;

    handleConnection(client: Socket) {
        try {
            this.logger.log(`Client connected: ${client.id}`);
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

            this.logger.log(`Client ${client.id} joined default room`);
        } catch (error) {
            this.logger.error(`Error handling connection for client ${client.id}: ${error.message}`);
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
            this.logger.log(`Client disconnected: ${client.id}`);

            // Remove client from all rooms
            const clientRooms = this.clientRooms.get(client.id);
            if (clientRooms) {
                clientRooms.forEach((room) => {
                    client.leave(room);
                    this.logger.log(`Client ${client.id} left room: ${room}`);
                });

                this.clientRooms.delete(client.id);
            }
        } catch (error) {
            this.logger.error(`Error handling disconnect for client ${client.id}: ${error.message}`);
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
                data: { room: roomName, clientId: client.id },
                message: `Joined room: ${roomName}`,
                timestamp: Date.now(),
            };

            client.emit(SubscribeName.CLIENT_JOINED_ROOM, response);
            this.logger.log(`Client ${client.id} joined room: ${roomName}`);

            return response;
        } catch (error) {
            this.logger.error(`Error joining room: ${error.message}`);
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
                data: { room: roomName, clientId: client.id },
                message: `Left room: ${roomName}`,
                timestamp: Date.now(),
            };

            client.emit(SubscribeName.CLIENT_LEFT_ROOM, response);
            this.logger.log(`Client ${client.id} left room: ${roomName}`);

            return response;
        } catch (error) {
            this.logger.error(`Error leaving room: ${error.message}`);
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
            this.logger.log(`Message received from client ${client.id}: ${message.event}`);

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
                status: 'success',
                data: message,
                timestamp: Date.now(),
            };

            return response;
        } catch (error) {
            this.logger.error(`Error handling message: ${error.message}`);
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
            data: { timestamp: Date.now() },
            message: 'Heartbeat received',
            timestamp: Date.now(),
        };

        client.emit(SubscribeName.HEARTBEAT, response);
        return response;
    }

    // common function to send message to all clients
    public sendMessageToAllClients<T>(event: string, data: T): void {
        this.logger.log(`Sending message to all clients: ${event}`);
        try {
            this.server.emit(event, {
                data,
                timestamp: Date.now(),
            });
        } catch (error) {
            this.logger.error(`Error sending message to all clients: ${error.message}`);
        }
    }

    // common function to send message to specific room
    public sendMessageToRoom<T>(roomName: string, event: string, data: T): void {
        this.logger.log(`Sending message to room: ${roomName}`);
        try {
            this.server.to(roomName).emit(event, {
                data,
                timestamp: Date.now(),
            });
        } catch (error) {
            this.logger.error(`Error sending message to room: ${roomName}`);
        }
    }

    // Utility Methods
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

    // Public methods for external services
    getConnectedClientsCount(): number {
        return this.connectedClients.size;
    }

    getClientRooms(clientId: string): string[] {
        const rooms = this.clientRooms.get(clientId);
        return rooms ? Array.from(rooms) : [];
    }

    broadcastToRoom<T>(roomName: string, event: string, data: T): void {
        this.server.to(roomName).emit(event, {
            data,
            timestamp: Date.now(),
        });
    }

    broadcastToAll<T>(event: string, data: T): void {
        this.server.emit(event, {
            data,
            timestamp: Date.now(),
        });
    }
}
