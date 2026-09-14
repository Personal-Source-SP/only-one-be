import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { AppException } from '../../../exceptions/app.exception';
import { SettingError } from '../constants/setting-error';
import { CreateSettingRequestDto, UpdateSettingRequestDto } from '../dtos/requests/setting-request.dto';
import { SettingDto } from '../dtos/setting.dto';
import { SettingEntity } from '../entities/setting.entity';
import { SettingType } from '../enums';

@Injectable()
export class SettingService extends BaseService<SettingEntity, SettingDto> {
    constructor(@InjectMapper() mapper: Mapper, @InjectRepository(SettingEntity) settingRepository: Repository<SettingEntity>) {
        super(settingRepository, mapper, SettingDto, SettingService.name);
    }

    async create(request: CreateSettingRequestDto): Promise<SettingDto> {
        const exists = await this.exists({ key: request.key });
        if (exists) {
            this.loggerService.error(`Setting key already exists: ${request.key}`);
            throw new AppException(SettingError.KeyAlreadyExists);
        }

        const entity = this.mapper.map(request, CreateSettingRequestDto, SettingEntity);

        return await super.create(entity);
    }

    async update(key: string, request: UpdateSettingRequestDto): Promise<boolean> {
        const existing = await this.findOneByFilter({ key });
        if (!existing) {
            this.loggerService.error(`Setting not found: ${key}`);
            throw new AppException(SettingError.SettingNotFound);
        }

        return await super.update(existing.id, request);
    }

    async getByKey(key: string): Promise<SettingDto> {
        const setting = await this.findOneByFilter({ key });
        if (!setting) {
            this.loggerService.error(`Setting not found: ${key}`);
            throw new AppException(SettingError.SettingNotFound);
        }

        return setting;
    }

    async getUserSetting(userId: string, key: string): Promise<SettingDto | null> {
        const setting = await this.findOneByFilter({
            key,
            userId,
            type: SettingType.USER,
        });

        return setting ?? null;
    }

    async saveUserSetting(userId: string, key: string, value: Record<string, any>): Promise<SettingDto> {
        const existingEntity = await this.repository.findOne({
            where: {
                key,
                userId,
                type: SettingType.USER,
            },
        });

        if (existingEntity) {
            existingEntity.value = value;

            const updated = await this.repository.save(existingEntity);
            return this.mapper.map(updated, SettingEntity, SettingDto);
        }

        const newEntity = this.repository.create({
            key,
            value,
            userId,
            isActive: true,
            type: SettingType.USER,
        });

        const saved = await this.repository.save(newEntity);
        return this.mapper.map(saved, SettingEntity, SettingDto);
    }

    async deleteByKey(key: string): Promise<boolean> {
        const existing = await this.findOneByFilter({ key });
        if (!existing) {
            this.loggerService.error(`Setting not found: ${key}`);
            throw new AppException(SettingError.SettingNotFound);
        }

        return await super.delete(existing.id);
    }
}
