import { Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { ResponseDto } from '../../../common/dto/response.dto';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { QUEUE_NAME } from '../enums/queue-name.enum';
import { QueueStatusEnum } from '../enums/queue-status.enum';
import { QueueService } from '../services/queue.service';

@Controller('queue')
@ApiTags('queue')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class QueueController {
    constructor(private readonly queueService: QueueService) {}

    @ApiOperation({ summary: 'Get status queue' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get(':queueName/status')
    @BaseApiOkResponse(String)
    async getQueueStatus(@Param('queueName') queueName: QUEUE_NAME): Promise<QueueStatusEnum> {
        const result = await this.queueService.getQueueStatus(queueName);
        return result;
    }

    @ApiOperation({ summary: 'Pause queue' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post(':queueName/pause')
    @BaseApiOkResponse(Boolean)
    async pauseQueue(@Param('queueName') queueName: QUEUE_NAME): Promise<boolean> {
        const result = await this.queueService.pauseQueue(queueName);
        return result;
    }

    @ApiOperation({ summary: 'Resume queue' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post(':queueName/resume')
    @BaseApiOkResponse(Boolean)
    async resumeQueue(@Param('queueName') queueName: QUEUE_NAME): Promise<boolean> {
        const result = await this.queueService.resumeQueue(queueName);
        return result;
    }
}
