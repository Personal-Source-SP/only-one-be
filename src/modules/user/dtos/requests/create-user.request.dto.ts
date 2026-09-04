import { AutoMap } from '@automapper/classes';

import { EmailField, PasswordField, PhoneFieldOptional, StringField, StringFieldOptional } from '../../../../decorators';

export class CreateUserRequestDto {
    @EmailField()
    @AutoMap()
    email: string;

    @StringField({ maxLength: 100 })
    @AutoMap()
    userName: string;

    @PasswordField({ maxLength: 100 })
    @AutoMap()
    password: string;

    @StringFieldOptional({ maxLength: 100 })
    @AutoMap()
    firstName?: string;

    @StringFieldOptional({ maxLength: 100 })
    @AutoMap()
    lastName?: string;

    @PhoneFieldOptional()
    @AutoMap()
    phoneNumber?: string;
}
