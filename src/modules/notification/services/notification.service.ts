import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BaseService } from '../../../common/base.service';
import { NotificationDto } from '../dtos/notification.dto';
import { CreateNotificationRequest } from '../dtos/requests/notification-request.dto';
import { NotificationEntity } from '../entities/notification.entity';

@Injectable()
export class NotificationService extends BaseService<NotificationEntity, NotificationDto> {
    constructor(
        @InjectMapper() mapper: Mapper,
        @InjectRepository(NotificationEntity) notificationRepository: Repository<NotificationEntity>,
    ) {
        super(notificationRepository, mapper, NotificationDto, NotificationService.name);
    }

    async create(request: CreateNotificationRequest): Promise<NotificationDto> {
        const entity = this.mapper.map(request, CreateNotificationRequest, NotificationEntity);
        return await super.create(entity);
    }
}
