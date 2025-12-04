import { AutoMap } from '@automapper/classes';

import { ApiResponseProperty } from '@nestjs/swagger';
import { AbstractDto } from '../../../common/dto';
import { StoreDto } from './store.dto';

export class StoreItemDto extends AbstractDto {
    @ApiResponseProperty()
    @AutoMap()
    storeId: string;

    @ApiResponseProperty()
    @AutoMap()
    isActive: boolean;

    @ApiResponseProperty()
    @AutoMap()
    pathId: string;

    @ApiResponseProperty()
    @AutoMap()
    pathUrl: string;

    @ApiResponseProperty()
    @AutoMap()
    fileName?: string;

    @ApiResponseProperty()
    @AutoMap()
    mimeType?: string;

    @ApiResponseProperty()
    @AutoMap()
    fileSize?: number;

    @ApiResponseProperty()
    @AutoMap()
    mappingId?: string;

    @ApiResponseProperty()
    @AutoMap(() => Object)
    metadata?: Record<string, any>;

    @ApiResponseProperty()
    @AutoMap(() => StoreDto)
    store?: StoreDto;
}
