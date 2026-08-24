import { AutoMap } from '@automapper/classes';
import { ApiResponseProperty } from '@nestjs/swagger';

import { AbstractDto } from '../../../common/dto/abstract.dto';
import { DraftItemStatus } from '../enums/draft-item-status.enum';
import { DataProviderFeatureDto } from './data-provider-feature.dto';
import { ItemDto } from './item.dto';

export class DraftItemDto extends AbstractDto {
    @ApiResponseProperty()
    @AutoMap()
    dataProviderFeatureId: string;

    @ApiResponseProperty()
    @AutoMap()
    title: string;

    @ApiResponseProperty()
    @AutoMap()
    url: string;

    @ApiResponseProperty()
    @AutoMap()
    code?: string;

    @ApiResponseProperty()
    @AutoMap()
    searchQuery?: string;

    @ApiResponseProperty()
    @AutoMap()
    confidence: number;

    @ApiResponseProperty({ enum: DraftItemStatus })
    @AutoMap()
    status: DraftItemStatus;

    @ApiResponseProperty()
    @AutoMap()
    suggestedItemId?: string;

    @ApiResponseProperty()
    @AutoMap()
    mappedItemId?: string;

    @ApiResponseProperty()
    @AutoMap()
    mappedDataProviderItemId?: string;

    @ApiResponseProperty()
    @AutoMap()
    metadata?: Record<string, any>;

    @ApiResponseProperty({ type: () => DataProviderFeatureDto })
    @AutoMap(() => DataProviderFeatureDto)
    dataProviderFeature?: DataProviderFeatureDto;

    @ApiResponseProperty({ type: () => ItemDto })
    @AutoMap(() => ItemDto)
    suggestedItem?: ItemDto;

    @ApiResponseProperty({ type: () => ItemDto })
    @AutoMap(() => ItemDto)
    mappedItem?: ItemDto;
}
