import { Body, Controller, HttpCode, HttpStatus, Param, ParseBoolPipe, ParseUUIDPipe, Post, Put, Version } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { BaseApiOkResponse } from '../../../decorators/base-response.decorator';
import { User } from '../../../decorators/user.decorator';
import { SCHEDULE_PAGINATION_CONFIG } from '../constants/schedule.config';
import { CreateScheduleRequestDto, UpdateScheduleRequestDto } from '../dtos/requests';
import { ScheduleDto } from '../dtos/schedule.dto';
import { ScheduleEntity } from '../entities/schedule.entity';
import { ScheduleService } from '../services/schedule.service';

@ApiTags('Schedules')
@Controller('schedules')
export class ScheduleController extends BaseController<ScheduleEntity, ScheduleDto> {
    constructor(private readonly scheduleService: ScheduleService) {
        super(scheduleService, SCHEDULE_PAGINATION_CONFIG, { enableDeleteMany: true });
    }

    @ApiOperation({ summary: 'Create schedule' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Post()
    @BaseApiOkResponse(ScheduleDto)
    public async create(@Body() request: CreateScheduleRequestDto, @User() user: PayloadDto): Promise<ScheduleDto> {
        const result = await this.scheduleService.create(request, user);
        return result;
    }

    @ApiOperation({ summary: 'Switch schedule status' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Put(':id/switch-status/:status')
    @BaseApiOkResponse(Boolean)
    public async switchStatus(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Param('status', new ParseBoolPipe()) status: boolean,
    ): Promise<boolean> {
        const result = await this.scheduleService.switchStatus(id, status);
        return result;
    }

    @ApiOperation({ summary: 'Update schedule' })
    @HttpCode(HttpStatus.OK)
    @Version('1')
    @Put(':id')
    @BaseApiOkResponse(Boolean)
    public async update(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() request: UpdateScheduleRequestDto,
        @User() user: PayloadDto,
    ): Promise<boolean> {
        const result = await this.scheduleService.update(id, request, user);
        return result;
    }
}
