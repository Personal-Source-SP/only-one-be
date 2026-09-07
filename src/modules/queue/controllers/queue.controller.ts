import { Controller, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Auth, GetRestApi, PostRestApi } from '../../../decorators';
import { QUEUE_NAME } from '../enums/queue-name.enum';
import { QueueStatusEnum } from '../enums/queue-status.enum';
import { QueueService } from '../services/queue.service';

@Controller('queue')
@ApiTags('Queue')
@Auth()
export class QueueController {
    constructor(private readonly queueService: QueueService) {}

    @GetRestApi({
        path: ':queueName/status',
        summary: 'Get status queue',
        responseDto: String,
    })
    async getQueueStatus(@Param('queueName') queueName: QUEUE_NAME): Promise<QueueStatusEnum> {
        const result = await this.queueService.getQueueStatus(queueName);
        return result;
    }

    @PostRestApi({
        path: ':queueName/pause',
        summary: 'Pause queue',
        responseDto: Boolean,
    })
    async pauseQueue(@Param('queueName') queueName: QUEUE_NAME): Promise<boolean> {
        const result = await this.queueService.pauseQueue(queueName);
        return result;
    }

    @PostRestApi({
        path: ':queueName/resume',
        summary: 'Resume queue',
        responseDto: Boolean,
    })
    async resumeQueue(@Param('queueName') queueName: QUEUE_NAME): Promise<boolean> {
        const result = await this.queueService.resumeQueue(queueName);
        return result;
    }
}
