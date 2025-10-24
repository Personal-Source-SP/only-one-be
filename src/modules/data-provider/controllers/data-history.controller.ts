import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Version } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOkPaginatedResponse, ApiPaginationQuery, Paginate, Paginated, PaginatedSwaggerDocs } from 'nestjs-paginate';

import { BaseController } from '../../../common/base.controller';
import { DATA_HISTORY_PAGINATION_CONFIG } from '../constants/data-history.config';
import { DataHistoryDto } from '../dtos/data-history.dto';
import { DataHistoryPaginationRequestDto, ProcessScrapeDataRequestDto } from '../dtos/requests';
import { ProcessScrapeDataResponse } from '../dtos/responses';
import { DataHistoryService } from '../services/data-history.service';

@ApiTags('Data History')
@Controller('data-history')
export class DataHistoryController extends BaseController {
    constructor(private readonly dataHistoryService: DataHistoryService) {
        super();
    }

    @ApiOperation({ summary: 'Get data history by id' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get(':id')
    @ApiOkResponse({ type: DataHistoryDto })
    public async getDataHistoryById(@Param('id', new ParseUUIDPipe()) id: string): Promise<DataHistoryDto> {
        const result = await this.dataHistoryService.getById(id);
        return result;
    }

    @ApiOperation({ summary: 'Get paginated data histories' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get()
    @ApiOkPaginatedResponse(DataHistoryDto, DATA_HISTORY_PAGINATION_CONFIG)
    @PaginatedSwaggerDocs(DataHistoryDto, DATA_HISTORY_PAGINATION_CONFIG)
    @ApiPaginationQuery(DATA_HISTORY_PAGINATION_CONFIG)
    public async getDataHistoryPagination(@Paginate() query: DataHistoryPaginationRequestDto): Promise<Paginated<DataHistoryDto>> {
        const result = await this.dataHistoryService.getDataHistoryPagination(query, DATA_HISTORY_PAGINATION_CONFIG);
        return result;
    }

    @ApiOperation({ summary: 'Process scrape data' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('scrape-data')
    @ApiOkResponse({ type: ProcessScrapeDataResponse })
    public async processScrapeData(@Body() request: ProcessScrapeDataRequestDto): Promise<ProcessScrapeDataResponse> {
        const result = await this.dataHistoryService.processScrapeData(request);
        return result;
    }

    @ApiOperation({ summary: 'Delete data history' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Delete(':id')
    @ApiOkResponse({ type: Boolean })
    public async deleteDataHistory(@Param('id', new ParseUUIDPipe()) id: string): Promise<boolean> {
        const result = await this.dataHistoryService.deleteDataHistory(id);
        return result;
    }
}
