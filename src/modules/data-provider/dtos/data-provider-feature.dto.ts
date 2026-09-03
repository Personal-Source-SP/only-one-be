import { AutoMap } from '@automapper/classes';
import { ApiResponseProperty } from '@nestjs/swagger';

import { AbstractDto } from '../../../common/dto/abstract.dto';
import { DataProviderFeatureErrorType, DataProviderFeatureStatus, DataProviderFeatureType, ScraperServiceEnum } from '../enums';
import { ConfigVersionDto } from './config-version.dto';
import { DataProviderDto } from './data-provider.dto';

export class DataProviderFeatureDto extends AbstractDto {
    @ApiResponseProperty()
    @AutoMap()
    dataProviderId: string;

    @ApiResponseProperty({ enum: DataProviderFeatureType })
    @AutoMap()
    type: DataProviderFeatureType;

    @ApiResponseProperty({ enum: ScraperServiceEnum })
    @AutoMap()
    service: ScraperServiceEnum;

    @ApiResponseProperty({ enum: DataProviderFeatureStatus })
    @AutoMap()
    status: DataProviderFeatureStatus;

    @ApiResponseProperty({ type: Object })
    @AutoMap()
    config?: Record<string, any>;

    @ApiResponseProperty()
    @AutoMap()
    consecutiveFailures: number;

    @ApiResponseProperty()
    @AutoMap()
    lastErrorMessage?: string;

    @ApiResponseProperty({ enum: DataProviderFeatureErrorType })
    @AutoMap()
    lastErrorType?: DataProviderFeatureErrorType;

    @ApiResponseProperty()
    @AutoMap()
    lastFailedRunAt?: Date;

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
