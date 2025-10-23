import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { TestParserFunctionRequestDto } from '../dtos/requests';
import { ParserService } from '../services/parser.service';

@Controller('parsers')
@ApiTags('parsers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ParserController extends BaseController {
    constructor(private readonly parserService: ParserService) {
        super();
    }

    @ApiOperation({ summary: 'Test function parser' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('test-scraper-function')
    @ApiOkResponse({ type: Object })
    public async testParserFunction(@Body() request: TestParserFunctionRequestDto): Promise<Record<string, any>> {
        const result = await this.parserService.handleTestParserFunctionRequest(request);
        return result;
    }
}
