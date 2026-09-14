import { Body, Controller, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { Auth, Get, Post, Put } from '../../../decorators';
import { User } from '../../../decorators/user.decorator';
import { CLOUDFLARE_TUNNEL_SETTING_KEY } from '../constants/setting-key.constant';
import { CreateSettingRequestDto, UpdateSettingRequestDto } from '../dtos/requests/setting-request.dto';
import { SaveTunnelConfigRequestDto } from '../dtos/requests/tunnel-config-request.dto';
import { SettingDto } from '../dtos/setting.dto';
import { TunnelConfigResponseDto } from '../dtos/responses/tunnel-config-response.dto';
import { SettingEntity } from '../entities/setting.entity';
import { SettingService } from '../services/setting.service';

@Controller('settings')
@ApiTags('Settings')
@Auth()
export class SettingController extends BaseController<SettingEntity, SettingDto> {
    constructor(private readonly settingService: SettingService) {
        super(settingService);
    }

    @Get({
        path: 'tunnel/config',
        summary: 'Get user tunnel config',
        responseDto: TunnelConfigResponseDto,
    })
    async getTunnelConfig(@User() user: PayloadDto): Promise<TunnelConfigResponseDto | null> {
        const setting = await this.settingService.getUserSetting(user.id, CLOUDFLARE_TUNNEL_SETTING_KEY);
        return (setting?.value as TunnelConfigResponseDto) || null;
    }

    @Get({
        path: 'user/:key',
        summary: 'Get user setting by key',
        responseDto: SettingDto,
    })
    async getUserSetting(@Param('key') key: string, @User() user: PayloadDto): Promise<SettingDto | null> {
        const result = await this.settingService.getUserSetting(user.id, key);
        return result;
    }

    @Get({
        path: ':key',
        summary: 'Get setting by key',
        responseDto: SettingDto,
    })
    async getByKey(@Param('key') key: string): Promise<SettingDto> {
        const result = await this.settingService.getByKey(key);
        return result as unknown as SettingDto;
    }

    @Post({
        summary: 'Create setting',
        responseDto: SettingDto,
    })
    async create(@Body() request: CreateSettingRequestDto): Promise<SettingDto> {
        const result = await this.settingService.create(request);
        return result;
    }

    @Put({
        path: 'tunnel/config',
        summary: 'Save user tunnel config',
        responseDto: Boolean,
    })
    async saveTunnelConfig(@Body() request: SaveTunnelConfigRequestDto, @User() user: PayloadDto): Promise<boolean> {
        await this.settingService.saveUserSetting(user.id, CLOUDFLARE_TUNNEL_SETTING_KEY, request);
        return true;
    }

    @Put({
        path: 'user/:key',
        summary: 'Save/Update user setting by key',
        responseDto: SettingDto,
    })
    async saveUserSetting(
        @Param('key') key: string,
        @Body() request: UpdateSettingRequestDto,
        @User() user: PayloadDto,
    ): Promise<SettingDto> {
        const result = await this.settingService.saveUserSetting(user.id, key, request.value || {});
        return result;
    }

    @Put({
        path: ':key',
        summary: 'Update setting by key',
        responseDto: Boolean,
    })
    async update(@Param('key') key: string, @Body() request: UpdateSettingRequestDto): Promise<boolean> {
        const result = await this.settingService.update(key, request);
        return result;
    }
}
