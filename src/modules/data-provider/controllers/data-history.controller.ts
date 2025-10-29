import { Body, Controller, HttpCode, HttpStatus, Post, Version } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { DATA_HISTORY_PAGINATION_CONFIG } from '../constants/data-history.config';
import { DataHistoryDto } from '../dtos/data-history.dto';
import { ProcessScrapeDataRequestDto } from '../dtos/requests';
import { ProcessScrapeDataResponse } from '../dtos/responses';
import { DataHistoryEntity } from '../entities/data-history.entity';
import { DataHistoryService } from '../services/data-history.service';

@ApiTags('Data History')
@Controller('data-history')
export class DataHistoryController extends BaseController<DataHistoryEntity, DataHistoryDto> {
    constructor(private readonly dataHistoryService: DataHistoryService) {
        super(dataHistoryService, DATA_HISTORY_PAGINATION_CONFIG);
    }

    @ApiOperation({ summary: 'Process scrape data' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('process-scrape-data')
    @BaseApiOkResponse(ProcessScrapeDataResponse)
    public async processScrapeData(@Body() request: ProcessScrapeDataRequestDto): Promise<ProcessScrapeDataResponse> {
        const result = await this.dataHistoryService.processScrapeData(request);
        return result;
    }
}
