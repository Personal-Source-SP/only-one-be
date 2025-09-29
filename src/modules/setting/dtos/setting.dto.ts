import { AutoMap } from '@automapper/classes';
import { ApiResponseProperty } from '@nestjs/swagger';
import { AbstractDto } from '../../../common/dto/abstract.dto';
import { SettingType } from '../enums';

export class SettingDto extends AbstractDto {
    @ApiResponseProperty()
    @AutoMap()
    key: string;

    @ApiResponseProperty()
    @AutoMap()
    value: Record<string, any>;

    @ApiResponseProperty()
    @AutoMap()
    isActive: boolean;

    @ApiResponseProperty()
    @AutoMap()
    type: SettingType;
}
