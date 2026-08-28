import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Version } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { DRAFT_ITEM_PAGINATION_CONFIG } from '../constants/draft-item-pagination.config';
import { DraftItemDto } from '../dtos/draft-item.dto';
import { MapDraftItemRequestDto, ProcessSearchDataRequestDto } from '../dtos/requests';
import { ProcessSearchDataResponse } from '../dtos/responses';
import { DraftItemEntity } from '../entities/draft-item.entity';
import { DraftItemService } from '../services/draft-item.service';

@ApiTags('Draft Item')
@Controller('draft-items')
export class DraftItemController extends BaseController<DraftItemEntity, DraftItemDto> {
    constructor(private readonly draftItemService: DraftItemService) {
        super(draftItemService, DRAFT_ITEM_PAGINATION_CONFIG, { enableDeleteMany: true });
    }

    @ApiOperation({ summary: 'Process batch search across search-enabled data providers' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('process-search-data')
    @BaseApiOkResponse(ProcessSearchDataResponse)
    public async processSearchData(@Body() request: ProcessSearchDataRequestDto): Promise<ProcessSearchDataResponse> {
        return await this.draftItemService.processSearchData(request);
    }

    @ApiOperation({ summary: 'Map draft item to catalog (create new item or link existing)' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post(':id/map')
    @BaseApiOkResponse(DraftItemDto)
    public async mapDraftItem(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MapDraftItemRequestDto): Promise<DraftItemDto> {
        return await this.draftItemService.mapDraftItem(id, dto);
    }
}
