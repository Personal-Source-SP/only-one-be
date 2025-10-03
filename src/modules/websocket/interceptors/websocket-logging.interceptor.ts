import { Injectable, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Socket } from 'socket.io';

@Injectable()
export class WebsocketLoggingInterceptor {
    private readonly logger = new Logger(WebsocketLoggingInterceptor.name);

    intercept(context: any, next: any): Observable<any> {
        const client: Socket = context.switchToWs().getClient();
        const event = context.switchToWs().getData();
        const startTime = Date.now();

        this.logger.log(`WebSocket event received: ${event} from client: ${client.id}`);

        return next.handle().pipe(
            tap({
                next: (data) => {
                    const duration = Date.now() - startTime;
                    this.logger.log(`WebSocket event completed: ${event} from client: ${client.id} in ${duration}ms`);
                },
                error: (error) => {
                    const duration = Date.now() - startTime;
                    this.logger.error(`WebSocket event failed: ${event} from client: ${client.id} in ${duration}ms - ${error.message}`);
                },
            }),
        );
    }
}
