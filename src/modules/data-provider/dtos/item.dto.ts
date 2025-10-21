import { AutoMap } from '@automapper/classes';
import { ApiResponseProperty } from '@nestjs/swagger';
import { AbstractDto } from '../../../common/dto/abstract.dto';
import { ProductMappingStatus } from '../enums';
import { DataProviderItemDto } from './data-provider-item.dto';

export class ItemDto extends AbstractDto {
    @ApiResponseProperty()
    @AutoMap()
    name: string;

    @ApiResponseProperty()
    @AutoMap()
    mappingStatus: ProductMappingStatus;

    @ApiResponseProperty()
    @AutoMap()
    code?: string;

    @ApiResponseProperty()
    @AutoMap()
    tags?: string[];

    @ApiResponseProperty()
    @AutoMap(() => [DataProviderItemDto])
    dataProviderItems?: DataProviderItemDto[];
}
