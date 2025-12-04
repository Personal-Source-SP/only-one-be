import { AutoMap } from '@automapper/classes';

import { ApiResponseProperty } from '@nestjs/swagger';
import { AbstractDto } from '../../../common/dto';
import { CloudDataProviderType } from '../enums';
import { CloudDataItemDto } from './cloud-data-item.dto';

export class CloudDataProviderDto extends AbstractDto {
    @ApiResponseProperty()
    @AutoMap()
    name: string;

    @ApiResponseProperty()
    @AutoMap()
    type: CloudDataProviderType;

    @ApiResponseProperty()
    @AutoMap()
    isActive: boolean;

    @ApiResponseProperty()
    @AutoMap()
    totalItems: number;

    @ApiResponseProperty()
    @AutoMap()
    totalSize: number;

    @ApiResponseProperty()
    @AutoMap(() => Object)
    config?: Record<string, any>;

    @ApiResponseProperty()
    @AutoMap(() => [CloudDataItemDto])
    cloudDataItems?: CloudDataItemDto[];
}
