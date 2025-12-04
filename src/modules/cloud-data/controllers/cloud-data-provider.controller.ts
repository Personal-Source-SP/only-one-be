import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { CloudDataProviderDto } from '../dtos/cloud-data-provider.dto';
import { CreateCloudDataProviderRequest, UpdateCloudDataProviderRequest } from '../dtos/requests';
import { CloudDataProviderEntity } from '../entities/cloud-data-provider.entity';
import { CloudDataProviderService } from '../services/cloud-data-provider.service';

@Controller('cloud-data-providers')
@ApiTags('Cloud Data Providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class CloudDataProviderController extends BaseController<CloudDataProviderEntity, CloudDataProviderDto> {
    constructor(private readonly cloudDataProviderService: CloudDataProviderService) {
        super(cloudDataProviderService);
    }

    @ApiOperation({ summary: 'Create cloud data provider' })
    @Version('1')
    @HttpCode(HttpStatus.OK)
    @Post()
    @BaseApiOkResponse(CloudDataProviderDto)
    async create(@Body() request: CreateCloudDataProviderRequest): Promise<CloudDataProviderDto> {
        const result = await this.cloudDataProviderService.create(request);
        return result;
    }

    @ApiOperation({ summary: 'Update cloud data provider' })
    @Version('1')
    @HttpCode(HttpStatus.OK)
    @Put(':id')
    @BaseApiOkResponse(Boolean)
    async update(@Param('id', new ParseUUIDPipe()) id: string, @Body() request: UpdateCloudDataProviderRequest): Promise<boolean> {
        const result = await this.cloudDataProviderService.update(id, request);
        return result;
    }
}
