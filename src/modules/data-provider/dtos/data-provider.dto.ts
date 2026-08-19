import { AutoMap } from '@automapper/classes';
import { ApiResponseProperty } from '@nestjs/swagger';

import { AbstractDto } from '../../../common/dto/abstract.dto';
import { DataProviderFeatureDto } from './data-provider-feature.dto';
import { DataProviderItemDto } from './data-provider-item.dto';

export class DataProviderDto extends AbstractDto {
    @ApiResponseProperty()
    @AutoMap()
    identifier: string;

    @ApiResponseProperty()
    @AutoMap()
    name: string;

    @ApiResponseProperty()
    @AutoMap()
    baseUrl: string;

    @ApiResponseProperty({ type: () => [DataProviderFeatureDto] })
    @AutoMap(() => [DataProviderFeatureDto])
    features?: DataProviderFeatureDto[];

    @ApiResponseProperty({ type: () => [DataProviderItemDto] })
    @AutoMap(() => [DataProviderItemDto])
    dataProviderItems?: DataProviderItemDto[];
}
