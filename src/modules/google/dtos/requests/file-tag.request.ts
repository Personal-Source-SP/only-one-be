import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CreateFileTagRequestDto {
    @ApiProperty({ description: 'Tag name' })
    @IsString()
    @IsNotEmpty()
    name: string;
}

export class UpdateFileTagRequestDto {
    @ApiProperty({ description: 'Tag name' })
    @IsString()
    @IsNotEmpty()
    name: string;
}

export class AssignTagsToFileByIdsRequestDto {
    @ApiProperty({ description: 'Google drive file id (uuid)' })
    @IsString()
    @IsNotEmpty()
    fileId: string;

    @ApiProperty({ description: 'Tag ids (uuid) to assign' })
    @IsArray()
    @IsString({ each: true })
    fileTagIds: string[];
}

export class RemoveTagsFromFileByIdsRequestDto extends AssignTagsToFileByIdsRequestDto {}

export class AssignFilesToTagByIdsRequestDto {
    @ApiProperty({ description: 'Tag id (uuid)' })
    @IsString()
    @IsNotEmpty()
    fileTagId: string;

    @ApiProperty({ description: 'Google drive file ids to assign' })
    @IsArray()
    @IsString({ each: true })
    fileIds: string[];
}

export class RemoveFilesFromTagByIdsRequestDto extends AssignFilesToTagByIdsRequestDto {}
