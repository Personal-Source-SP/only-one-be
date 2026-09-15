import { NetworkDeviceDto } from '../dtos';
import { NetworkScanStatus } from '../enums';

export interface IScanStatusData {
    status: NetworkScanStatus;
    devicesDiscoveredCount: number;
    startedAt?: string | null;
    completedAt?: string | null;
}

export interface IDeviceDiscoveredEventPayload {
    networkDevice: NetworkDeviceDto;
}

export interface IScanStartedEventPayload {
    startedAt: string;
    status: NetworkScanStatus;
}

export interface IScanCompletedEventPayload {
    completedAt: string;
    totalDiscovered: number;
    status: NetworkScanStatus;
}
