import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';
import { CreateSettingRequestDto, UpdateSettingRequestDto } from '../dtos/requests/setting-request.dto';
import { SettingDto } from '../dtos/setting.dto';
import { SettingService } from '../services/setting.service';

@Controller('settings')
@ApiTags('settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SettingController extends BaseController {
    constructor(private readonly settingService: SettingService) {
        super();
    }

    @ApiOperation({ summary: 'List settings' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Get()
    @ApiOkResponse({ type: [SettingDto] })
    public async list(): Promise<SettingDto[]> {
        const result = await this.settingService.findAllSettings();
        return result;
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
    public async createSetting(@Body() request: CreateSettingRequestDto): Promise<SettingDto> {
        const result = await this.settingService.createSetting(request);
        return result;
    }

    @ApiOperation({ summary: 'Update setting by key' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Put(':key')
    @ApiOkResponse({ type: Boolean })
    public async updateSetting(@Param('key') key: string, @Body() request: UpdateSettingRequestDto): Promise<boolean> {
        const result = await this.settingService.updateSetting(key, request);
        return result;
    }

    @ApiOperation({ summary: 'Delete setting by key' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Delete(':key')
    @ApiOkResponse({ type: Boolean })
    public async deleteByKey(@Param('key') key: string): Promise<boolean> {
        const result = await this.settingService.deleteByKey(key);
        return result;
    }
}
