import { Controller, Get, HttpCode, HttpStatus, Param, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { StoreItemDto } from '../dtos/store-item.dto';
import { StoreItemEntity } from '../entities/store-item.entity';
import { StoreItemService } from '../services/store-item.service';

@Controller('store-items')
@ApiTags('store-items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class StoreItemController extends BaseController<StoreItemEntity, StoreItemDto> {
    constructor(private readonly storeItemService: StoreItemService) {
        super(storeItemService);
    }

    @ApiOperation({ summary: 'View stored file via proxy' })
    @Version('1')
    @HttpCode(HttpStatus.OK)
    @Get(':id')
    @BaseApiOkResponse(String)
    async viewFile(@Param('id') id: string): Promise<string> {
        const fileResponse = await this.storeItemService.getFileUrl(id);
        return fileResponse;
    }
}
