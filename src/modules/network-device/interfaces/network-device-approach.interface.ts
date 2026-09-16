import { NetworkDeviceDto } from '../dtos';
import { NetworkDeviceApproachEnum } from '../enums/network-device-approach.enum';

export interface IDeviceCredential {
    username: string;
    password?: string;
}

export interface INetworkDeviceTarget {
    ip?: string;
    mac?: string;
    subnet?: string;
    ports?: number[];
    credentials?: IDeviceCredential[];
}

export interface ICameraDeviceInfo {
    model?: string;
    hardwareId?: string;
    manufacturer?: string;
    serialNumber?: string;
    firmwareVersion?: string;
}

export interface ICameraVerificationData {
    snapshotUri?: string;
    rtspStreamUri?: string;
    snapshotBase64?: string;
    liveViewSupported?: boolean;
    deviceInfo?: ICameraDeviceInfo;
}

export interface INetworkDeviceApproachResult<TData = any> {
    isSuccess: boolean;
    responseTimeMs: number;
    target: INetworkDeviceTarget;
    approach: NetworkDeviceApproachEnum;
    data?: TData;
    errorMessage?: string;
    matchedCredential?: IDeviceCredential;
}

export interface INetworkScanOptions {
    ip?: string;
    subnet?: string;
    ports?: number[];
    timeoutMs?: number;
}

export interface INetworkDeviceApproachService {
    scan(options?: INetworkScanOptions): Promise<NetworkDeviceDto[]>;

    verifyCameraCredentials?(
        target: INetworkDeviceTarget,
        credentials?: IDeviceCredential[],
    ): Promise<INetworkDeviceApproachResult<ICameraVerificationData>>;

    fetchSnapshot?(target: INetworkDeviceTarget, credential?: IDeviceCredential): Promise<string | null>;
    fetchStreamUri?(target: INetworkDeviceTarget, credential?: IDeviceCredential): Promise<string | null>;
    fetchDeviceInfo?(target: INetworkDeviceTarget, credential?: IDeviceCredential): Promise<ICameraDeviceInfo | null>;
}
