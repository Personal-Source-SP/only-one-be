import { Provider } from '@nestjs/common';

import { NETWORK_DEVICE_APPROACH_SERVICE_MAP } from '../../constants';
import { NetworkDeviceApproachEnum } from '../../enums';
import { INetworkDeviceApproachService } from '../../interfaces';
import { NetworkDiscoveryApproachService } from './network-discovery-approach.service';
import { PortScanApproachService } from './port-scan-approach.service';
import { ProtocolAuthApproachService } from './protocol-auth-approach.service';

export const NetworkDeviceApproachProvider: Provider = {
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
};
