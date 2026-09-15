import { NetworkDeviceDto } from '../dtos';

export interface IProbeService {
    probe(subnet?: string): Promise<NetworkDeviceDto[]>;
}
