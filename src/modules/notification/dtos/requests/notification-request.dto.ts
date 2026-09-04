import { AutoMap } from '@automapper/classes';

import { EnumField, ObjectFieldOptional, StringField, StringFieldOptional, UUIDFieldOptional } from '../../../../decorators';
import { NotificationType } from '../../enum/notification.enum';

export class CreateNotificationRequest {
    @StringField({ maxLength: 255 })
    @AutoMap()
    title: string;

    @EnumField(() => NotificationType)
    @AutoMap()
    type: NotificationType;

    @StringFieldOptional({ maxLength: 1000 })
    @AutoMap()
    description?: string;

    @UUIDFieldOptional()
    @AutoMap()
    userId?: string;

    @StringFieldOptional({ maxLength: 1000 })
    @AutoMap()
    path?: string;

    @ObjectFieldOptional()
    @AutoMap()
    data?: Record<string, any>;
}
