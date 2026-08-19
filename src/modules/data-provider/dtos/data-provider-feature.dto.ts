import { AutoMap } from '@automapper/classes';
import { ApiResponseProperty } from '@nestjs/swagger';

import { AbstractDto } from '../../../common/dto/abstract.dto';
import { DataProviderFeatureStatus, DataProviderFeatureType } from '../enums';
import { ConfigVersionDto } from './config-version.dto';
import { DataProviderDto } from './data-provider.dto';

export class DataProviderFeatureDto extends AbstractDto {
    @ApiResponseProperty()
    @AutoMap()
    dataProviderId: string;

    @ApiResponseProperty({ enum: DataProviderFeatureType })
    @AutoMap()
    type: DataProviderFeatureType;

    @ApiResponseProperty()
    @AutoMap()
    service: string;

    @ApiResponseProperty({ enum: DataProviderFeatureStatus })
    @AutoMap()
    status: DataProviderFeatureStatus;

    @ApiResponseProperty({ type: Object })
    @AutoMap()
    config?: Record<string, any>;

    @ApiResponseProperty()
    @AutoMap()
    lastSuccessfulRunAt?: Date;

    @ApiResponseProperty({ type: () => DataProviderDto })
    @AutoMap(() => DataProviderDto)
    dataProvider?: DataProviderDto;

    @ApiResponseProperty({ type: () => [ConfigVersionDto] })
    @AutoMap(() => [ConfigVersionDto])
    versions?: ConfigVersionDto[];
}
