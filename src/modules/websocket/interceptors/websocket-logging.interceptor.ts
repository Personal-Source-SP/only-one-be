import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Socket } from 'socket.io';
import { LoggerService } from '../../../shared/services/logger.service';

@Injectable()
export class WebsocketLoggingInterceptor {
    private readonly loggerService: LoggerService = new LoggerService(WebsocketLoggingInterceptor.name);

    intercept(context: any, next: any): Observable<any> {
        const client: Socket = context.switchToWs().getClient();
        const event = context.switchToWs().getData();

        const startTime = Date.now();

        this.loggerService.log(`WebSocket event received: ${event} from client: ${client.id}`);

        return next.handle().pipe(
            tap({
                next: (data) => {
                    const duration = Date.now() - startTime;
                    this.loggerService.log(`WebSocket event completed: ${event} from client: ${client.id} in ${duration}ms`);
                },
                error: (error) => {
                    const duration = Date.now() - startTime;
                    this.loggerService.error(
                        `WebSocket event failed: ${event} from client: ${client.id} in ${duration}ms - ${error.message}`,
                    );
                },
            }),
        );
    }
}
