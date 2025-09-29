import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { BaseService } from '../../../common/base.service';
import { LoggerService } from '../../../shared/services/logger.service';
import { CreateSettingRequestDto, UpdateSettingRequestDto } from '../dtos/requests/setting-request.dto';
import { SettingDto } from '../dtos/setting.dto';
import { SettingEntity } from '../entities/setting.entity';

@Injectable()
export class SettingService extends BaseService<SettingEntity> {
    constructor(
        private readonly loggerService: LoggerService,

        @InjectMapper() private readonly mapper: Mapper,

        @InjectRepository(SettingEntity)
        private readonly settingRepository: Repository<SettingEntity>,
    ) {
        super(settingRepository);
    }

    async createSetting(request: CreateSettingRequestDto): Promise<SettingDto> {
        const exists = await this.exists({ key: request.key });
        if (exists) {
            this.loggerService.error(`Setting key already exists: ${request.key}`);
            throw new ConflictException('Setting key already exists');
        }

        try {
            const entity = this.mapper.map(request, CreateSettingRequestDto, SettingEntity);
            const created = await this.create(entity);

            return this.mapper.map(created, SettingEntity, SettingDto);
        } catch (error) {
            this.loggerService.error(`Error creating setting ${request.key}: ${error?.message}`);
            throw error;
        }
    }

    async updateSetting(key: string, request: UpdateSettingRequestDto): Promise<boolean> {
        const existing = await this.findOneByFilter({ key });
        if (!existing) {
            this.loggerService.error(`Setting not found: ${key}`);
            throw new NotFoundException('Setting not found');
        }

        try {
            return await this.update(existing.id, request);
        } catch (error) {
            this.loggerService.error(`Error updating setting ${key}: ${error?.message}`);
            throw error;
        }
    }

    async findAllSettings(): Promise<SettingDto[]> {
        const settings = await this.findAll();
        return this.mapper.mapArray(settings, SettingEntity, SettingDto);
    }

    async getByKey(key: string): Promise<SettingDto> {
        const setting = await this.findOneByFilter({ key });
        if (!setting) {
            this.loggerService.error(`Setting not found: ${key}`);
            throw new NotFoundException('Setting not found');
        }

        return this.mapper.map(setting, SettingEntity, SettingDto);
    }

    async deleteByKey(key: string): Promise<boolean> {
        const existing = await this.findOneByFilter({ key });
        if (!existing) {
            this.loggerService.error(`Setting not found: ${key}`);
            throw new NotFoundException('Setting not found');
        }

        return await this.delete(existing.id);
    }
}
