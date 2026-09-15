import { PasswordFieldOptional, StringField } from '../../../../decorators';
import { IDeviceCredential } from '../../interfaces/network-device-approach.interface';

export class DeviceCredentialDto implements IDeviceCredential {
    @StringField({
        description: 'Tên đăng nhập (username)',
        example: 'admin',
    })
    username: string;

    @PasswordFieldOptional({
        description: 'Mật khẩu (password)',
        example: '123456',
    })
    password?: string;
}
