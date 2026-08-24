import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

import { DraftItemStatus, MapDraftItemAction } from '../../enums';

export class MapDraftItemRequestDto {
    @ApiProperty({ enum: MapDraftItemAction, description: 'Action: create new item or link to existing' })
    @IsEnum(MapDraftItemAction)
    @IsNotEmpty()
    action: MapDraftItemAction;

    @ApiPropertyOptional({ description: 'Target Item ID if LINK_EXISTING' })
    @IsUUID()
    @IsOptional()
    itemId?: string;

    @ApiPropertyOptional({ description: 'Custom item name if CREATE_NEW (defaults to draft title)' })
    @IsString()
    @IsOptional()
    itemName?: string;

    @ApiPropertyOptional({ description: 'Custom item code if CREATE_NEW (defaults to draft code)' })
    @IsString()
    @IsOptional()
    itemCode?: string;
}

export class FilterDraftItemPaginationDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    dataProviderFeatureId?: string;

    @ApiPropertyOptional({ enum: DraftItemStatus })
    @IsOptional()
    @IsEnum(DraftItemStatus)
    status?: DraftItemStatus;
}
