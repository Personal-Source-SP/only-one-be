import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Version } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { Auth } from '../../../decorators';
import { CreateSettingRequestDto, UpdateSettingRequestDto } from '../dtos/requests/setting-request.dto';
import { SettingDto } from '../dtos/setting.dto';
import { SettingEntity } from '../entities/setting.entity';
import { SettingService } from '../services/setting.service';

@Controller('settings')
@ApiTags('Settings')
@Auth()
export class SettingController extends BaseController<SettingEntity, SettingDto> {
    constructor(private readonly settingService: SettingService) {
        super(settingService);
    }

    @ApiOperation({ summary: 'Get setting by key' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get(':key')
    @ApiOkResponse({ type: SettingDto })
    public async getByKey(@Param('key') key: string): Promise<SettingDto> {
        const result = await this.settingService.getByKey(key);
        return result as unknown as SettingDto;
    }

    @ApiOperation({ summary: 'Create setting' })
    @HttpCode(HttpStatus.CREATED)
    @Version('1')
    @Post()
    @ApiOkResponse({ type: SettingDto })
    public async create(@Body() request: CreateSettingRequestDto): Promise<SettingDto> {
        const result = await this.settingService.create(request);
        return result;
    }

    @ApiOperation({ summary: 'Update setting by key' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Put(':key')
    @ApiOkResponse({ type: Boolean })
    public async update(@Param('key') key: string, @Body() request: UpdateSettingRequestDto): Promise<boolean> {
        const result = await this.settingService.update(key, request);
        return result;
    }
}
