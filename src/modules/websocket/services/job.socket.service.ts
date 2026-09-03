import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { LoggerService } from '../../../shared/services/logger.service';
import { SubscribeName, WebSocketEvent } from '../enums/subscribe-name.enum';
import { WebsocketGateway } from '../gateways/websocket.gateway';
import { IJobProgressData } from '../interfaces/websocket.interface';

@Injectable()
export class JobSocketService {
    private readonly logger: LoggerService = new LoggerService(JobSocketService.name);

    constructor(private readonly gateway: WebsocketGateway) {}

    @OnEvent(WebSocketEvent.JOB_STARTED)
    handleJobStarted(payload: IJobProgressData): void {
        try {
            this.logger.log(`Job started event received: ${payload.jobId} (${payload.jobName})`);
            this.gateway.sendJobProgress(payload.jobId, SubscribeName.JOB_STARTED, payload);
        } catch (error) {
            this.logger.error(`Error emitting job started: ${error.message}`);
        }
    }

    @OnEvent(WebSocketEvent.JOB_PROGRESS)
    handleJobProgress(payload: IJobProgressData): void {
        try {
            this.logger.debug(`Job progress: ${payload.jobId} -> ${payload.progress}%`);
            this.gateway.sendJobProgress(payload.jobId, SubscribeName.JOB_PROGRESS, payload);
        } catch (error) {
            this.logger.error(`Error emitting job progress: ${error.message}`);
        }
    }

    @OnEvent(WebSocketEvent.JOB_COMPLETED)
    handleJobCompleted(payload: IJobProgressData): void {
        try {
            this.logger.log(`Job completed event received: ${payload.jobId}`);
            this.gateway.sendJobProgress(payload.jobId, SubscribeName.JOB_COMPLETED, payload);
        } catch (error) {
            this.logger.error(`Error emitting job completed: ${error.message}`);
        }
    }

    @OnEvent(WebSocketEvent.JOB_FAILED)
    handleJobFailed(payload: IJobProgressData): void {
        try {
            this.logger.error(`Job failed event received: ${payload.jobId} - Error: ${payload.error}`);
            this.gateway.sendJobProgress(payload.jobId, SubscribeName.JOB_FAILED, payload);
        } catch (error) {
            this.logger.error(`Error emitting job failed: ${error.message}`);
        }
    }
}
