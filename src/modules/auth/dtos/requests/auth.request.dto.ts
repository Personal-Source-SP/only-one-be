import { AutoMap } from '@automapper/classes';

import { EmailField, PasswordField, PhoneField, StringField } from '../../../../decorators';

export class SignUpRequestDto {
    @StringField({ maxLength: 100 })
    @AutoMap()
    firstName: string;

    @StringField({ maxLength: 100 })
    @AutoMap()
    lastName: string;

    @EmailField()
    @AutoMap()
    email: string;

    @PasswordField()
    @AutoMap()
    password: string;

    @PhoneField()
    @AutoMap()
    phoneNumber: string;
}

export class SignInRequestDto {
    @EmailField()
    email: string;

    @PasswordField()
    password: string;
}

export class RefreshTokenRequestDto {
    @StringField()
    refreshToken: string;
}
