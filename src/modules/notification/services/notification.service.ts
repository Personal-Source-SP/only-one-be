import { Mapper } from '@automapper/core';
import { InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseService } from '../../../common/base.service';
import { SOCKET_EVENTS } from '../../websocket/constants/socket.constant';
import { NotificationDto } from '../dtos/notification.dto';
import { CreateNotificationRequest } from '../dtos/requests/notification-request.dto';
import { NotificationEntity } from '../entities/notification.entity';

@Injectable()
export class NotificationService extends BaseService<NotificationEntity, NotificationDto> {
    constructor(
        private readonly eventEmitter: EventEmitter2,
        @InjectMapper() mapper: Mapper,
        @InjectRepository(NotificationEntity) notificationRepository: Repository<NotificationEntity>,
    ) {
        super(notificationRepository, mapper, NotificationDto, NotificationService.name);
    }

    async create(request: CreateNotificationRequest): Promise<NotificationDto> {
        const entity = this.mapper.map(request, CreateNotificationRequest, NotificationEntity);
        const result = await super.create(entity);

        // Emit event to notify other services
        this.eventEmitter.emit(SOCKET_EVENTS.SEND_TO_ALL, result);

        return result;
    }
}
