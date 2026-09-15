import { Body, Controller, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Auth, Get, Post } from '../../../decorators';
import { ExecuteApproachRequestDto, TriggerScanRequestDto } from '../dtos/requests';
import { ApproachResultResponseDto, ScanStatusResponseDto, TriggerScanResponseDto } from '../dtos/responses';
import { NetworkScanStatus } from '../enums/network-scan-status.enum';
import { DeviceAggregatorService } from '../services/device-aggregator.service';

@Controller('network-devices')
@ApiTags('Network Devices')
@Auth()
export class DeviceAggregatorController {
    constructor(private readonly deviceAggregatorService: DeviceAggregatorService) {}

    @Post({
        path: 'scan',
        summary: 'Trigger asynchronous network scan',
        responseDto: TriggerScanResponseDto,
    })
    @HttpCode(HttpStatus.ACCEPTED)
    async triggerScan(@Body() dto: TriggerScanRequestDto): Promise<TriggerScanResponseDto> {
        this.deviceAggregatorService.scanAndAggregate(dto).catch(() => {});

        return {
            status: NetworkScanStatus.SCANNING,
            startedAt: new Date().toISOString(),
            message: 'Tiến trình quét mạng đã được kích hoạt thành công.',
        };
    }

    @Get({
        path: 'scan/status',
        summary: 'Get current network scan status',
        responseDto: ScanStatusResponseDto,
    })
    async getScanStatus(): Promise<ScanStatusResponseDto> {
        return await this.deviceAggregatorService.getScanStatus();
    }

    @Post({
        path: 'approach/execute',
        summary: 'Execute a single network device approach',
        responseDto: ApproachResultResponseDto,
    })
    async executeApproach(@Body() dto: ExecuteApproachRequestDto): Promise<ApproachResultResponseDto> {
        const result = await this.deviceAggregatorService.executeApproach(dto);
        return new ApproachResultResponseDto(result);
    }
}

