import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { LoggerService } from '../../../shared/services/logger.service';

@Injectable()
export class WebsocketAuthGuard implements CanActivate {
    private readonly loggerService: LoggerService = new LoggerService(WebsocketAuthGuard.name);

    constructor(private readonly jwtService: JwtService) {}

    canActivate(context: ExecutionContext): boolean {
        try {
            const client: Socket = context.switchToWs().getClient();
            const token = this.extractToken(client);

            if (!token) {
                throw new WsException('Authentication token not found');
            }

            const payload = this.jwtService.verify(token);
            client.data.user = payload;

            this.loggerService.log(`Authenticated WebSocket client: ${client.id}`);
            return true;
        } catch (error) {
            this.loggerService.error(`WebSocket authentication failed: ${error.message}`);
            throw new WsException('Authentication failed');
        }
    }

    private extractToken(client: Socket): string | null {
        // Try to get token from handshake auth
        if (client.handshake.auth?.token) {
            return client.handshake.auth.token;
        }

        // Try to get token from query parameters
        if (client.handshake.query?.token) {
            return client.handshake.query.token as string;
        }

        // Try to get token from headers
        const authHeader = client.handshake.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }

        return null;
    }
}
