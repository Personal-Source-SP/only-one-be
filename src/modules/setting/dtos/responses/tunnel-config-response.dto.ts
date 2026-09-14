import { AutoMap } from '@automapper/classes';
import { ApiResponseProperty } from '@nestjs/swagger';

import { TunnelModeEnum } from '../../enums';

export class TunnelConfigResponseDto {
    @ApiResponseProperty({ enum: TunnelModeEnum })
    @AutoMap()
    mode: TunnelModeEnum;

    @ApiResponseProperty()
    @AutoMap()
    token?: string;

    @ApiResponseProperty()
    @AutoMap()
    customUrl?: string;
}
