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
    manufacturer?: string;
    model?: string;
    firmwareVersion?: string;
    serialNumber?: string;
    hardwareId?: string;
}

export interface ICameraVerificationData {
    deviceInfo?: ICameraDeviceInfo;
    snapshotUri?: string;
    snapshotBase64?: string;
    rtspStreamUri?: string;
    liveViewSupported?: boolean;
}

export interface INetworkDeviceApproachResult<TData = any> {
    isSuccess: boolean;
    approach: NetworkDeviceApproachEnum;
    target: INetworkDeviceTarget;
    matchedCredential?: IDeviceCredential;
    data?: TData;
    responseTimeMs: number;
    errorMessage?: string;
}

export interface INetworkDeviceApproachService<TOptions = any, TResult = any> {
    execute(
        target: INetworkDeviceTarget,
        options?: TOptions,
    ): Promise<INetworkDeviceApproachResult<TResult>>;

    verifyCameraCredentials?(
        target: INetworkDeviceTarget,
        credentials?: IDeviceCredential[],
    ): Promise<INetworkDeviceApproachResult<ICameraVerificationData>>;

    fetchSnapshot?(
        target: INetworkDeviceTarget,
        credential?: IDeviceCredential,
    ): Promise<string | null>;

    fetchStreamUri?(
        target: INetworkDeviceTarget,
        credential?: IDeviceCredential,
    ): Promise<string | null>;

    fetchDeviceInfo?(
        target: INetworkDeviceTarget,
        credential?: IDeviceCredential,
    ): Promise<ICameraDeviceInfo | null>;
}
