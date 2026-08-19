import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { SearchProductsRequestDto } from '../dtos/requests/search-products-request.dto';
import { SearchProductsResponseDto } from '../dtos/responses/search-products-response.dto';
import { DataProviderSearchService } from '../services/data-provider-search.service';

@Controller('data-providers')
@ApiTags('Data Providers Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class DataProviderSearchController {
    constructor(private readonly dataProviderSearchService: DataProviderSearchService) {}

    @ApiOperation({ summary: 'Search products by data provider' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('search')
    @BaseApiOkResponse(SearchProductsResponseDto)
    public async searchProducts(@Body() request: SearchProductsRequestDto): Promise<SearchProductsResponseDto> {
        const result = await this.dataProviderSearchService.searchProducts(request);
        return result;
    }
}
