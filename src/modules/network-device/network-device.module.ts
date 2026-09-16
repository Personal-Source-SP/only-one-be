import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DeviceAggregatorController } from './controllers/device-aggregator.controller';
import { NetworkDeviceController } from './controllers/network-device.controller';
import { NetworkDeviceEntity } from './entities';
import { ArpParserHelper, NetworkSubnetHelper, OnvifXmlParserHelper } from './helpers';
import { NetworkDeviceProfile } from './network-device.profile';
import { DeviceAggregatorService } from './services/device-aggregator.service';
import {
    NetworkDeviceApproachProvider,
    NetworkDiscoveryApproachService,
    PortScanApproachService,
    ProtocolAuthApproachService,
} from './services/network-device-approach';
import { NetworkDeviceService } from './services/network-device.service';
import { OuiLookupService } from './services/oui-lookup.service';

const providers = [NetworkDeviceApproachProvider];
const helpers = [ArpParserHelper, NetworkSubnetHelper, OnvifXmlParserHelper];
const approachServices = [NetworkDiscoveryApproachService, PortScanApproachService, ProtocolAuthApproachService];

@Module({
    imports: [TypeOrmModule.forFeature([NetworkDeviceEntity])],
    controllers: [NetworkDeviceController, DeviceAggregatorController],
    providers: [
        ...helpers,
        ...approachServices,
        ...providers,
        NetworkDeviceService,
        OuiLookupService,
        DeviceAggregatorService,
        NetworkDeviceProfile,
    ],
    exports: [...helpers, ...approachServices, ...providers, NetworkDeviceService, DeviceAggregatorService, NetworkDeviceProfile],
})
export class NetworkDeviceModule {}
