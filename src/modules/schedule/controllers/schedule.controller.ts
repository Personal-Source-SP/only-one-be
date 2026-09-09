import { Body, Controller, Param, ParseBoolPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { PayloadDto } from '../../../common/dto/payload.dto';
import { Post, Put, User, UUIDParam } from '../../../decorators';
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

    @Post({
        path: ':id/manual-trigger',
        summary: 'Manual trigger schedule',
        responseDto: Boolean,
    })
    async manualTrigger(@UUIDParam('id') id: string): Promise<boolean> {
        const result = await this.scheduleService.manualTrigger(id);
        return result;
    }

    @Post({
        summary: 'Create schedule',
        responseDto: ScheduleDto,
    })
    async create(@Body() request: CreateScheduleRequestDto, @User() user: PayloadDto): Promise<ScheduleDto> {
        const result = await this.scheduleService.create(request, user);
        return result;
    }

    @Put({
        path: ':id/switch-status/:status',
        summary: 'Switch schedule status',
        responseDto: Boolean,
    })
    async switchStatus(@UUIDParam('id') id: string, @Param('status', new ParseBoolPipe()) status: boolean): Promise<boolean> {
        const result = await this.scheduleService.switchStatus(id, status);
        return result;
    }

    @Put({
        path: ':id',
        summary: 'Update schedule',
        responseDto: Boolean,
    })
    async update(@UUIDParam('id') id: string, @Body() request: UpdateScheduleRequestDto, @User() user: PayloadDto): Promise<boolean> {
        const result = await this.scheduleService.update(id, request, user);
        return result;
    }
}
