import { PasswordField, StringField } from '../../../../decorators';

export class ChangePasswordRequestDto {
    @PasswordField()
    currentPassword: string;

    @PasswordField()
    newPassword: string;

    @StringField()
    userId: string;
}
