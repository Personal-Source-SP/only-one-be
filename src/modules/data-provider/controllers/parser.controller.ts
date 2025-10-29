import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { TestParserFunctionRequestDto } from '../dtos/requests';
import { IExtractDataResponse } from '../interfaces';
import { ParserService } from '../services/parser.service';

@Controller('parsers')
@ApiTags('parsers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ParserController {
    constructor(private readonly parserService: ParserService) {}

    @ApiOperation({ summary: 'Test parser function' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post('test-parser-function')
    @BaseApiOkResponse(Object)
    public async testParserFunction(@Body() request: TestParserFunctionRequestDto): Promise<IExtractDataResponse> {
        const result = await this.parserService.testParserFunction(request);
        return result;
    }
}
