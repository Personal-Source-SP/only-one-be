import { HttpStatus } from '@nestjs/common';

import { IAppError } from '../../../constant/error-code';

export class NetworkDeviceError {
    static readonly DeviceNotFound: IAppError = {
        code: 'network_device_not_found',
        message: 'Không tìm thấy thông tin thiết bị mạng.',
        statusCode: HttpStatus.NOT_FOUND,
    };

    static readonly ScanAlreadyInProgress: IAppError = {
        code: 'network_device_scan_in_progress',
        message: 'Tiến trình quét mạng đang được thực thi, vui lòng đợi trong giây lát.',
        statusCode: HttpStatus.CONFLICT,
    };

    static readonly SubnetInvalid: IAppError = {
        code: 'network_device_subnet_invalid',
        message: 'Dải mạng (Subnet) không hợp lệ.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static readonly TargetIpRequired: IAppError = {
        code: 'network_device_target_ip_required',
        message: 'Target IP bắt buộc phải được cung cấp để xác thực thiết bị.',
        statusCode: HttpStatus.BAD_REQUEST,
    };

    static readonly CameraAuthFailed: IAppError = {
        code: 'network_device_camera_auth_failed',
        message: 'Không có tài khoản / mật khẩu nào xác thực thành công.',
        statusCode: HttpStatus.UNAUTHORIZED,
    };
}
