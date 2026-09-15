import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BaseController } from '../../../common/base.controller';
import { Auth } from '../../../decorators';
import { NETWORK_DEVICE_PAGINATION_CONFIG } from '../constants/network-device-pagination.config';
import { NetworkDeviceDto } from '../dtos/network-device.dto';
import { NetworkDeviceEntity } from '../entities/network-device.entity';
import { NetworkDeviceService } from '../services/network-device.service';

@Controller('network-devices')
@ApiTags('Network Devices')
@Auth()
export class NetworkDeviceController extends BaseController<NetworkDeviceEntity, NetworkDeviceDto> {
    constructor(private readonly networkDeviceService: NetworkDeviceService) {
        super(networkDeviceService, NETWORK_DEVICE_PAGINATION_CONFIG);
    }
}
