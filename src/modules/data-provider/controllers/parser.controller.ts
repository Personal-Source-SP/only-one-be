import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { TestParserFunctionRequestDto } from '../dtos/requests';
import { IExtractDataResponse } from '../interfaces';
import { ParserService } from '../services/parser.service';

@Controller('parsers')
@ApiTags('parsers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ParserController extends BaseController {
    constructor(private readonly parserService: ParserService) {
        super();
    }

    @ApiOperation({ summary: 'Test parser function' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('test-parser-function')
    @ApiOkResponse({ type: Object })
    public async testParserFunction(@Body() request: TestParserFunctionRequestDto): Promise<IExtractDataResponse> {
        const result = await this.parserService.testParserFunction(request);
        return result;
    }
}
