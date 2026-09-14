import { AutoMap } from '@automapper/classes';
import { EnumField, StringFieldOptional } from '../../../../decorators';

export enum TunnelModeEnum {
    QUICK = 'quick',
    NAMED = 'named',
}

export class SaveTunnelConfigRequestDto {
    @EnumField(() => TunnelModeEnum, { default: TunnelModeEnum.QUICK })
    @AutoMap()
    mode: TunnelModeEnum;

    @StringFieldOptional()
    @AutoMap()
    token?: string;

    @StringFieldOptional()
    @AutoMap()
    customUrl?: string;
}
