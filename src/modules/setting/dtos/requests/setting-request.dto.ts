import { AutoMap } from '@automapper/classes';

import { BooleanFieldOptional, EnumFieldOptional, ObjectFieldOptional, StringField } from '../../../../decorators';
import { SettingType } from '../../enums';

export class CreateSettingRequestDto {
    @StringField({ maxLength: 200 })
    @AutoMap()
    key: string;

    @ObjectFieldOptional()
    @AutoMap()
    value: Record<string, any>;

    @EnumFieldOptional(() => SettingType)
    @AutoMap()
    type?: SettingType;

    @BooleanFieldOptional()
    @AutoMap()
    isActive?: boolean;
}

export class UpdateSettingRequestDto {
    @ObjectFieldOptional()
    @AutoMap()
    value?: Record<string, any>;

    @EnumFieldOptional(() => SettingType)
    @AutoMap()
    type?: SettingType;

    @BooleanFieldOptional()
    @AutoMap()
    isActive?: boolean;
}
