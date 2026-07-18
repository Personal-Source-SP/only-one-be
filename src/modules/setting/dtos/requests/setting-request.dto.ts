import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

import { SettingType } from '../../enums';

export class CreateSettingRequestDto {
    @ApiProperty({ maxLength: 200 })
    @IsString()
    @MaxLength(200)
    @AutoMap()
    key: string;

    @ApiProperty({ type: Object })
    @IsObject()
    @AutoMap()
    value: Record<string, any>;

    @ApiPropertyOptional({ enum: SettingType })
    @IsOptional()
    @IsEnum(SettingType)
    @AutoMap()
    type?: SettingType;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    @AutoMap()
    isActive?: boolean;
}

export class UpdateSettingRequestDto {
    @ApiPropertyOptional({ type: Object })
    @IsOptional()
    @IsObject()
    @AutoMap()
    value?: Record<string, any>;

    @ApiPropertyOptional({ enum: SettingType })
    @IsOptional()
    @AutoMap()
    type?: SettingType;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    @AutoMap()
    isActive?: boolean;
}
