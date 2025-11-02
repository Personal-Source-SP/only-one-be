import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class DeleteManyRequestDto {
    @ApiProperty()
    @IsArray()
    @IsString({ each: true })
    ids?: string[];
}
