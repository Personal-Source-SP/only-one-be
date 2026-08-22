import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { SearchItemsRequestDto } from '../dtos/requests/search-items-request.dto';
import { SearchItemsResponseDto } from '../dtos/responses/search-items-response.dto';
import { DataProviderSearchService } from '../services/data-provider-search.service';

@Controller('data-providers')
@ApiTags('Data Providers Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class DataProviderSearchController {
    constructor(private readonly dataProviderSearchService: DataProviderSearchService) {}

    @ApiOperation({ summary: 'Search items by data provider' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('search')
    @BaseApiOkResponse(SearchItemsResponseDto)
    public async searchItems(@Body() request: SearchItemsRequestDto): Promise<SearchItemsResponseDto> {
        const result = await this.dataProviderSearchService.searchItems(request);
        return result;
    }
}
