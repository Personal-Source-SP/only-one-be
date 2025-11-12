import { Global, Module } from '@nestjs/common';

import { WebsocketGateway } from './gateways/websocket.gateway';
import { ScoutRequestSocketService } from './services/scout-request.socket.service';

const gateways = [WebsocketGateway];
const services = [ScoutRequestSocketService];

@Global()
@Module({
    imports: [],
    controllers: [],
    providers: [...gateways, ...services],
    exports: [...gateways, ...services],
})
export class WebsocketModule {}
