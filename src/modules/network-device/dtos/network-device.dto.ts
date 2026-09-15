import { AutoMap } from '@automapper/classes';

import { AbstractDto } from '../../../common/dto/abstract.dto';
import { BooleanField, EnumField, NumberField, StringField, StringFieldOptional } from '../../../decorators';
import { NetworkDeviceType } from '../enums';
import { IOnvifMetadata } from '../interfaces';

export class NetworkDeviceDto extends AbstractDto {
    @StringField()
    @AutoMap()
    ipAddress: string;

    @StringFieldOptional({ nullable: true })
    @AutoMap()
    macAddress?: string | null;

    @EnumField(() => NetworkDeviceType)
    @AutoMap()
    deviceType: NetworkDeviceType;

    @StringFieldOptional({ nullable: true })
    @AutoMap()
    vendor?: string | null;

    @StringFieldOptional({ nullable: true })
    @AutoMap()
    model?: string | null;

    @StringFieldOptional({ nullable: true })
    @AutoMap()
    firmwareVersion?: string | null;

    @NumberField({ each: true })
    @AutoMap()
    openPorts: number[];

    @AutoMap()
    onvifMetadata?: IOnvifMetadata | null;

    @BooleanField()
    @AutoMap()
    isOnline: boolean;

    @AutoMap()
    lastSeenAt: Date;

    constructor(data?: Partial<NetworkDeviceDto>) {
        super();
        if (data) {
            Object.assign(this, data);
        }
    }
}
