import { AutoMap } from '@automapper/classes';
import { EnumField, StringFieldOptional } from '../../../decorators';
import { TunnelModeEnum } from './requests/tunnel-config-request.dto';

export class TunnelConfigDto {
    @EnumField(() => TunnelModeEnum)
    @AutoMap()
    mode: TunnelModeEnum;

    @StringFieldOptional()
    @AutoMap()
    token?: string;

    @StringFieldOptional()
    @AutoMap()
    customUrl?: string;
}
