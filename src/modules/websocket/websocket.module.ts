import { Global, Module } from '@nestjs/common';

import { WebsocketGateway } from './gateways/websocket.gateway';
import { SocketListener } from './listeners/socket.listener';

const gateways = [WebsocketGateway];
const listeners = [SocketListener];

@Global()
@Module({
    imports: [],
    controllers: [],
    providers: [...gateways, ...listeners],
    exports: [...gateways, ...listeners],
})
export class WebsocketModule {}
