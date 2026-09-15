import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { LoggerService } from '../../../shared/services/logger.service';
import { IDeviceDiscoveredEventPayload, IScanCompletedEventPayload, IScanStartedEventPayload } from '../../network-device/interfaces';
import { SubscribeName, WebSocketEvent } from '../enums/subscribe-name.enum';
import { WebsocketGateway } from '../gateways/websocket.gateway';

@Injectable()
export class NetworkDeviceSocketService {
    private readonly logger: LoggerService = new LoggerService(NetworkDeviceSocketService.name);

    constructor(private readonly gateway: WebsocketGateway) {}

    @OnEvent(WebSocketEvent.DEVICE_DISCOVERED)
    handleDeviceDiscovered(payload: IDeviceDiscoveredEventPayload): void {
        try {
            this.logger.debug(`Broadcasting device discovered event: ${payload.networkDevice?.ipAddress}`);
            this.gateway.broadcastToAll(SubscribeName.DEVICE_DISCOVERED, payload);
        } catch (error) {
            this.logger.error(`Error emitting device discovered: ${error.message}`);
        }
    }

    @OnEvent(WebSocketEvent.DEVICE_SCAN_STARTED)
    handleScanStarted(payload: IScanStartedEventPayload): void {
        try {
            this.logger.log('Broadcasting device scan started event');
            this.gateway.broadcastToAll(SubscribeName.DEVICE_SCAN_STARTED, payload);
        } catch (error) {
            this.logger.error(`Error emitting scan started: ${error.message}`);
        }
    }

    @OnEvent(WebSocketEvent.DEVICE_SCAN_COMPLETED)
    handleScanCompleted(payload: IScanCompletedEventPayload): void {
        try {
            this.logger.log(`Broadcasting device scan completed event: ${payload.totalDiscovered} found`);
            this.gateway.broadcastToAll(SubscribeName.DEVICE_SCAN_COMPLETED, payload);
        } catch (error) {
            this.logger.error(`Error emitting scan completed: ${error.message}`);
        }
    }
}
