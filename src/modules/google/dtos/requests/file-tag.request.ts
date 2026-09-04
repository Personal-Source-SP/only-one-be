import { StringField, UUIDField } from '../../../../decorators';

export class CreateFileTagRequestDto {
    @StringField({ description: 'Tag name' })
    name: string;
}

export class UpdateFileTagRequestDto {
    @StringField({ description: 'Tag name' })
    name: string;
}

export class AssignTagsToFileByIdsRequestDto {
    @UUIDField({ description: 'Google drive file id (uuid)' })
    fileId: string;

    @UUIDField({ description: 'Tag ids (uuid) to assign', each: true })
    fileTagIds: string[];
}

export class RemoveTagsFromFileByIdsRequestDto extends AssignTagsToFileByIdsRequestDto {}

export class AssignFilesToTagByIdsRequestDto {
    @UUIDField({ description: 'Tag id (uuid)' })
    fileTagId: string;

    @UUIDField({ description: 'Google drive file ids to assign', each: true })
    fileIds: string[];
}

export class RemoveFilesFromTagByIdsRequestDto extends AssignFilesToTagByIdsRequestDto {}
