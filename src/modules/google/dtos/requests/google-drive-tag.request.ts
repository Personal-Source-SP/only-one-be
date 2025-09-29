import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTagRequestDto {
    @ApiProperty({ description: 'Tag name' })
    @IsString()
    @IsNotEmpty()
    name: string;
}

export class AssignTagsToFileRequestDto {
    @ApiProperty({ description: 'File id (uuid)' })
    @IsString()
    @IsNotEmpty()
    fileId: string;

    @ApiProperty({ description: 'Array of tag names' })
    @IsArray()
    @IsString({ each: true })
    tags: string[];
}

export class RemoveTagFromFileRequestDto {
    @ApiProperty({ description: 'File id (uuid)' })
    @IsString()
    @IsNotEmpty()
    fileId: string;

    @ApiProperty({ description: 'Tag name' })
    @IsString()
    @IsNotEmpty()
    tag: string;
}
