import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

import { EnumField } from '../../../../decorators';
import { ImportDataType } from '../../enums';

export class ImportDataRequestDto {
    @EnumField(() => ImportDataType)
    dataType: ImportDataType;

    @ApiProperty()
    @IsArray()
    data: any[];
}
