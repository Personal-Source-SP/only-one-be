import { NumberField } from '../../../../decorators';

export class NetworkDeviceStatsResponseDto {
    @NumberField()
    total: number;

    @NumberField()
    onlineCount: number;

    @NumberField()
    cameraCount: number;

    @NumberField()
    routerCount: number;

    @NumberField()
    iotCount: number;

    constructor(data?: Partial<NetworkDeviceStatsResponseDto>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}
