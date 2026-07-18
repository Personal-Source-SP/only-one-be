import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum } from 'class-validator';

import { ImportDataType } from '../../enums';

export class ImportDataRequestDto {
    @ApiProperty()
    @IsEnum(ImportDataType)
    dataType: ImportDataType;

    @ApiProperty()
    @IsArray()
    data: any[];
}
