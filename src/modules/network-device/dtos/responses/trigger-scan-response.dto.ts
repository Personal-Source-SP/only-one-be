import { EnumField, StringField } from '../../../../decorators';
import { NetworkScanStatus } from '../../enums/network-scan-status.enum';

export class TriggerScanResponseDto {
    @StringField()
    message: string;

    @EnumField(() => NetworkScanStatus)
    status: NetworkScanStatus;

    @StringField()
    startedAt: string;
}
