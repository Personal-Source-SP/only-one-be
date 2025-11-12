import { createMap, Mapper, MappingProfile } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { Injectable } from '@nestjs/common';
import { NotificationDto } from './dtos/notification.dto';
import { CreateNotificationRequest } from './dtos/requests/notification-request.dto';
import { NotificationEntity } from './entities/notification.entity';

@Injectable()
export class NotificationProfile extends AutomapperProfile {
    constructor(@InjectMapper() mapper: Mapper) {
        super(mapper);
    }

    override get profile(): MappingProfile {
        return (mapper) => {
            createMap(mapper, NotificationEntity, NotificationDto);
            createMap(mapper, CreateNotificationRequest, NotificationEntity);
        };
    }
}
