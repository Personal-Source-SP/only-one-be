import { AutoMap } from '@automapper/classes';

import { EmailFieldOptional, PhoneFieldOptional, StringFieldOptional } from '../../../../decorators';

export class UpdateUserRequestDto {
    @StringFieldOptional({ maxLength: 100 })
    @AutoMap()
    firstName?: string;

    @StringFieldOptional({ maxLength: 100 })
    @AutoMap()
    lastName?: string;

    @EmailFieldOptional()
    @AutoMap()
    email?: string;

    @PhoneFieldOptional()
    @AutoMap()
    phoneNumber?: string;
}
