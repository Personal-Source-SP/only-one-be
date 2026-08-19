import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateDataProviderRequestDto {
    @ApiProperty()
    @IsString()
    @MaxLength(255)
    @AutoMap()
    name: string;

    @ApiProperty()
    @IsString()
    @MaxLength(255)
    @Transform(({ value }) => value?.trim()?.replace(/[\\/]+$/, ''))
    @AutoMap()
    baseUrl: string;

    @ApiPropertyOptional({ description: 'Identifier must contain only letters, numbers, and dashes' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    @Matches(/^[a-z0-9-]+$/, { message: 'Identifier can only contain lowercase letters, numbers, and dashes' })
    @AutoMap()
    identifier?: string;
}

export class UpdateDataProviderRequestDto {
    @ApiPropertyOptional({ description: 'Data Provider name' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    @AutoMap()
    name?: string;

    @ApiPropertyOptional({ description: 'Identifier for the data provider' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    @Matches(/^[a-z0-9-]+$/, { message: 'Identifier can only contain lowercase letters, numbers, and dashes' })
    @AutoMap()
    identifier?: string;

    @ApiPropertyOptional({ description: 'Base URL of the Data Provider' })
    @IsOptional()
    @Transform(({ value }) => value?.trim()?.replace(/[\\/]+$/, ''))
    @MaxLength(255)
    @IsString()
    @AutoMap()
    baseUrl?: string;
}
