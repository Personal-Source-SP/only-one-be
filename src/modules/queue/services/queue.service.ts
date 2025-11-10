import { InjectQueue } from '@nestjs/bull';
import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Job, JobOptions, Queue } from 'bull';

import { LoggerService } from '../../../shared/services/logger.service';
import { ProcessScrapeDataRequestDto } from '../../data-provider/dtos/requests';
import { QUEUE_NAME } from '../enums/queue-name.enum';
import { QueueStatusEnum } from '../enums/queue-status.enum';

@Injectable()
export class QueueService implements OnModuleInit {
    private queues: Map<QUEUE_NAME, Queue> = new Map();

    constructor(
        private readonly logger: LoggerService,
        @InjectQueue(QUEUE_NAME.SCRAPING_JOB_QUEUE) private readonly scrapingJobQueue: Queue<ProcessScrapeDataRequestDto>,
    ) {
        this.registerQueue(QUEUE_NAME.SCRAPING_JOB_QUEUE, this.scrapingJobQueue);
    }

    async onModuleInit() {
        // Verbose the status of the QUEUE_NAME.SCRAPING_JOB_QUEUE
        const queue = this.getQueue(QUEUE_NAME.SCRAPING_JOB_QUEUE);
        const queueStatus = await queue.isPaused();
        this.logger.log(`Verbose the status of the ${QUEUE_NAME.SCRAPING_JOB_QUEUE} queue: ${queueStatus}`);
    }

    getQueue(queueName: QUEUE_NAME): Queue | undefined {
        const queue = this.queues.get(queueName);
        if (!queue) throw new NotFoundException(`Queue ${queueName} not found`);

        return queue;
    }

    async pauseQueue(queueName: QUEUE_NAME): Promise<boolean> {
        const queue = this.getQueue(queueName);

        try {
            await queue.pause();
            this.logger.log(`Queue ${queueName}: Pausing queue`);
        } catch (error) {
            this.logger.error(`Queue ${queueName} error pausing queue: ${error?.message}`);
            return false;
        }

        return true;
    }

    async resumeQueue(queueName: QUEUE_NAME): Promise<boolean> {
        const queue = this.getQueue(queueName);

        try {
            await queue.resume();
            this.logger.log(`Queue ${queueName}: Resuming queue`);
        } catch (error) {
            this.logger.error(`Queue ${queueName} error resuming queue: ${error?.message}`);
            return false;
        }

        return true;
    }

    async isQueuePaused(queueName: QUEUE_NAME): Promise<boolean> {
        const queue = this.getQueue(queueName);
        return await queue.isPaused();
    }

    async getQueueStatus(queueName: QUEUE_NAME): Promise<QueueStatusEnum> {
        const queue = this.getQueue(queueName);
        const isPaused = await queue.isPaused();

        return isPaused ? QueueStatusEnum.PAUSED : QueueStatusEnum.RUNNING;
    }

    async addJob<T>(queueName: QUEUE_NAME, data: T, opts?: JobOptions): Promise<Job<T>> {
        const queue = this.getQueue(queueName);

        try {
            const job = await queue.add(data, opts);
            return job;
        } catch (error) {
            this.logger.error(`Queue ${queueName} error adding job: ${error?.message}`);
            throw error;
        }
    }

    async addBulkJob<T>(queueName: QUEUE_NAME, jobData: { data: T; opts?: JobOptions }[]): Promise<Job<T>[]> {
        const queue = this.getQueue(queueName);

        try {
            const job = await queue.addBulk(jobData);
            return job;
        } catch (error) {
            this.logger.error(`Queue ${queueName} error adding job: ${error?.message}`);
            throw error;
        }
    }

    async getJob(queueName: QUEUE_NAME, jobId: string): Promise<Job<any> | null> {
        const queue = this.getQueue(queueName);
        return await queue.getJob(jobId);
    }

    private registerQueue(queueName: QUEUE_NAME, queue: Queue): void {
        this.queues.set(queueName, queue);
        this.logger.log(`Registered queue: ${queueName}`);
    }
}
