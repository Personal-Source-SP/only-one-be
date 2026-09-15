import { Global, Module } from '@nestjs/common';

import { WebsocketGateway } from './gateways/websocket.gateway';
import { SocketListener } from './listeners/socket.listener';
import { JobSocketService } from './services/job.socket.service';
import { NetworkDeviceSocketService } from './services/network-device.socket.service';
import { NotificationSocketService } from './services/notification.socket.service';

const gateways = [WebsocketGateway];
const services = [JobSocketService, NotificationSocketService, NetworkDeviceSocketService];
const listeners = [SocketListener];

@Global()
@Module({
    imports: [],
    controllers: [],
    providers: [...gateways, ...services, ...listeners],
    exports: [...gateways, ...services, ...listeners],
})
export class WebsocketModule {}
