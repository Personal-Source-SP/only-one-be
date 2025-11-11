import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as cron from 'cron';
import { CronJob } from 'cron';
import * as cronParser from 'cron-parser';
import { Repository } from 'typeorm';

import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { BaseService } from '../../../common/base.service';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { SCHEDULE_JOB_NAME, SCHEDULE_TIMEZONE } from '../../../constant';
import { AppConfigService } from '../../../shared/services/app-config.service';
import { LoggerService } from '../../../shared/services/logger.service';
import { CreateScheduleJobRequestDto, CreateScheduleRequestDto } from '../dtos/requests';
import { ScheduleDto } from '../dtos/schedule.dto';
import { ScheduleEntity } from '../entities/schedule.entity';
import { ScheduleJobTriggerType, ScheduleType } from '../enums';
import { ScheduleJobService } from './schedule-job.service';

@Injectable()
export class ScheduleService extends BaseService<ScheduleEntity, ScheduleDto> implements OnModuleInit {
    private lastLoadedSchedules: Map<string, ScheduleEntity> = new Map();

    constructor(
        private readonly loggerService: LoggerService,
        private readonly configService: AppConfigService,
        private readonly schedulerRegistry: SchedulerRegistry,
        private readonly scheduleJobService: ScheduleJobService,

        @InjectMapper() mapper: Mapper,
        @InjectRepository(ScheduleEntity) scheduleRepository: Repository<ScheduleEntity>,
    ) {
        super(scheduleRepository, mapper, ScheduleDto);
    }

    async onModuleInit() {
        if (this.configService.scheduleConfig.enabled) {
            await this.loadSchedules();
        }
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async checkForScheduleChanges() {
        if (this.configService.scheduleConfig.enabled) {
            await this.loadSchedules();
        }
    }

    async create(request: CreateScheduleRequestDto, user: PayloadDto): Promise<ScheduleDto> {
        const { cronExpression } = request;

        const isValidCronExpression = this.isValidCronExpression(cronExpression);
        if (!isValidCronExpression) {
            this.loggerService.error(`[ScheduleService] Invalid cron expression: ${cronExpression}`);
            throw new BadRequestException('Invalid cron expression');
        }

        const isDuplicate = await this.checkDuplicateSchedule(request.type, cronExpression);
        if (isDuplicate) {
            this.loggerService.error(
                `[ScheduleService] Duplicate schedule with type ${request.type} and cron expression ${cronExpression}`,
            );
            throw new BadRequestException('Duplicate schedule');
        }

        const entity = this.mapper.map(request, CreateScheduleRequestDto, ScheduleEntity);

        // Calculate the next run time
        const interval = cronParser.parseExpression(entity.cronExpression, { tz: 'UTC' });
        const nextRun = interval.next().toDate();
        entity.nextRunAt = nextRun;

        return await super.create(entity, user);
    }

    async switchStatus(id: string, enabled: boolean): Promise<boolean> {
        const schedule = await this.exists({ id });
        if (!schedule) throw new NotFoundException('Schedule with ID not found');

        try {
            return await super.update(id, { enabled });
        } catch (error) {
            this.loggerService.error(`[ScheduleService] Error switching status for schedule ${id}: ${error.message}`);
            throw new BadRequestException('Error switching status for schedule');
        }
    }

    private isValidCronExpression(value: string): boolean {
        const validation = cron.validateCronExpression(value);
        return validation.valid;
    }

    private getJobName(scheduleId: string): string {
        return `${SCHEDULE_JOB_NAME}${scheduleId}`;
    }

    private async checkDuplicateSchedule(type: ScheduleType, cronExpression: string): Promise<boolean> {
        const existingSchedule = await this.exists({ type, cronExpression });
        return existingSchedule;
    }

    private async handleCronTrigger(scheduleId: string): Promise<void> {
        const schedule = await this.lastLoadedSchedules.get(scheduleId);
        if (!schedule) {
            this.loggerService.error(`[ScheduleService] Schedule not found: ${scheduleId}`);
            return;
        }

        const request: CreateScheduleJobRequestDto = {
            scheduleId,
            jobPayload: schedule.payload,
            triggerType: ScheduleJobTriggerType.CRON,
        };

        try {
            this.loggerService.log(`[ScheduleService] Created schedule job for schedule: ${scheduleId}`);
            await this.scheduleJobService.create(request);
            this.loggerService.log(`[ScheduleService] Schedule job created successfully for schedule: ${scheduleId}`);
        } catch (error) {
            this.loggerService.error(`[ScheduleService] Error creating schedule job: ${error.message}`);
        }
    }

    private async removeCronJob(scheduleId: string) {
        const cronJobName = this.getJobName(scheduleId);

        try {
            const job = this.schedulerRegistry.getCronJob(cronJobName);
            if (job?.isActive) {
                this.schedulerRegistry.deleteCronJob(cronJobName);
            }
        } catch (error) {
            this.loggerService.warn(`[ScheduleService] Error removing cron job ${cronJobName}: ${error.message}`);
        }
    }

    private async createCronJob(schedule: ScheduleEntity): Promise<void> {
        if (!schedule.enabled) return;

        try {
            const job = new CronJob(schedule.cronExpression, () => this.handleCronTrigger(schedule.id), null, true, SCHEDULE_TIMEZONE);
            const cronJobName = this.getJobName(schedule.id);

            this.schedulerRegistry.addCronJob(cronJobName, job);
        } catch (error) {
            this.loggerService.error(`[ScheduleService] Error creating cron job for schedule ${schedule.id}: ${error.message}`);
        }
    }

    private async handleScheduleChanged(schedule: ScheduleEntity): Promise<void> {
        await this.removeCronJob(schedule.id);
        await this.createCronJob(schedule);

        this.loggerService.log(`[ScheduleService] Updated cron job for schedule: ${schedule.id}`);
    }

    private async handleScheduleRemoved(id: string): Promise<void> {
        await this.removeCronJob(id);

        this.loggerService.log(`[ScheduleService] Removed cron job for schedule: ${id}`);
    }

    private async loadSchedules(): Promise<void> {
        const schedules = await this.repository.find({ where: { enabled: true } });
        if (!schedules?.length) {
            this.loggerService.log('[ScheduleService] No schedules found or all schedules are disabled.');
            return;
        }

        try {
            const currentSchedules = new Map<string, ScheduleEntity>();
            schedules.forEach((schedule) => currentSchedules.set(schedule.id, schedule));

            // Check for new or changed schedules
            const changePromises = Object.values(currentSchedules)?.map((schedule) => {
                const { id, cronExpression, enabled } = schedule;

                const existing = this.lastLoadedSchedules.get(id);
                if (!existing || existing.cronExpression !== cronExpression || existing.enabled !== enabled) {
                    return this.handleScheduleChanged(schedule);
                }
            });

            await Promise.all(changePromises);

            // Check for deleted schedules
            const removePromises = Object.values(this.lastLoadedSchedules)?.map(({ id }) => {
                if (!currentSchedules.has(id)) {
                    return this.handleScheduleRemoved(id);
                }
            });
            await Promise.all(removePromises);

            this.lastLoadedSchedules = currentSchedules;
        } catch (error) {
            this.loggerService.error(`[ScheduleService] Error loading schedules: ${error.message}`);
        }
    }
}
