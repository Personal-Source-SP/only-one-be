import { ClassFieldOptional, EnumField, NumberFieldOptional, StringFieldOptional } from '../../../../decorators';
import { NetworkDeviceApproachEnum } from '../../enums/network-device-approach.enum';
import { INetworkDeviceTarget } from '../../interfaces/network-device-approach.interface';
import { DeviceCredentialDto } from './device-credential.dto';

export class ExecuteApproachRequestDto implements INetworkDeviceTarget {
    @EnumField(() => NetworkDeviceApproachEnum, {
        description: 'Hướng tiếp cận cần thực thi',
        example: NetworkDeviceApproachEnum.PROTOCOL_AUTH,
    })
    approach: NetworkDeviceApproachEnum;

    @StringFieldOptional({
        description: 'Địa chỉ IP mục tiêu (áp dụng cho PORT_SCAN, PROTOCOL_AUTH)',
        example: '192.168.1.100',
    })
    ip?: string;

    @StringFieldOptional({
        description: 'Địa chỉ MAC mục tiêu',
        example: '00:1A:2B:3C:4D:5E',
    })
    mac?: string;

    @StringFieldOptional({
        description: 'Dải mạng subnet (áp dụng cho NETWORK_DISCOVERY, PORT_SCAN)',
        example: '192.168.1',
    })
    subnet?: string;

    @NumberFieldOptional({
        description: 'Danh sách cổng TCP cần kiểm tra (áp dụng cho PORT_SCAN)',
        each: true,
        example: [80, 554, 8000, 8080],
    })
    ports?: number[];

    @ClassFieldOptional(() => DeviceCredentialDto, {
        description:
            'Danh sách credentials tùy chỉnh để xác thực (áp dụng cho PROTOCOL_AUTH). Nếu không truyền sẽ dùng default dictionary.',
        isArray: true,
    })
    credentials?: DeviceCredentialDto[];

    @NumberFieldOptional({
        description: 'Thời gian timeout (ms)',
        min: 500,
        max: 30000,
        example: 3000,
    })
    timeoutMs?: number;
}
