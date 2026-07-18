import { AutoMap } from '@automapper/classes';
import { ApiResponseProperty } from '@nestjs/swagger';

import { AbstractDto } from '../../../common/dto/abstract.dto';
import { NotificationType } from '../enum/notification.enum';

export class NotificationDto extends AbstractDto {
    @ApiResponseProperty()
    @AutoMap()
    title: string;

    @ApiResponseProperty()
    @AutoMap()
    type: NotificationType;

    @ApiResponseProperty()
    @AutoMap()
    isRead: boolean;

    @ApiResponseProperty()
    @AutoMap()
    description?: string;

    @ApiResponseProperty()
    @AutoMap()
    userId?: string;

    @ApiResponseProperty()
    @AutoMap()
    path?: string;

    @ApiResponseProperty()
    @AutoMap(() => Object)
    data?: Record<string, any>;
}
