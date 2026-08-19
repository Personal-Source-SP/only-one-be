import { AutoMap } from '@automapper/classes';
import { ApiResponseProperty } from '@nestjs/swagger';

import { AbstractDto } from '../../../common/dto/abstract.dto';
import { UserDto } from '../../user/dtos/user.dto';
import { ConfigVersionType } from '../enums';
import { DataProviderFeatureDto } from './data-provider-feature.dto';

export class ConfigVersionDto extends AbstractDto {
    @ApiResponseProperty()
    @AutoMap()
    featureId: string;

    @ApiResponseProperty()
    @AutoMap()
    isActive: boolean;

    @ApiResponseProperty()
    @AutoMap()
    versionId: number;

    @ApiResponseProperty({ type: Object })
    @AutoMap()
    config: Record<string, any>;

    @ApiResponseProperty()
    @AutoMap()
    changeType: ConfigVersionType;

    @ApiResponseProperty()
    @AutoMap()
    changeDescription?: string;

    @ApiResponseProperty()
    @AutoMap()
    createdBy?: string;

    @ApiResponseProperty()
    @AutoMap(() => UserDto)
    user: UserDto;

    @ApiResponseProperty({ type: () => DataProviderFeatureDto })
    @AutoMap(() => DataProviderFeatureDto)
    feature?: DataProviderFeatureDto;
}
