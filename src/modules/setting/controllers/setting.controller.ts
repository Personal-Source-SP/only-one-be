import { Body, Controller, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { Auth, GetRestApi, PostRestApi, PutRestApi } from '../../../decorators';
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

    @GetRestApi({
        path: ':key',
        summary: 'Get setting by key',
        responseDto: SettingDto,
    })
    async getByKey(@Param('key') key: string): Promise<SettingDto> {
        const result = await this.settingService.getByKey(key);
        return result as unknown as SettingDto;
    }

    @PostRestApi({
        summary: 'Create setting',
        responseDto: SettingDto,
    })
    async create(@Body() request: CreateSettingRequestDto): Promise<SettingDto> {
        const result = await this.settingService.create(request);
        return result;
    }

    @PutRestApi({
        path: ':key',
        summary: 'Update setting by key',
        responseDto: Boolean,
    })
    async update(@Param('key') key: string, @Body() request: UpdateSettingRequestDto): Promise<boolean> {
        const result = await this.settingService.update(key, request);
        return result;
    }
}
