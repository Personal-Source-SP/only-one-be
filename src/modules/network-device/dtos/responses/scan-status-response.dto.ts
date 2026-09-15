import { EnumField, NumberFieldOptional, StringFieldOptional } from '../../../../decorators';
import { NetworkScanStatus } from '../../enums';
import { IScanStatusData } from '../../interfaces';

export class ScanStatusResponseDto implements IScanStatusData {
    @EnumField(() => NetworkScanStatus)
    status: NetworkScanStatus;

    @NumberFieldOptional()
    devicesDiscoveredCount: number;

    @StringFieldOptional({ nullable: true })
    startedAt?: string | null;

    @StringFieldOptional({ nullable: true })
    completedAt?: string | null;

    constructor(data?: Partial<ScanStatusResponseDto>) {
        if (data) {
            Object.assign(this, data);
        }
    }
}
