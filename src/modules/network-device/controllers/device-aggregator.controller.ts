import { Body, Controller, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Auth, Get, Post } from '../../../decorators';
import { TriggerScanRequestDto } from '../dtos/requests';
import { ScanStatusResponseDto, TriggerScanResponseDto } from '../dtos/responses';
import { NetworkScanStatus } from '../enums/network-scan-status.enum';
import { DeviceAggregatorService } from '../services/device-aggregator.service';

@Controller('network-devices/scan')
@ApiTags('Network Devices')
@Auth()
export class DeviceAggregatorController {
    constructor(private readonly deviceAggregatorService: DeviceAggregatorService) {}

    @Post({
        summary: 'Trigger asynchronous network scan',
        responseDto: TriggerScanResponseDto,
    })
    @HttpCode(HttpStatus.ACCEPTED)
    async triggerScan(@Body() dto: TriggerScanRequestDto): Promise<TriggerScanResponseDto> {
        this.deviceAggregatorService.scanAndAggregate(dto.subnet, dto.probeTimeoutMs).catch(() => {});

        return {
            message: 'Tiến trình quét mạng đã được kích hoạt thành công.',
            status: NetworkScanStatus.SCANNING,
            startedAt: new Date().toISOString(),
        };
    }

    @Get({
        path: 'status',
        summary: 'Get current network scan status',
        responseDto: ScanStatusResponseDto,
    })
    async getScanStatus(): Promise<ScanStatusResponseDto> {
        return await this.deviceAggregatorService.getScanStatus();
    }
}
