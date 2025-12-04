import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { CloudDataItemDto } from '../dtos/cloud-data-item.dto';
import { CloudDataItemEntity } from '../entities/cloud-data-item.entity';
import { CloudDataItemService } from '../services/cloud-data-item.service';

@Controller('cloud-data-items')
@ApiTags('Cloud Data Items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class CloudDataItemController extends BaseController<CloudDataItemEntity, CloudDataItemDto> {
    constructor(private readonly cloudDataItemService: CloudDataItemService) {
        super(cloudDataItemService);
    }

    @ApiOperation({ summary: 'Download file by cloud data item id' })
    @Version('1')
    @HttpCode(HttpStatus.OK)
    @Get(':id/download')
    @BaseApiOkResponse(String)
    async downloadFile(@Param('id', new ParseUUIDPipe()) id: string): Promise<string> {
        const fileResponse = await this.cloudDataItemService.getFileUrl(id);
        return fileResponse;
    }
}
