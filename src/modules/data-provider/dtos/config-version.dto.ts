import { AutoMap } from '@automapper/classes';
import { ApiResponseProperty } from '@nestjs/swagger';

import { AbstractDto } from '../../../common/dto/abstract.dto';
import { UserDto } from '../../user/dtos/user.dto';
import { ConfigVersionType } from '../enums';
import { ITargetConfig } from '../interfaces';
import { DataProviderDto } from './data-provider.dto';

export class ConfigVersionDto extends AbstractDto {
    @ApiResponseProperty()
    @AutoMap()
    dataProviderId: string;

    @ApiResponseProperty()
    @AutoMap()
    isActive: boolean;

    @ApiResponseProperty()
    @AutoMap()
    versionId: number;

    @ApiResponseProperty()
    @AutoMap()
    targetConfig: ITargetConfig;

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

    @ApiResponseProperty()
    @AutoMap(() => DataProviderDto)
    dataProvider: DataProviderDto;
}
