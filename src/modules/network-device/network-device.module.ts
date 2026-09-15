import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DeviceAggregatorController } from './controllers/device-aggregator.controller';
import { NetworkDeviceController } from './controllers/network-device.controller';
import { NetworkDeviceEntity } from './entities';
import { NetworkDeviceProfile } from './network-device.profile';
import { ArpScanService } from './services/arp-scan.service';
import { DeviceAggregatorService } from './services/device-aggregator.service';
import { NetworkDeviceService } from './services/network-device.service';
import { OnvifProbeService } from './services/onvif-probe.service';
import { OuiLookupService } from './services/oui-lookup.service';
import { TcpPortProbeService } from './services/tcp-port-probe.service';

@Module({
    imports: [TypeOrmModule.forFeature([NetworkDeviceEntity])],
    controllers: [NetworkDeviceController, DeviceAggregatorController],
    providers: [
        NetworkDeviceService,
        OuiLookupService,
        OnvifProbeService,
        ArpScanService,
        TcpPortProbeService,
        DeviceAggregatorService,
        NetworkDeviceProfile,
    ],
    exports: [NetworkDeviceService, DeviceAggregatorService],
})
export class NetworkDeviceModule {}
