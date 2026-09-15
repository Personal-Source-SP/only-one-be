import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NETWORK_DEVICE_APPROACH_SERVICE_MAP } from './constants';
import { DeviceAggregatorController } from './controllers/device-aggregator.controller';
import { NetworkDeviceController } from './controllers/network-device.controller';
import { NetworkDeviceEntity } from './entities';
import { NetworkDeviceApproachEnum } from './enums';
import { ArpParserHelper, NetworkSubnetHelper, OnvifXmlParserHelper } from './helpers';
import { INetworkDeviceApproachService } from './interfaces';
import { NetworkDeviceProfile } from './network-device.profile';
import { DeviceAggregatorService } from './services/device-aggregator.service';
import {
    NetworkDiscoveryApproachService,
    PortScanApproachService,
    ProtocolAuthApproachService,
} from './services/network-device-approach';
import { NetworkDeviceService } from './services/network-device.service';
import { OuiLookupService } from './services/oui-lookup.service';

const helpers = [ArpParserHelper, NetworkSubnetHelper, OnvifXmlParserHelper];

@Module({
    imports: [TypeOrmModule.forFeature([NetworkDeviceEntity])],
    controllers: [NetworkDeviceController, DeviceAggregatorController],
    providers: [
        ...helpers,
        NetworkDeviceService,
        OuiLookupService,
        NetworkDiscoveryApproachService,
        PortScanApproachService,
        ProtocolAuthApproachService,
        {
            provide: NETWORK_DEVICE_APPROACH_SERVICE_MAP,
            useFactory: (
                networkDiscoveryService: NetworkDiscoveryApproachService,
                portScanService: PortScanApproachService,
                protocolAuthService: ProtocolAuthApproachService,
            ): Record<NetworkDeviceApproachEnum, INetworkDeviceApproachService> => ({
                [NetworkDeviceApproachEnum.NETWORK_DISCOVERY]: networkDiscoveryService,
                [NetworkDeviceApproachEnum.PORT_SCAN]: portScanService,
                [NetworkDeviceApproachEnum.PROTOCOL_AUTH]: protocolAuthService,
            }),
            inject: [NetworkDiscoveryApproachService, PortScanApproachService, ProtocolAuthApproachService],
        },
        DeviceAggregatorService,
        NetworkDeviceProfile,
    ],
    exports: [
        ...helpers,
        NetworkDeviceService,
        DeviceAggregatorService,
        NetworkDiscoveryApproachService,
        PortScanApproachService,
        ProtocolAuthApproachService,
        NETWORK_DEVICE_APPROACH_SERVICE_MAP,
    ],
})
export class NetworkDeviceModule {}

