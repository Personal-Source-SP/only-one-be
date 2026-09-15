import {
    BooleanField,
    ClassFieldOptional,
    EnumField,
    NumberField,
    StringFieldOptional,
} from '../../../../decorators';
import { NetworkDeviceApproachEnum } from '../../enums/network-device-approach.enum';
import {
    IDeviceCredential,
    INetworkDeviceApproachResult,
    INetworkDeviceTarget,
} from '../../interfaces/network-device-approach.interface';
import { DeviceCredentialDto } from '../requests/device-credential.dto';

export class ApproachResultResponseDto<TData = any> implements INetworkDeviceApproachResult<TData> {
    @BooleanField({
        description: 'Trạng thái thực thi thành công hay thất bại',
        example: true,
    })
    isSuccess: boolean;

    @EnumField(() => NetworkDeviceApproachEnum, {
        description: 'Hướng tiếp cận đã thực thi',
        example: NetworkDeviceApproachEnum.PROTOCOL_AUTH,
    })
    approach: NetworkDeviceApproachEnum;

    target: INetworkDeviceTarget;

    @ClassFieldOptional(() => DeviceCredentialDto, {
        description: 'Tài khoản & mật khẩu hợp lệ đã xác thực thành công (nếu có)',
    })
    matchedCredential?: IDeviceCredential;

    data?: TData;

    @NumberField({
        description: 'Thời gian phản hồi tính bằng ms',
        example: 120,
    })
    responseTimeMs: number;

    @StringFieldOptional({
        description: 'Thông báo lỗi chi tiết nếu thực thi thất bại',
    })
    errorMessage?: string;

    constructor(partial: Partial<ApproachResultResponseDto<TData>>) {
        Object.assign(this, partial);
    }
}
