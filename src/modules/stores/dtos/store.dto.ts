import { AutoMap } from '@automapper/classes';

import { ApiResponseProperty } from '@nestjs/swagger';
import { AbstractDto } from '../../../common/dto';
import { StoreType } from '../enums';
import { StoreItemDto } from './store-item.dto';

export class StoreDto extends AbstractDto {
    @ApiResponseProperty()
    @AutoMap()
    name: string;

    @ApiResponseProperty()
    @AutoMap()
    type: StoreType;

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
    @AutoMap(() => [StoreItemDto])
    storeItems?: StoreItemDto[];
}
