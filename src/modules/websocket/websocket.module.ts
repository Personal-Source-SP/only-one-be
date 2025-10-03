import { Global, Module } from '@nestjs/common';

import { ScoutRequestSocketService } from './services/scout-request.socket.service';
import { WebsocketGateway } from './services/websocket.gateway';

@Global()
@Module({
    imports: [],
    controllers: [],
    providers: [WebsocketGateway, ScoutRequestSocketService],
    exports: [WebsocketGateway, ScoutRequestSocketService],
})
export class WebsocketModule {}
