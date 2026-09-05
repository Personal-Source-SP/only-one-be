import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import * as cron from 'cron';
import { CronJob } from 'cron';
import * as cronParser from 'cron-parser';
import { Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { SCHEDULE_JOB_NAME, SCHEDULE_TIMEZONE } from '../../../constant';
import { AppException } from '../../../exceptions/app.exception';
import { AppConfigService } from '../../../shared/services/app-config.service';
import { ScheduleError } from '../constants/schedule-error';
import { CreateScheduleJobRequestDto, CreateScheduleRequestDto, UpdateScheduleRequestDto } from '../dtos/requests';
import { ScheduleDto } from '../dtos/schedule.dto';
import { ScheduleEntity } from '../entities/schedule.entity';
import { ScheduleJobTriggerType, ScheduleType } from '../enums';
import { RedisLockService } from './redis-lock.service';
import { ScheduleJobService } from './schedule-job.service';

@Injectable()
export class ScheduleService extends BaseService<ScheduleEntity, ScheduleDto> implements OnModuleInit {
    private lastLoadedSchedules: Map<string, ScheduleDto> = new Map();

    constructor(
        private readonly configService: AppConfigService,
        private readonly redisLockService: RedisLockService,
        private readonly schedulerRegistry: SchedulerRegistry,
        private readonly scheduleJobService: ScheduleJobService,
        @InjectMapper() mapper: Mapper,
        @InjectRepository(ScheduleEntity) scheduleRepository: Repository<ScheduleEntity>,
    ) {
        super(scheduleRepository, mapper, ScheduleDto, ScheduleService.name);
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
        const { cronExpression, type } = request;

        const isValidCronExpression = this.isValidCronExpression(cronExpression);
        if (!isValidCronExpression) {
            this.loggerService.error(`Invalid cron expression: ${cronExpression}`);
            throw new AppException(ScheduleError.InvalidCronExpression);
        }

        const isDuplicate = await this.checkDuplicateSchedule(type, cronExpression);
        if (isDuplicate) {
            this.loggerService.error(`Duplicate schedule with type ${type} and cron expression ${cronExpression}`);
            throw new AppException(ScheduleError.DuplicateSchedule);
        }

        const entity = this.mapper.map(request, CreateScheduleRequestDto, ScheduleEntity);

        const interval = cronParser.parseExpression(entity.cronExpression, { tz: 'UTC' });
        const nextRun = interval.next().toDate();
        entity.nextRunAt = nextRun;

        return await super.create(entity, user);
    }

    async update(id: string, request: UpdateScheduleRequestDto, user: PayloadDto): Promise<boolean> {
        const existingSchedule = await this.findById(id);
        if (!existingSchedule) {
            this.loggerService.error(`Schedule with ID ${id} not found`);
            throw new AppException(ScheduleError.ScheduleNotFound(id));
        }

        const { cronExpression, type } = request;

        if (cronExpression) {
            const isValidCronExpression = this.isValidCronExpression(cronExpression);
            if (!isValidCronExpression) {
                this.loggerService.error(`Invalid cron expression: ${cronExpression}`);
                throw new AppException(ScheduleError.InvalidCronExpression);
            }
        }

        if (type && cronExpression) {
            const isDuplicate = await this.checkDuplicateSchedule(type, cronExpression);
            if (isDuplicate) {
                this.loggerService.error(`Duplicate schedule with type ${type} and cron expression ${cronExpression}`);
                throw new AppException(ScheduleError.DuplicateSchedule);
            }
        }

        const entity = this.mapper.map(request, UpdateScheduleRequestDto, ScheduleEntity);

        if (cronExpression && cronExpression !== existingSchedule.cronExpression) {
            const interval = cronParser.parseExpression(entity.cronExpression, { tz: 'UTC' });
            const nextRun = interval.next().toDate();

            entity.nextRunAt = nextRun;
        }

        return await super.update(id, entity, user);
    }

    async switchStatus(id: string, enabled: boolean): Promise<boolean> {
        const schedule = await this.exists({ id });
        if (!schedule) throw new AppException(ScheduleError.ScheduleNotFound(id));

        try {
            return await super.update(id, { enabled });
        } catch (error) {
            this.loggerService.error(`Error switching status for schedule ${id}: ${error.message}`);
            throw new AppException(ScheduleError.StatusSwitchFailed);
        }
    }

    async manualTrigger(id: string): Promise<boolean> {
        const schedule = await this.findById(id);
        if (!schedule) {
            this.loggerService.error(`Schedule with ID ${id} not found`);
            throw new AppException(ScheduleError.ScheduleNotFound(id));
        }

        try {
            await this.handleCronTrigger(id, ScheduleJobTriggerType.MANUAL);
            return true;
        } catch (error) {
            this.loggerService.error(`Error triggering schedule ${id}: ${error.message}`);
            throw new AppException(ScheduleError.TriggerScheduleFailed);
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

    private async handleCronTrigger(scheduleId: string, triggerType?: ScheduleJobTriggerType): Promise<void> {
        const lock = await this.redisLockService.acquireLock(scheduleId);
        if (!lock) {
            this.loggerService.warn(`Failed to acquire lock for schedule ${scheduleId}. Skipping execution.`);
            return;
        }

        const schedule = this.lastLoadedSchedules.get(scheduleId);
        if (!schedule) {
            this.loggerService.error(`Schedule not found: ${scheduleId}`);
            return;
        }

        const request: CreateScheduleJobRequestDto = {
            scheduleId,
            jobPayload: schedule.payload,
            executionService: schedule.executionService,
            triggerType: triggerType || ScheduleJobTriggerType.CRON,
        };

        try {
            this.loggerService.log(`Created schedule job for schedule: ${scheduleId}`);
            await this.scheduleJobService.create(request);
            this.loggerService.log(`Schedule job created successfully for schedule: ${scheduleId}`);
        } catch (error) {
            this.loggerService.error(`Error creating schedule job: ${error.message}`);
        } finally {
            await super.update(scheduleId, { lastRunAt: new Date() });
            await this.redisLockService.releaseLock(lock);
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
            this.loggerService.warn(`Error removing cron job ${cronJobName}: ${error.message}`);
        }
    }

    private async createCronJob(schedule: ScheduleDto): Promise<void> {
        if (!schedule.enabled) return;

        try {
            const job = new CronJob(schedule.cronExpression, () => this.handleCronTrigger(schedule.id), null, true, SCHEDULE_TIMEZONE);
            const cronJobName = this.getJobName(schedule.id);

            this.schedulerRegistry.addCronJob(cronJobName, job);
        } catch (error) {
            this.loggerService.error(`Error creating cron job for schedule ${schedule.id}: ${error.message}`);
        }
    }

    private async handleScheduleChanged(schedule: ScheduleDto): Promise<void> {
        await this.removeCronJob(schedule.id);
        await this.createCronJob(schedule);

        this.loggerService.log(`Updated cron job for schedule: ${schedule.id}`);
    }

    private async handleScheduleRemoved(id: string): Promise<void> {
        await this.removeCronJob(id);

        this.loggerService.log(`Removed cron job for schedule: ${id}`);
    }

    private async loadSchedules(): Promise<void> {
        const schedules = await this.findListByFilter({ enabled: true });
        if (!schedules?.length) {
            this.loggerService.log('No schedules found or all schedules are disabled.');
            return;
        }

        try {
            const currentSchedules = new Map<string, ScheduleDto>();
            schedules.forEach((schedule) => currentSchedules.set(schedule.id, schedule));

            // Check for new or changed schedules
            const changePromises: Promise<void>[] = [];
            currentSchedules.forEach((schedule) => {
                const { id, cronExpression, enabled } = schedule;

                const existing = this.lastLoadedSchedules.get(id);
                if (!existing || existing.cronExpression !== cronExpression || existing.enabled !== enabled) {
                    changePromises.push(this.handleScheduleChanged(schedule));
                }
            });
            await Promise.all(changePromises);

            // Check for deleted schedules
            const removePromises: Promise<void>[] = [];
            this.lastLoadedSchedules.forEach((schedule) => {
                if (!currentSchedules.has(schedule.id)) {
                    removePromises.push(this.handleScheduleRemoved(schedule.id));
                }
            });
            await Promise.all(removePromises);

            this.lastLoadedSchedules = currentSchedules;
        } catch (error) {
            this.loggerService.error(`Error loading schedules: ${error.message}`);
        }
    }
}
